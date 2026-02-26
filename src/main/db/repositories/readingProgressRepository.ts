import type { Database } from 'better-sqlite3'
import type { ContinueReadingEntry, ReadingProgress } from '@shared/types'

function rowToProgress(row: any): ReadingProgress {
  return {
    id: row.id,
    mangaId: row.manga_id,
    chapterId: row.chapter_id,
    currentPage: row.current_page,
    totalPages: row.total_pages,
    isCompleted: Boolean(row.is_completed),
    lastReadAt: row.last_read_at
  }
}

export class ReadingProgressRepository {
  constructor(private db: Database) {}

  save(
    mangaId: string,
    chapterId: string,
    currentPage: number,
    totalPages: number,
    isCompleted = false
  ): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO reading_progress (manga_id, chapter_id, current_page, total_pages, is_completed, last_read_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(manga_id, chapter_id) DO UPDATE SET
           current_page = excluded.current_page,
           total_pages = excluded.total_pages,
           is_completed = excluded.is_completed,
           last_read_at = excluded.last_read_at`
      )
      .run(mangaId, chapterId, currentPage, totalPages, isCompleted ? 1 : 0, now)
  }

  getForManga(mangaId: string): ReadingProgress[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM reading_progress WHERE manga_id = ? ORDER BY last_read_at DESC'
      )
      .all(mangaId) as any[]
    return rows.map(rowToProgress)
  }

  getLastRead(mangaId: string): ReadingProgress | null {
    const row = this.db
      .prepare(
        'SELECT * FROM reading_progress WHERE manga_id = ? ORDER BY last_read_at DESC LIMIT 1'
      )
      .get(mangaId)
    return row ? rowToProgress(row) : null
  }

  getForChapter(mangaId: string, chapterId: string): ReadingProgress | null {
    const row = this.db
      .prepare('SELECT * FROM reading_progress WHERE manga_id = ? AND chapter_id = ?')
      .get(mangaId, chapterId)
    return row ? rowToProgress(row) : null
  }

  getContinueReading(limit = 20): ContinueReadingEntry[] {
    const rows = this.db
      .prepare(
        `SELECT rp.*, m.*, ch.*,
                m.id as manga_id_col,
                ch.id as chapter_id_col,
                l.read_status, l.is_favorite, l.user_rating, l.user_notes,
                l.id as lib_id, l.added_at as lib_added_at, l.updated_at as lib_updated_at
         FROM reading_progress rp
         JOIN manga m ON m.id = rp.manga_id
         JOIN chapter ch ON ch.id = rp.chapter_id
         LEFT JOIN library l ON l.manga_id = rp.manga_id
         WHERE rp.is_completed = 0
         ORDER BY rp.last_read_at DESC
         LIMIT ?`
      )
      .all(limit) as any[]

    return rows.map((row) => ({
      manga: {
        id: row.manga_id,
        source: row.source,
        title: row.title,
        titleAlt: row.title_alt ? JSON.parse(row.title_alt) : [],
        description: row.description ?? '',
        status: row.status,
        demographic: row.demographic,
        contentRating: row.content_rating,
        year: row.year,
        authors: row.authors ? JSON.parse(row.authors) : [],
        artists: row.artists ? JSON.parse(row.artists) : [],
        tags: row.tags ? JSON.parse(row.tags) : [],
        coverUrl: row.cover_url,
        coverLocalPath: row.cover_local_path,
        coverFilename: row.cover_filename,
        lastFetchedAt: row.last_fetched_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        library: row.lib_id
          ? {
              id: row.lib_id,
              mangaId: row.manga_id,
              readStatus: row.read_status,
              isFavorite: Boolean(row.is_favorite),
              userRating: row.user_rating,
              userNotes: row.user_notes,
              addedAt: row.lib_added_at,
              updatedAt: row.lib_updated_at
            }
          : null
      },
      chapter: {
        id: row.chapter_id_col,
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
      },
      progress: rowToProgress(row)
    }))
  }
}
