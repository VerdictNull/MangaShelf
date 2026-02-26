import type { Database } from 'better-sqlite3'
import type { Chapter } from '@shared/types'

function rowToChapter(row: any): Chapter {
  return {
    id: row.id,
    mangaId: row.manga_id,
    source: row.source,
    chapterNumber: row.chapter_number,
    volumeNumber: row.volume_number,
    title: row.title,
    language: row.language,
    translatorGroup: row.translator_group,
    pageCount: row.page_count,
    publishedAt: row.published_at,
    isDownloaded: Boolean(row.is_downloaded),
    downloadPath: row.download_path,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at
  }
}

export class ChapterRepository {
  constructor(private db: Database) {}

  upsertMany(chapters: Omit<Chapter, 'createdAt'>[]): void {
    const stmt = this.db.prepare(
      `INSERT INTO chapter (
        id, manga_id, source, chapter_number, volume_number, title,
        language, translator_group, page_count, published_at,
        is_downloaded, download_path, file_size_bytes, created_at
      ) VALUES (
        @id, @mangaId, @source, @chapterNumber, @volumeNumber, @title,
        @language, @translatorGroup, @pageCount, @publishedAt,
        @isDownloaded, @downloadPath, @fileSizeBytes, @now
      ) ON CONFLICT(id) DO UPDATE SET
        page_count = excluded.page_count,
        title = excluded.title,
        translator_group = excluded.translator_group`
    )

    const insertMany = this.db.transaction((chapters: Omit<Chapter, 'createdAt'>[]) => {
      for (const ch of chapters) {
        stmt.run({
          id: ch.id,
          mangaId: ch.mangaId,
          source: ch.source,
          chapterNumber: ch.chapterNumber,
          volumeNumber: ch.volumeNumber,
          title: ch.title,
          language: ch.language,
          translatorGroup: ch.translatorGroup,
          pageCount: ch.pageCount,
          publishedAt: ch.publishedAt,
          isDownloaded: ch.isDownloaded ? 1 : 0,
          downloadPath: ch.downloadPath,
          fileSizeBytes: ch.fileSizeBytes,
          now: Date.now()
        })
      }
    })
    insertMany(chapters)
  }

  upsertOne(chapter: Omit<Chapter, 'createdAt'>): void {
    this.upsertMany([chapter])
  }

  findById(id: string): Chapter | null {
    const row = this.db.prepare('SELECT * FROM chapter WHERE id = ?').get(id)
    return row ? rowToChapter(row) : null
  }

  findByMangaId(mangaId: string, language = 'en'): Chapter[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM chapter
         WHERE manga_id = ? AND language = ?
         ORDER BY chapter_number ASC`
      )
      .all(mangaId, language) as any[]
    return rows.map(rowToChapter)
  }

  markDownloaded(id: string, downloadPath: string, fileSizeBytes: number): void {
    this.db
      .prepare(
        'UPDATE chapter SET is_downloaded = 1, download_path = ?, file_size_bytes = ? WHERE id = ?'
      )
      .run(downloadPath, fileSizeBytes, id)
  }

  markNotDownloaded(id: string): void {
    this.db
      .prepare(
        'UPDATE chapter SET is_downloaded = 0, download_path = NULL, file_size_bytes = NULL WHERE id = ?'
      )
      .run(id)
  }

  getDownloadedChapters(mangaId: string): Chapter[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM chapter WHERE manga_id = ? AND is_downloaded = 1 ORDER BY chapter_number ASC'
      )
      .all(mangaId) as any[]
    return rows.map(rowToChapter)
  }

  countNewChapters(mangaId: string, afterChapterNumber: number, language = 'en'): number {
    const result = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM chapter
         WHERE manga_id = ? AND language = ? AND chapter_number > ?`
      )
      .get(mangaId, language, afterChapterNumber) as any
    return result?.count ?? 0
  }
}
