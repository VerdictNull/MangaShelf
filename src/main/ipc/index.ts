import type { MangaRepository } from '../db/repositories/mangaRepository'
import type { ChapterRepository } from '../db/repositories/chapterRepository'
import type { LibraryRepository } from '../db/repositories/libraryRepository'
import type { ReadingProgressRepository } from '../db/repositories/readingProgressRepository'
import type { CollectionRepository } from '../db/repositories/collectionRepository'
import type { DownloadRepository } from '../db/repositories/downloadRepository'
import type { SettingsRepository } from '../db/repositories/settingsRepository'
import { registerMangaHandlers } from './mangaHandlers'
import { registerChapterHandlers } from './chapterHandlers'
import { registerLibraryHandlers } from './libraryHandlers'
import { registerProgressHandlers } from './progressHandlers'
import { registerDownloadHandlers } from './downloadHandlers'
import { registerCollectionHandlers } from './collectionHandlers'
import { registerSettingsHandlers } from './settingsHandlers'
import { registerReaderHandlers } from './readerHandlers'

export interface HandlerDeps {
  mangaRepo: MangaRepository
  chapterRepo: ChapterRepository
  libraryRepo: LibraryRepository
  progressRepo: ReadingProgressRepository
  collectionRepo: CollectionRepository
  downloadRepo: DownloadRepository
  settingsRepo: SettingsRepository
  pageServerPort: number
}

export function registerAllHandlers(deps: HandlerDeps): void {
  registerMangaHandlers(deps)
  registerChapterHandlers(deps)
  registerLibraryHandlers(deps)
  registerProgressHandlers(deps)
  registerDownloadHandlers(deps)
  registerCollectionHandlers(deps)
  registerSettingsHandlers(deps)
  registerReaderHandlers(deps)
}
