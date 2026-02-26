import { ipcMain } from 'electron'
import type { HandlerDeps } from './index'
import * as downloadService from '../services/downloadService'

export function registerDownloadHandlers({ chapterRepo }: HandlerDeps): void {
  ipcMain.handle('download:queue', (_e, chapterId: string, priority?: number) => {
    const chapter = chapterRepo.findById(chapterId)
    if (!chapter) return { ok: false, error: 'Chapter not found' }
    const item = downloadService.enqueue(chapterId, chapter.mangaId, priority ?? 0)
    return { ok: true, data: item }
  })

  ipcMain.handle('download:pause', (_e, queueId: number) => {
    downloadService.pauseDownload(queueId)
    return { ok: true }
  })

  ipcMain.handle('download:cancel', (_e, queueId: number) => {
    downloadService.cancelDownload(queueId)
    return { ok: true }
  })

  ipcMain.handle('download:retry', (_e, queueId: number) => {
    downloadService.retryDownload(queueId)
    return { ok: true }
  })

  ipcMain.handle('download:getQueue', () => {
    const queue = downloadService.getQueueState()
    return { ok: true, data: queue }
  })

  ipcMain.handle('download:delete', (_e, chapterId: string, mangaId: string) => {
    downloadService.deleteDownloadedChapter(chapterId, mangaId)
    return { ok: true }
  })
}
