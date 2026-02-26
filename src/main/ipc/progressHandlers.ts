import { ipcMain } from 'electron'
import type { HandlerDeps } from './index'
import type { ProgressPayload } from '@shared/types'

export function registerProgressHandlers({ progressRepo, libraryRepo }: HandlerDeps): void {
  ipcMain.handle('progress:save', (_e, payload: ProgressPayload) => {
    progressRepo.save(
      payload.mangaId,
      payload.chapterId,
      payload.currentPage,
      payload.totalPages,
      payload.isCompleted
    )

    // If chapter is completed and manga is in library with 'plan_to_read', bump to 'reading'
    const libEntry = libraryRepo.findByMangaId(payload.mangaId)
    if (libEntry && libEntry.readStatus === 'plan_to_read') {
      libraryRepo.update(payload.mangaId, { readStatus: 'reading' })
    }

    return { ok: true }
  })

  ipcMain.handle('progress:get', (_e, mangaId: string) => {
    const progress = progressRepo.getForManga(mangaId)
    return { ok: true, data: progress }
  })

  ipcMain.handle('progress:getLastRead', (_e, mangaId: string) => {
    const last = progressRepo.getLastRead(mangaId)
    return { ok: true, data: last }
  })

  ipcMain.handle('progress:getContinueReading', () => {
    const entries = progressRepo.getContinueReading(20)
    return { ok: true, data: entries }
  })
}
