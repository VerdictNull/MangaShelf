import { ipcMain } from 'electron'
import type { HandlerDeps } from './index'
import * as api from '../services/mangadexApi'
import { cacheCover } from '../services/imageCache'
import log from 'electron-log/main'

export function registerMangaHandlers({ mangaRepo, settingsRepo }: HandlerDeps): void {
  ipcMain.handle('manga:search', async (_e, params) => {
    try {
      const contentRatings = settingsRepo.get('contentRatings') ?? ['safe', 'suggestive']
      const result = await api.searchManga({ ...params, contentRating: contentRatings })

      // Upsert to local DB for future access
      for (const m of result.manga) {
        mangaRepo.upsert(m)
      }

      return { ok: true, data: result }
    } catch (err: any) {
      log.error('manga:search error', err)
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('manga:getById', (_e, id: string) => {
    const manga = mangaRepo.findWithLibraryById(id)
    return { ok: true, data: manga }
  })

  ipcMain.handle('manga:getDetail', async (_e, id: string) => {
    try {
      // Check freshness
      const cached = mangaRepo.findWithLibraryById(id)
      const staleThreshold = 24 * 60 * 60 * 1000 // 24h
      const isStale = !cached?.lastFetchedAt || Date.now() - cached.lastFetchedAt > staleThreshold

      if (cached && !isStale) {
        return { ok: true, data: cached }
      }

      const fresh = await api.getMangaDetail(id)
      if (fresh) {
        mangaRepo.upsert(fresh)
        // Cache cover in background
        if (fresh.coverFilename) {
          cacheCover(id, fresh.coverFilename).then((localPath) => {
            if (localPath) mangaRepo.updateCoverLocalPath(id, localPath)
          })
        }
      }

      return { ok: true, data: mangaRepo.findWithLibraryById(id) }
    } catch (err: any) {
      log.error('manga:getDetail error', err)
      const cached = mangaRepo.findWithLibraryById(id)
      if (cached) return { ok: true, data: cached }
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('manga:getTags', async () => {
    try {
      const tags = await api.getTags()
      return { ok: true, data: tags }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('manga:getRandom', async () => {
    try {
      const manga = await api.getRandomManga()
      if (manga) mangaRepo.upsert(manga)
      return { ok: true, data: manga }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('manga:searchLocal', (_e, query: string) => {
    const results = mangaRepo.searchLocal(query)
    return { ok: true, data: results }
  })

  ipcMain.handle('manga:getOrphanedDownloads', () => {
    const results = mangaRepo.getOrphanedDownloads()
    return { ok: true, data: results }
  })
}
