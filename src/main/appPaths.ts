import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'

let _userData: string | null = null

function ud(): string {
  if (!_userData) _userData = app.getPath('userData')
  return _userData
}

export const AppPaths = {
  get userData() { return ud() },
  get data() { return join(ud(), 'data') },
  get database() { return join(ud(), 'data', 'manga.db') },
  get covers() { return join(ud(), 'data', 'covers') },
  get library() { return join(ud(), 'data', 'library') },
  get imports() { return join(ud(), 'data', 'library', 'imports') },
  get logs() { return join(ud(), 'logs') }
}

export function ensureAppDirs(): void {
  const dirs = [
    AppPaths.data,
    AppPaths.covers,
    AppPaths.library,
    AppPaths.imports,
    AppPaths.logs
  ]
  for (const dir of dirs) {
    mkdirSync(dir, { recursive: true })
  }
}

export function chapterDir(mangaId: string, chapterId: string): string {
  return join(AppPaths.library, mangaId, chapterId)
}

export function coverPath(mangaId: string, filename: string): string {
  return join(AppPaths.covers, mangaId, filename)
}
