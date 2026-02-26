// Typed wrappers around window.mangaApi IPC calls
import type {
  AppSettings,
  Chapter,
  ChapterQueryOpts,
  Collection,
  ContinueReadingEntry,
  DownloadQueueItem,
  LibraryEntry,
  LibraryFilters,
  Manga,
  MangaDexTag,
  MangaWithLibrary,
  ProgressPayload,
  ReadStatus,
  ReadingProgress,
  SearchParams
} from '@shared/types'

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string }

const api = window.mangaApi

// ─── Manga ────────────────────────────────────────────────────────────────────

export async function searchManga(
  params: SearchParams
): Promise<{ manga: MangaWithLibrary[]; total: number }> {
  const res: ApiResult<{ manga: Manga[]; total: number }> = await api.searchManga(params)
  if (!res.ok) throw new Error(res.error)
  return res.data as any
}

export async function getMangaDetail(id: string): Promise<MangaWithLibrary | null> {
  const res: ApiResult<MangaWithLibrary | null> = await api.getMangaDetail(id)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function getTags(): Promise<MangaDexTag[]> {
  const res: ApiResult<MangaDexTag[]> = await api.getTags()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function getRandomManga(): Promise<Manga | null> {
  const res: ApiResult<Manga | null> = await api.getRandomManga()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function searchLocal(query: string): Promise<Manga[]> {
  const res: ApiResult<Manga[]> = await api.searchLocal(query)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function getOrphanedDownloads(): Promise<MangaWithLibrary[]> {
  const res: ApiResult<MangaWithLibrary[]> = await api.getOrphanedDownloads()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

// ─── Chapters ─────────────────────────────────────────────────────────────────

export async function getChapters(mangaId: string, opts?: ChapterQueryOpts): Promise<Chapter[]> {
  const res: ApiResult<Chapter[]> = await api.getChapters(mangaId, opts)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function getChapterPages(
  chapterId: string
): Promise<{ pages: string[]; source: 'local' | 'online' }> {
  const res: ApiResult<{ pages: string[]; source: 'local' | 'online' }> =
    await api.getChapterPages(chapterId)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

// ─── Library ──────────────────────────────────────────────────────────────────

export async function getLibrary(filters?: LibraryFilters): Promise<MangaWithLibrary[]> {
  const res: ApiResult<MangaWithLibrary[]> = await api.getLibrary(filters)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function getLibraryCounts(): Promise<Record<string, number>> {
  const res: ApiResult<Record<string, number>> = await api.getLibraryCounts()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function addToLibrary(mangaId: string, status: ReadStatus): Promise<LibraryEntry> {
  const res: ApiResult<LibraryEntry> = await api.addToLibrary(mangaId, status)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function updateLibraryEntry(
  mangaId: string,
  updates: Partial<LibraryEntry>
): Promise<void> {
  const res: ApiResult<void> = await api.updateLibraryEntry(mangaId, updates)
  if (!res.ok) throw new Error(res.error)
}

export async function removeFromLibrary(mangaId: string): Promise<void> {
  await api.removeFromLibrary(mangaId)
}

export async function isInLibrary(mangaId: string): Promise<LibraryEntry | null> {
  const res: ApiResult<LibraryEntry | null> = await api.isInLibrary(mangaId)
  if (!res.ok) return null
  return res.data
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export async function saveProgress(payload: ProgressPayload): Promise<void> {
  await api.saveProgress(payload)
}

export async function getProgress(mangaId: string): Promise<ReadingProgress[]> {
  const res: ApiResult<ReadingProgress[]> = await api.getProgress(mangaId)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function getContinueReading(): Promise<ContinueReadingEntry[]> {
  const res: ApiResult<ContinueReadingEntry[]> = await api.getContinueReading()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

// ─── Downloads ────────────────────────────────────────────────────────────────

export async function queueDownload(chapterId: string, priority?: number): Promise<DownloadQueueItem> {
  const res: ApiResult<DownloadQueueItem> = await api.queueDownload(chapterId, priority)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function getDownloadQueue(): Promise<DownloadQueueItem[]> {
  const res: ApiResult<DownloadQueueItem[]> = await api.getDownloadQueue()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export function pauseDownload(queueId: number): void {
  api.pauseDownload(queueId)
}

export function cancelDownload(queueId: number): void {
  api.cancelDownload(queueId)
}

export function retryDownload(queueId: number): void {
  api.retryDownload(queueId)
}

export async function deleteDownload(chapterId: string, mangaId: string): Promise<void> {
  await api.deleteDownload(chapterId, mangaId)
}

// ─── Collections ──────────────────────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  const res: ApiResult<Collection[]> = await api.getCollections()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function createCollection(name: string, desc?: string): Promise<Collection> {
  const res: ApiResult<Collection> = await api.createCollection(name, desc)
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function deleteCollection(id: number): Promise<void> {
  await api.deleteCollection(id)
}

export async function addToCollection(collectionId: number, mangaId: string): Promise<void> {
  await api.addToCollection(collectionId, mangaId)
}

export async function removeFromCollection(collectionId: number, mangaId: string): Promise<void> {
  await api.removeFromCollection(collectionId, mangaId)
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const res: ApiResult<AppSettings> = await api.getSettings()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function updateSetting(key: keyof AppSettings, value: unknown): Promise<void> {
  await api.updateSetting(key, value)
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  await api.updateSettings(updates)
}

// ─── Import ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean
  mangaId?: string
  title?: string
  error?: string
}

export async function openFileDialog(): Promise<string[]> {
  const res: ApiResult<string[]> = await api.openFileDialog()
  if (!res.ok) throw new Error(res.error)
  return res.data
}

export async function importFiles(filePaths: string[]): Promise<ImportResult[]> {
  const res: ApiResult<ImportResult[]> = await api.importFiles(filePaths)
  if (!res.ok) throw new Error(res.error)
  return res.data
}
