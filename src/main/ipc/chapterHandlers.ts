import { ipcMain } from 'electron'
import type { HandlerDeps } from './index'
import * as api from '../services/mangadexApi'
import { getLocalPageUrl } from '../services/localPageServer'
import { readdirSync, existsSync } from 'fs'
import log from 'electron-log/main'

export function registerChapterHandlers({ chapterRepo, settingsRepo }: HandlerDeps): void {
  ipcMain.handle('chapter:list', async (_e, mangaId: string, opts: { language?: string }) => {
    try {
      const language = opts?.language ?? settingsRepo.get('language') ?? 'en'
      const staleThreshold = 6 * 60 * 60 * 1000 // 6h

      const cached = chapterRepo.findByMangaId(mangaId, language as string)
      // Use the most recent createdAt (when we first cached a chapter) as a proxy for last fetch time
      const lastFetch = cached.length > 0 ? Math.max(...cached.map((c) => c.createdAt)) : 0
      const isStale = cached.length === 0 || Date.now() - lastFetch > staleThreshold

      if (!isStale) {
        return { ok: true, data: cached }
      }

      const chapters = await api.getAllChapters(mangaId, language as string)
      chapterRepo.upsertMany(chapters)

      return { ok: true, data: chapterRepo.findByMangaId(mangaId, language as string) }
    } catch (err: any) {
      log.error('chapter:list error', err)
      const cached = chapterRepo.findByMangaId(mangaId)
      return { ok: true, data: cached }
    }
  })

  ipcMain.handle('chapter:pages', async (_e, chapterId: string) => {
    try {
      const chapter = chapterRepo.findById(chapterId)
      if (!chapter) return { ok: false, error: 'Chapter not found' }

      if (chapter.isDownloaded && chapter.downloadPath) {
        // Serve from local file server
        const dir = chapter.downloadPath
        if (existsSync(dir)) {
          const files = readdirSync(dir)
            .filter((f) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f))
            .sort()
          const pages = files.map((f) =>
            getLocalPageUrl(chapter.mangaId, chapterId, f)
          )
          return { ok: true, data: { pages, source: 'local' } }
        }
      }

      // Fetch from MangaDex@Home
      const atHome = await api.getAtHomeServer(chapterId)
      const settingsQuality = 'data-saver' // could read from settings
      const dataSaver = settingsQuality === 'data-saver'
      const files = dataSaver ? atHome.chapter.dataSaver : atHome.chapter.data
      const pages = files.map((f) => api.buildPageUrl(atHome.baseUrl, atHome.chapter.hash, f, dataSaver))

      return { ok: true, data: { pages, source: 'online' } }
    } catch (err: any) {
      log.error('chapter:pages error', err)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('chapter:getById', (_e, id: string) => {
    return { ok: true, data: chapterRepo.findById(id) }
  })
}
