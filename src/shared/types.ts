// ─── Shared types between main process and renderer ──────────────────────────

export type ReadStatus = 'reading' | 'completed' | 'dropped' | 'on_hold' | 'plan_to_read'
export type MangaSource = 'mangadex' | 'local'
export type ReaderMode = 'single' | 'double' | 'webtoon'
export type ReadingDirection = 'ltr' | 'rtl'
export type Theme = 'light' | 'dark' | 'system'
export type ImageQuality = 'data' | 'data-saver'
export type FontSize = 'small' | 'medium' | 'large' | 'xl'
export type ContentRating = 'safe' | 'suggestive' | 'erotica'
export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled'
export type Demographic = 'shounen' | 'shoujo' | 'seinen' | 'josei' | 'none'
export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed'
export type ZoomMode = 'fit-width' | 'fit-height' | 'original' | 'custom'

export interface Manga {
  id: string
  source: MangaSource
  title: string
  titleAlt: string[]
  description: string
  status: MangaStatus | null
  demographic: Demographic | null
  contentRating: ContentRating
  year: number | null
  authors: string[]
  artists: string[]
  tags: string[]
  coverUrl: string | null
  coverLocalPath: string | null
  coverFilename: string | null
  lastFetchedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface LibraryEntry {
  id: number
  mangaId: string
  readStatus: ReadStatus
  isFavorite: boolean
  userRating: number | null
  userNotes: string | null
  addedAt: number
  updatedAt: number
}

export interface MangaWithLibrary extends Manga {
  library: LibraryEntry | null
}

export interface Chapter {
  id: string
  mangaId: string
  source: MangaSource
  chapterNumber: number | null
  volumeNumber: string | null
  title: string | null
  language: string
  translatorGroup: string | null
  pageCount: number | null
  publishedAt: number | null
  isDownloaded: boolean
  downloadPath: string | null
  fileSizeBytes: number | null
  createdAt: number
}

export interface ReadingProgress {
  id: number
  mangaId: string
  chapterId: string
  currentPage: number
  totalPages: number | null
  isCompleted: boolean
  lastReadAt: number
}

export interface Collection {
  id: number
  name: string
  description: string | null
  coverMangaId: string | null
  sortOrder: number
  createdAt: number
}

export interface DownloadQueueItem {
  id: number
  chapterId: string
  mangaId: string
  status: DownloadStatus
  priority: number
  progressPages: number
  totalPages: number | null
  errorMessage: string | null
  retryCount: number
  queuedAt: number
  startedAt: number | null
  completedAt: number | null
  // Joined from manga + chapter tables for display purposes
  mangaTitle?: string | null
  chapterNumber?: number | null
  chapterTitle?: string | null
}

export interface AppSettings {
  theme: Theme
  readerMode: ReaderMode
  readingDirection: ReadingDirection
  imageQuality: ImageQuality
  downloadConcurrency: number
  prefetchPages: number
  language: string
  contentRatings: ContentRating[]
  highContrast: boolean
  fontSize: FontSize
  animationsEnabled: boolean
  reduceMotion: boolean
  downloadLocation: string | null
  maxCacheGB: number
  autoDownloadNewChapters: boolean
  showPageNumbers: boolean
  backgroundStyle: 'black' | 'white' | 'gray'
}

// ─── Search / API params ──────────────────────────────────────────────────────

export interface SearchParams {
  query?: string
  tags?: string[]
  excludeTags?: string[]
  status?: MangaStatus[]
  demographic?: Demographic[]
  contentRating?: ContentRating[]
  sortBy?: 'relevance' | 'latestUploadedChapter' | 'followedCount' | 'createdAt' | 'title' | 'rating'
  sortOrder?: 'asc' | 'desc'
  language?: string
  offset?: number
  limit?: number
}

export interface ChapterQueryOpts {
  language?: string
  offset?: number
  limit?: number
}

export interface LibraryFilters {
  status?: ReadStatus | 'all' | 'favorites'
  collectionId?: number
  sortBy?: 'lastRead' | 'title' | 'dateAdded' | 'rating'
  sortOrder?: 'asc' | 'desc'
  query?: string
}

// ─── IPC event payloads ───────────────────────────────────────────────────────

export interface ProgressPayload {
  mangaId: string
  chapterId: string
  currentPage: number
  totalPages: number
  isCompleted: boolean
}

export interface DownloadProgressEvent {
  queueId: number
  chapterId: string
  mangaId: string
  progressPages: number
  totalPages: number | null
  status: DownloadStatus
}

export interface DownloadCompleteEvent {
  queueId: number
  chapterId: string
  mangaId: string
  success: boolean
  errorMessage?: string
}

export interface MangaDexTag {
  id: string
  name: string
  group: string
}

// ─── MangaDex API response shapes (simplified) ───────────────────────────────

export interface MangaDexManga {
  id: string
  type: 'manga'
  attributes: {
    title: Record<string, string>
    altTitles: Record<string, string>[]
    description: Record<string, string>
    status: MangaStatus
    year: number | null
    contentRating: ContentRating
    demographic: Demographic | null
    tags: { id: string; attributes: { name: Record<string, string>; group: { name: Record<string, string> } } }[]
    lastChapter: string | null
    lastVolume: string | null
    originalLanguage: string
    state: string
  }
  relationships: {
    id: string
    type: string
    attributes?: {
      name?: string
      fileName?: string
      volume?: string
    }
  }[]
}

export interface MangaDexChapter {
  id: string
  attributes: {
    chapter: string | null
    volume: string | null
    title: string | null
    translatedLanguage: string
    publishAt: string
    pages: number
    externalUrl: string | null
  }
  relationships: { id: string; type: string; attributes?: { name?: string } }[]
}

export interface AtHomeResponse {
  baseUrl: string
  chapter: {
    hash: string
    data: string[]
    dataSaver: string[]
  }
}

export interface ContinueReadingEntry {
  manga: MangaWithLibrary
  chapter: Chapter
  progress: ReadingProgress
}
