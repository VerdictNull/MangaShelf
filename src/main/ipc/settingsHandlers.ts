import { ipcMain } from 'electron'
import type { HandlerDeps } from './index'

export function registerSettingsHandlers({ settingsRepo }: HandlerDeps): void {
  ipcMain.handle('settings:get', () => {
    return { ok: true, data: settingsRepo.getAll() }
  })

  ipcMain.handle('settings:update', (_e, key: string, value: unknown) => {
    settingsRepo.set(key as any, value as any)
    return { ok: true }
  })

  ipcMain.handle('settings:updateMany', (_e, updates: object) => {
    settingsRepo.setMany(updates as any)
    return { ok: true }
  })
}
