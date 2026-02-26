import { BrowserWindow, Notification } from 'electron'
import log from 'electron-log/main'
import { getAllChapters } from './mangadexApi'
import type { ChapterRepository } from '../db/repositories/chapterRepository'
import type { LibraryRepository } from '../db/repositories/libraryRepository'
import type { SettingsRepository } from '../db/repositories/settingsRepository'

type Repos = {
  chapterRepo: ChapterRepository
  libraryRepo: LibraryRepository
  settingsRepo: SettingsRepository
}

const CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000 // 12 hours

let timer: ReturnType<typeof setTimeout> | null = null
let repos: Repos | null = null

export function initUpdateService(r: Repos): void {
  repos = r
  scheduleCheck()
}

export function stopUpdateService(): void {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function scheduleCheck(): void {
  timer = setTimeout(async () => {
    await checkForUpdates()
    scheduleCheck()
  }, CHECK_INTERVAL_MS)
}

async function checkForUpdates(): Promise<void> {
  if (!repos) return

  try {
    const language = repos.settingsRepo.get('language') ?? 'en'
    const libraryEntries = repos.libraryRepo.getAll({ status: 'reading' })

    log.info(`Checking updates for ${libraryEntries.length} manga in "reading" status`)

    let totalNew = 0
    const newMangaTitles: string[] = []

    for (const entry of libraryEntries) {
      try {
        const existing = repos.chapterRepo.findByMangaId(entry.id, language)
        const existingIds = new Set(existing.map((c) => c.id))

        const fetched = await getAllChapters(entry.id, language)
        const newChapters = fetched.filter((c) => !existingIds.has(c.id))

        if (newChapters.length > 0) {
          repos.chapterRepo.upsertMany(newChapters)
          totalNew += newChapters.length
          const manga = existing[0]
          if (manga) newMangaTitles.push(`+${newChapters.length} ch`)
          log.info(`New chapters for ${entry.id}: ${newChapters.length}`)
        }
      } catch (err) {
        log.warn(`Update check failed for manga ${entry.id}:`, err)
      }
    }

    if (totalNew > 0) {
      // Emit update event to renderer
      BrowserWindow.getAllWindows()[0]?.webContents.send('library:updated', null)

      // Show system notification
      if (Notification.isSupported()) {
        new Notification({
          title: 'MangaShelf — New Chapters',
          body: `${totalNew} new chapter${totalNew !== 1 ? 's' : ''} available in your reading list`
        }).show()
      }

      log.info(`Update check complete: ${totalNew} new chapters found`)
    } else {
      log.info('Update check complete: no new chapters')
    }
  } catch (err) {
    log.error('Update check error:', err)
  }
}
