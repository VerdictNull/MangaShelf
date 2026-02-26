import { ipcMain } from 'electron'
import type { HandlerDeps } from './index'

export function registerCollectionHandlers({ collectionRepo }: HandlerDeps): void {
  ipcMain.handle('collection:getAll', () => {
    return { ok: true, data: collectionRepo.getAll() }
  })

  ipcMain.handle('collection:create', (_e, name: string, description?: string) => {
    const col = collectionRepo.create(name, description)
    return { ok: true, data: col }
  })

  ipcMain.handle('collection:update', (_e, id: number, updates: object) => {
    collectionRepo.update(id, updates as any)
    return { ok: true }
  })

  ipcMain.handle('collection:delete', (_e, id: number) => {
    collectionRepo.delete(id)
    return { ok: true }
  })

  ipcMain.handle('collection:addManga', (_e, collectionId: number, mangaId: string) => {
    collectionRepo.addManga(collectionId, mangaId)
    return { ok: true }
  })

  ipcMain.handle('collection:removeManga', (_e, collectionId: number, mangaId: string) => {
    collectionRepo.removeManga(collectionId, mangaId)
    return { ok: true }
  })

  ipcMain.handle('collection:getMangaIds', (_e, collectionId: number) => {
    return { ok: true, data: collectionRepo.getMangaIds(collectionId) }
  })
}
