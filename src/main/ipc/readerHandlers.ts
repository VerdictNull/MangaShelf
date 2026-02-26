import { ipcMain, dialog } from 'electron'
import type { HandlerDeps } from './index'
import { importFiles } from '../services/importService'

export function registerReaderHandlers({ pageServerPort, mangaRepo, chapterRepo }: HandlerDeps): void {
  ipcMain.handle('reader:getPageServerPort', () => {
    return { ok: true, data: pageServerPort }
  })

  ipcMain.handle('import:openDialog', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Import Manga Files',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Manga Archives', extensions: ['cbz', 'cbr', 'zip', 'pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return { ok: true, data: result.canceled ? [] : result.filePaths }
  })

  ipcMain.handle('import:files', async (_e, filePaths: string[]) => {
    const results = await importFiles(filePaths, mangaRepo, chapterRepo)
    return { ok: true, data: results }
  })
}
