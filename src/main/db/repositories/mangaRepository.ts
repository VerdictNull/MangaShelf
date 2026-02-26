import type { Database } from 'better-sqlite3'
import type { Manga, MangaWithLibrary } from '@shared/types'

function rowToManga(row: any): Manga {
  return {
    id: row.id,
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
    updatedAt: row.updated_at
  }
}

export class MangaRepository {
  constructor(private db: Database) {}

  upsert(manga: Omit<Manga, 'createdAt' | 'updatedAt'>): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO manga (
          id, source, title, title_alt, description, status, demographic,
          content_rating, year, authors, artists, tags, cover_url,
          cover_local_path, cover_filename, last_fetched_at, created_at, updated_at
        ) VALUES (
          @id, @source, @title, @titleAlt, @description, @status, @demographic,
          @contentRating, @year, @authors, @artists, @tags, @coverUrl,
          @coverLocalPath, @coverFilename, @lastFetchedAt, @now, @now
        ) ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          title_alt = excluded.title_alt,
          description = excluded.description,
          status = excluded.status,
          demographic = excluded.demographic,
          content_rating = excluded.content_rating,
          year = excluded.year,
          authors = excluded.authors,
          artists = excluded.artists,
          tags = excluded.tags,
          cover_url = excluded.cover_url,
          cover_filename = excluded.cover_filename,
          last_fetched_at = excluded.last_fetched_at,
          updated_at = excluded.updated_at`
      )
      .run({
        id: manga.id,
        source: manga.source,
        title: manga.title,
        titleAlt: JSON.stringify(manga.titleAlt),
        description: manga.description,
        status: manga.status,
        demographic: manga.demographic,
        contentRating: manga.contentRating,
        year: manga.year,
        authors: JSON.stringify(manga.authors),
        artists: JSON.stringify(manga.artists),
        tags: JSON.stringify(manga.tags),
        coverUrl: manga.coverUrl,
        coverLocalPath: manga.coverLocalPath,
        coverFilename: manga.coverFilename,
        lastFetchedAt: manga.lastFetchedAt,
        now
      })
  }

  findById(id: string): Manga | null {
    const row = this.db.prepare('SELECT * FROM manga WHERE id = ?').get(id)
    return row ? rowToManga(row) : null
  }

  findWithLibraryById(id: string): MangaWithLibrary | null {
    const row = this.db
      .prepare(
        `SELECT m.*, l.id as lib_id, l.read_status, l.is_favorite, l.user_rating,
                l.user_notes, l.added_at, l.updated_at as lib_updated_at
         FROM manga m LEFT JOIN library l ON m.id = l.manga_id
         WHERE m.id = ?`
      )
      .get(id) as any
    if (!row) return null
    const manga = rowToManga(row)
    return {
      ...manga,
      library: row.lib_id
        ? {
            id: row.lib_id,
            mangaId: id,
            readStatus: row.read_status,
            isFavorite: Boolean(row.is_favorite),
            userRating: row.user_rating,
            userNotes: row.user_notes,
            addedAt: row.added_at,
            updatedAt: row.lib_updated_at
          }
        : null
    }
  }

  searchLocal(query: string, limit = 20): Manga[] {
    const rows = this.db
      .prepare(
        `SELECT m.* FROM manga m
         JOIN manga_fts fts ON m.rowid = fts.rowid
         WHERE manga_fts MATCH ?
         ORDER BY rank
         LIMIT ?`
      )
      .all(query + '*', limit) as any[]
    return rows.map(rowToManga)
  }

  updateCoverLocalPath(id: string, localPath: string): void {
    this.db
      .prepare('UPDATE manga SET cover_local_path = ?, updated_at = ? WHERE id = ?')
      .run(localPath, Date.now(), id)
  }

  getOrphanedDownloads(): MangaWithLibrary[] {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT m.* FROM manga m
         INNER JOIN chapter ch ON ch.manga_id = m.id AND ch.is_downloaded = 1
         LEFT JOIN library l ON l.manga_id = m.id
         WHERE l.id IS NULL
         ORDER BY m.title COLLATE NOCASE ASC`
      )
      .all() as any[]
    return rows.map((row) => ({ ...rowToManga(row), library: null }))
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM manga WHERE id = ?').run(id)
  }
}
