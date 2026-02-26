import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import { AppPaths, coverPath } from '../appPaths'
import { downloadImageBuffer, buildCoverUrl } from './mangadexApi'
import log from 'electron-log/main'

export async function cacheCover(mangaId: string, filename: string): Promise<string | null> {
  const localPath = coverPath(mangaId, filename + '.jpg')

  if (existsSync(localPath)) return localPath

  const dir = dirname(localPath)
  mkdirSync(dir, { recursive: true })

  try {
    const url = buildCoverUrl(mangaId, filename, 512)
    const buffer = await downloadImageBuffer(url)
    writeFileSync(localPath, buffer)
    return localPath
  } catch (err) {
    log.error('Failed to cache cover', mangaId, filename, err)
    return null
  }
}

export function getCoverLocalPath(mangaId: string, filename: string): string | null {
  const localPath = coverPath(mangaId, filename + '.jpg')
  return existsSync(localPath) ? localPath : null
}

export function getCoversBaseDir(): string {
  return AppPaths.covers
}
