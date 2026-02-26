import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  ChapterQueryOpts,
  DownloadCompleteEvent,
  DownloadProgressEvent,
  LibraryFilters,
  ProgressPayload,
  ReadStatus,
  SearchParams
} from '@shared/types'

const mangaApi = {
  // ── Manga ──────────────────────────────────────────────────────────────────
  searchManga: (params: SearchParams) => ipcRenderer.invoke('manga:search', params),
  getMangaById: (id: string) => ipcRenderer.invoke('manga:getById', id),
  getMangaDetail: (id: string) => ipcRenderer.invoke('manga:getDetail', id),
  getTags: () => ipcRenderer.invoke('manga:getTags'),
  getRandomManga: () => ipcRenderer.invoke('manga:getRandom'),
  searchLocal: (query: string) => ipcRenderer.invoke('manga:searchLocal', query),
  getOrphanedDownloads: () => ipcRenderer.invoke('manga:getOrphanedDownloads'),

  // ── Chapters ───────────────────────────────────────────────────────────────
  getChapters: (mangaId: string, opts?: ChapterQueryOpts) =>
    ipcRenderer.invoke('chapter:list', mangaId, opts),
  getChapterPages: (chapterId: string) => ipcRenderer.invoke('chapter:pages', chapterId),
  getChapterById: (id: string) => ipcRenderer.invoke('chapter:getById', id),

  // ── Library ────────────────────────────────────────────────────────────────
  getLibrary: (filters?: LibraryFilters) => ipcRenderer.invoke('library:get', filters),
  getLibraryCounts: () => ipcRenderer.invoke('library:getCounts'),
  addToLibrary: (mangaId: string, status: ReadStatus) =>
    ipcRenderer.invoke('library:add', mangaId, status),
  updateLibraryEntry: (mangaId: string, updates: object) =>
    ipcRenderer.invoke('library:update', mangaId, updates),
  removeFromLibrary: (mangaId: string) => ipcRenderer.invoke('library:remove', mangaId),
  isInLibrary: (mangaId: string) => ipcRenderer.invoke('library:isInLibrary', mangaId),

  // ── Reading Progress ───────────────────────────────────────────────────────
  saveProgress: (payload: ProgressPayload) => ipcRenderer.invoke('progress:save', payload),
  getProgress: (mangaId: string) => ipcRenderer.invoke('progress:get', mangaId),
  getLastRead: (mangaId: string) => ipcRenderer.invoke('progress:getLastRead', mangaId),
  getContinueReading: () => ipcRenderer.invoke('progress:getContinueReading'),

  // ── Downloads ──────────────────────────────────────────────────────────────
  queueDownload: (chapterId: string, priority?: number) =>
    ipcRenderer.invoke('download:queue', chapterId, priority),
  pauseDownload: (queueId: number) => ipcRenderer.invoke('download:pause', queueId),
  cancelDownload: (queueId: number) => ipcRenderer.invoke('download:cancel', queueId),
  retryDownload: (queueId: number) => ipcRenderer.invoke('download:retry', queueId),
  getDownloadQueue: () => ipcRenderer.invoke('download:getQueue'),
  deleteDownload: (chapterId: string, mangaId: string) =>
    ipcRenderer.invoke('download:delete', chapterId, mangaId),

  // ── Collections ────────────────────────────────────────────────────────────
  getCollections: () => ipcRenderer.invoke('collection:getAll'),
  createCollection: (name: string, desc?: string) =>
    ipcRenderer.invoke('collection:create', name, desc),
  updateCollection: (id: number, updates: object) =>
    ipcRenderer.invoke('collection:update', id, updates),
  deleteCollection: (id: number) => ipcRenderer.invoke('collection:delete', id),
  addToCollection: (collectionId: number, mangaId: string) =>
    ipcRenderer.invoke('collection:addManga', collectionId, mangaId),
  removeFromCollection: (collectionId: number, mangaId: string) =>
    ipcRenderer.invoke('collection:removeManga', collectionId, mangaId),
  getCollectionMangaIds: (collectionId: number) =>
    ipcRenderer.invoke('collection:getMangaIds', collectionId),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSetting: (key: keyof AppSettings, value: unknown) =>
    ipcRenderer.invoke('settings:update', key, value),
  updateSettings: (updates: Partial<AppSettings>) =>
    ipcRenderer.invoke('settings:updateMany', updates),

  // ── Reader utils ───────────────────────────────────────────────────────────
  getPageServerPort: () => ipcRenderer.invoke('reader:getPageServerPort'),
  openFileDialog: () => ipcRenderer.invoke('import:openDialog'),
  importFiles: (filePaths: string[]) => ipcRenderer.invoke('import:files', filePaths),

  // ── Push events (main → renderer) ─────────────────────────────────────────
  onDownloadProgress: (cb: (event: DownloadProgressEvent) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: DownloadProgressEvent) => cb(data)
    ipcRenderer.on('download:progress', handler)
    return () => ipcRenderer.off('download:progress', handler)
  },
  onDownloadComplete: (cb: (event: DownloadCompleteEvent) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: DownloadCompleteEvent) => cb(data)
    ipcRenderer.on('download:complete', handler)
    return () => ipcRenderer.off('download:complete', handler)
  },
  onLibraryUpdated: (cb: () => void) => {
    const handler = () => cb()
    ipcRenderer.on('library:updated', handler)
    return () => ipcRenderer.off('library:updated', handler)
  }
}

contextBridge.exposeInMainWorld('mangaApi', mangaApi)

export type MangaApi = typeof mangaApi
