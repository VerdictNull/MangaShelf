import AdmZip from 'adm-zip'
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'
import { BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { AppPaths } from '../appPaths'
import type { MangaRepository } from '../db/repositories/mangaRepository'
import type { ChapterRepository } from '../db/repositories/chapterRepository'

interface ImportResult {
  success: boolean
  mangaId?: string
  error?: string
  title?: string
}

function naturalSort(files: string[]): string[] {
  return files.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  )
}

function isImageFile(name: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|avif|bmp)$/i.test(name)
}

function parseComicInfo(xml: string): { title?: string; chapter?: number; series?: string } {
  const result: { title?: string; chapter?: number; series?: string } = {}
  const title = xml.match(/<Title>(.*?)<\/Title>/)?.[1]
  const chapter = xml.match(/<Number>(.*?)<\/Number>/)?.[1]
  const series = xml.match(/<Series>(.*?)<\/Series>/)?.[1]
  if (title) result.title = title
  if (chapter) result.chapter = parseFloat(chapter)
  if (series) result.series = series
  return result
}

async function importCbzZip(
  filePath: string,
  mangaRepo: MangaRepository,
  chapterRepo: ChapterRepository
): Promise<ImportResult> {
  try {
    const zip = new AdmZip(filePath)
    const entries = zip.getEntries()

    // Look for ComicInfo.xml
    const comicInfoEntry = entries.find((e) => e.entryName.toLowerCase() === 'comicinfo.xml')
    let comicInfo: { title?: string; chapter?: number; series?: string } = {}
    if (comicInfoEntry) {
      comicInfo = parseComicInfo(comicInfoEntry.getData().toString('utf-8'))
    }

    // Derive title from filename if no ComicInfo
    const filename = basename(filePath, extname(filePath))
    const title = comicInfo.series || comicInfo.title || filename
    const chapterNumber = comicInfo.chapter ?? 1

    // Get or create manga
    const existingManga = mangaRepo.searchLocal(title, 5).find(
      (m) => m.source === 'local' && m.title.toLowerCase() === title.toLowerCase()
    )

    const mangaId = existingManga?.id ?? `local-${randomUUID()}`

    if (!existingManga) {
      mangaRepo.upsert({
        id: mangaId,
        source: 'local',
        title,
        titleAlt: [],
        description: '',
        status: null,
        demographic: null,
        contentRating: 'safe',
        year: null,
        authors: [],
        artists: [],
        tags: [],
        coverUrl: null,
        coverLocalPath: null,
        coverFilename: null,
        lastFetchedAt: Date.now()
      })
    }

    // Extract images to chapter dir
    const chapterId = `local-${randomUUID()}`
    const chapterPath = join(AppPaths.library, mangaId, chapterId)
    mkdirSync(chapterPath, { recursive: true })

    const imageEntries = naturalSort(
      entries.filter((e) => isImageFile(e.entryName)).map((e) => e.entryName)
    )

    let totalSize = 0
    imageEntries.forEach((entryName, idx) => {
      const entry = entries.find((e) => e.entryName === entryName)!
      const ext = extname(entryName) || '.jpg'
      const outName = `${String(idx + 1).padStart(3, '0')}${ext}`
      const data = entry.getData()
      writeFileSync(join(chapterPath, outName), data)
      totalSize += data.length
    })

    chapterRepo.upsertOne({
      id: chapterId,
      mangaId,
      source: 'local',
      chapterNumber,
      volumeNumber: null,
      title: comicInfo.title || null,
      language: 'en',
      translatorGroup: null,
      pageCount: imageEntries.length,
      publishedAt: Date.now(),
      isDownloaded: true,
      downloadPath: chapterPath,
      fileSizeBytes: totalSize
    })

    // Emit to renderer
    BrowserWindow.getAllWindows()[0]?.webContents.send('library:updated', null)

    return { success: true, mangaId, title }
  } catch (err: any) {
    log.error('CBZ import failed:', filePath, err)
    return { success: false, error: err.message }
  }
}

async function importCbr(
  filePath: string,
  mangaRepo: MangaRepository,
  chapterRepo: ChapterRepository
): Promise<ImportResult> {
  // For CBR files, we attempt to use adm-zip which may not work for RAR format
  // If it fails, we report the error gracefully
  // Full CBR support requires node-unrar-js WASM which needs additional setup
  try {
    // Try treating it as a zip first (some CBR files are actually zips)
    return await importCbzZip(filePath, mangaRepo, chapterRepo)
  } catch {
    return {
      success: false,
      error: 'CBR files require the RAR library. Please convert to CBZ and try again.'
    }
  }
}

export async function importFiles(
  filePaths: string[],
  mangaRepo: MangaRepository,
  chapterRepo: ChapterRepository
): Promise<ImportResult[]> {
  const results: ImportResult[] = []

  for (const filePath of filePaths) {
    if (!existsSync(filePath)) {
      results.push({ success: false, error: `File not found: ${filePath}` })
      continue
    }

    const ext = extname(filePath).toLowerCase()

    if (ext === '.cbz' || ext === '.zip') {
      results.push(await importCbzZip(filePath, mangaRepo, chapterRepo))
    } else if (ext === '.cbr') {
      results.push(await importCbr(filePath, mangaRepo, chapterRepo))
    } else if (ext === '.pdf') {
      results.push({ success: false, error: 'PDF import is not yet supported in this build.' })
    } else {
      results.push({ success: false, error: `Unsupported format: ${ext}` })
    }
  }

  return results
}
