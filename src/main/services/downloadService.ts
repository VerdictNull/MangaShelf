import { BrowserWindow } from 'electron'
import PQueue from 'p-queue'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import log from 'electron-log/main'
import { getAtHomeServer, buildPageUrl, downloadImageBuffer } from './mangadexApi'
import { chapterDir } from '../appPaths'
import type { DownloadQueueItem } from '@shared/types'

type Repos = {
  downloadRepo: import('../db/repositories/downloadRepository').DownloadRepository
  chapterRepo: import('../db/repositories/chapterRepository').ChapterRepository
}

const MAX_RETRIES = 3

// Outer queue: 3 chapters at a time
const chapterQueue = new PQueue({ concurrency: 3 })
// Per-chapter: 4 pages at a time
const pageQueue = new PQueue({ concurrency: 4 })

const activeAbortControllers = new Map<number, AbortController>()

let repos: Repos | null = null

export function initDownloadService(r: Repos): void {
  repos = r
}

function getWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

function emit(channel: string, data: unknown): void {
  getWindow()?.webContents.send(channel, data)
}

export function resumeOnStart(): void {
  if (!repos) return
  const pending = repos.downloadRepo.getPendingForResume()
  for (const item of pending) {
    enqueueInternal(item)
  }
  log.info(`Resumed ${pending.length} pending downloads`)
}

export function enqueue(chapterId: string, mangaId: string, priority = 0): DownloadQueueItem {
  if (!repos) throw new Error('DownloadService not initialized')
  const item = repos.downloadRepo.enqueue(chapterId, mangaId, priority)
  if (item.status === 'pending') {
    enqueueInternal(item)
  }
  return item
}

function enqueueInternal(item: DownloadQueueItem): void {
  chapterQueue.add(() => downloadChapter(item))
}

async function downloadChapter(item: DownloadQueueItem): Promise<void> {
  if (!repos) return

  const controller = new AbortController()
  activeAbortControllers.set(item.id, controller)

  repos.downloadRepo.updateStatus(item.id, 'downloading', { startedAt: Date.now() })
  emit('download:progress', { ...item, status: 'downloading' })

  try {
    const atHome = await getAtHomeServer(item.chapterId)
    const dataSaver = true // default to data-saver for bandwidth savings
    const pageFiles = dataSaver ? atHome.chapter.dataSaver : atHome.chapter.data
    const totalPages = pageFiles.length

    repos.downloadRepo.updateStatus(item.id, 'downloading', { totalPages })

    const dir = chapterDir(item.mangaId, item.chapterId)
    mkdirSync(dir, { recursive: true })

    let progressPages = 0
    const pagePromises = pageFiles.map((filename, index) => {
      return pageQueue.add(async () => {
        if (controller.signal.aborted) return

        const url = buildPageUrl(atHome.baseUrl, atHome.chapter.hash, filename, dataSaver)
        const padded = String(index + 1).padStart(3, '0')
        const ext = filename.split('.').pop() ?? 'jpg'
        const localFilename = `${padded}.${ext}`
        const localPath = join(dir, localFilename)

        try {
          const buffer = await downloadImageBuffer(url)
          writeFileSync(localPath, buffer)
          progressPages++
          repos!.downloadRepo.updateStatus(item.id, 'downloading', { progressPages })
          emit('download:progress', {
            queueId: item.id,
            chapterId: item.chapterId,
            mangaId: item.mangaId,
            progressPages,
            totalPages,
            status: 'downloading'
          })
        } catch (err) {
          log.error(`Failed to download page ${index + 1} for chapter ${item.chapterId}:`, err)
          throw err
        }
      })
    })

    await Promise.all(pagePromises)

    if (controller.signal.aborted) {
      // Clean up partial download
      if (existsSync(dir)) rmSync(dir, { recursive: true })
      return
    }

    // Calculate folder size
    const fileSizeBytes = pageFiles.length * 150_000 // estimate; could do actual stat

    repos.chapterRepo.markDownloaded(item.chapterId, dir, fileSizeBytes)
    repos.downloadRepo.updateStatus(item.id, 'completed', { completedAt: Date.now(), progressPages: totalPages })

    emit('download:complete', {
      queueId: item.id,
      chapterId: item.chapterId,
      mangaId: item.mangaId,
      success: true
    })
    emit('library:updated', null)
  } catch (err: any) {
    if (controller.signal.aborted) return

    const errorMessage = err?.message ?? 'Unknown error'
    repos.downloadRepo.incrementRetry(item.id)
    const updated = repos.downloadRepo.findById(item.id)!

    if (updated.retryCount < MAX_RETRIES) {
      log.warn(`Download failed (attempt ${updated.retryCount}), retrying:`, item.chapterId)
      const delay = Math.pow(2, updated.retryCount) * 1000
      setTimeout(() => {
        repos!.downloadRepo.updateStatus(item.id, 'pending')
        enqueueInternal({ ...item, retryCount: updated.retryCount, status: 'pending' })
      }, delay)
    } else {
      log.error(`Download permanently failed after ${MAX_RETRIES} retries:`, item.chapterId)
      repos.downloadRepo.updateStatus(item.id, 'failed', { errorMessage })
      emit('download:complete', {
        queueId: item.id,
        chapterId: item.chapterId,
        mangaId: item.mangaId,
        success: false,
        errorMessage
      })
    }
  } finally {
    activeAbortControllers.delete(item.id)
  }
}

export function pauseDownload(queueId: number): void {
  activeAbortControllers.get(queueId)?.abort()
  repos?.downloadRepo.updateStatus(queueId, 'paused')
}

export function cancelDownload(queueId: number): void {
  const item = repos?.downloadRepo.findById(queueId)
  if (!item) return
  activeAbortControllers.get(queueId)?.abort()

  const dir = chapterDir(item.mangaId, item.chapterId)
  if (existsSync(dir)) rmSync(dir, { recursive: true })

  repos?.downloadRepo.remove(queueId)
  emit('library:updated', null)
}

export function retryDownload(queueId: number): void {
  const item = repos?.downloadRepo.findById(queueId)
  if (!item) return
  repos?.downloadRepo.updateStatus(queueId, 'pending', { errorMessage: undefined })
  enqueueInternal(item)
}

export function getQueueState(): DownloadQueueItem[] {
  return repos?.downloadRepo.getQueue() ?? []
}

export async function deleteDownloadedChapter(chapterId: string, mangaId: string): Promise<void> {
  const dir = chapterDir(mangaId, chapterId)
  if (existsSync(dir)) rmSync(dir, { recursive: true })
  repos?.chapterRepo.markNotDownloaded(chapterId)
  emit('library:updated', null)
}
