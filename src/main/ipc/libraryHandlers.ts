import { ipcMain, BrowserWindow } from 'electron'
import type { HandlerDeps } from './index'
import type { LibraryFilters, ReadStatus } from '@shared/types'

function broadcast(channel: string): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, null)
}

export function registerLibraryHandlers({ libraryRepo }: HandlerDeps): void {
  ipcMain.handle('library:get', (_e, filters: LibraryFilters) => {
    const manga = libraryRepo.getAll(filters)
    return { ok: true, data: manga }
  })

  ipcMain.handle('library:getCounts', () => {
    const counts = libraryRepo.countByStatus()
    return { ok: true, data: counts }
  })

  ipcMain.handle('library:add', (_e, mangaId: string, status: ReadStatus) => {
    const entry = libraryRepo.add(mangaId, status)
    broadcast('library:updated')
    return { ok: true, data: entry }
  })

  ipcMain.handle('library:update', (_e, mangaId: string, updates: object) => {
    libraryRepo.update(mangaId, updates as any)
    broadcast('library:updated')
    return { ok: true }
  })

  ipcMain.handle('library:remove', (_e, mangaId: string) => {
    libraryRepo.remove(mangaId)
    broadcast('library:updated')
    return { ok: true }
  })

  ipcMain.handle('library:isInLibrary', (_e, mangaId: string) => {
    const entry = libraryRepo.findByMangaId(mangaId)
    return { ok: true, data: entry }
  })
}
