import type { Database } from 'better-sqlite3'
import type { LibraryEntry, LibraryFilters, MangaWithLibrary, ReadStatus } from '@shared/types'

function rowToEntry(row: any): LibraryEntry {
  return {
    id: row.id,
    mangaId: row.manga_id,
    readStatus: row.read_status,
    isFavorite: Boolean(row.is_favorite),
    userRating: row.user_rating,
    userNotes: row.user_notes,
    addedAt: row.added_at,
    updatedAt: row.updated_at
  }
}

export class LibraryRepository {
  constructor(private db: Database) {}

  add(mangaId: string, status: ReadStatus = 'plan_to_read'): LibraryEntry {
    const now = Date.now()
    const info = this.db
      .prepare(
        `INSERT OR IGNORE INTO library (manga_id, read_status, added_at, updated_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(mangaId, status, now, now)

    if (info.changes === 0) {
      // Already exists, update status
      this.db
        .prepare('UPDATE library SET read_status = ?, updated_at = ? WHERE manga_id = ?')
        .run(status, now, mangaId)
    }

    return this.findByMangaId(mangaId)!
  }

  update(mangaId: string, updates: Partial<Omit<LibraryEntry, 'id' | 'mangaId' | 'addedAt'>>): void {
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.readStatus !== undefined) {
      fields.push('read_status = ?')
      values.push(updates.readStatus)
    }
    if (updates.isFavorite !== undefined) {
      fields.push('is_favorite = ?')
      values.push(updates.isFavorite ? 1 : 0)
    }
    if (updates.userRating !== undefined) {
      fields.push('user_rating = ?')
      values.push(updates.userRating)
    }
    if (updates.userNotes !== undefined) {
      fields.push('user_notes = ?')
      values.push(updates.userNotes)
    }

    if (fields.length === 0) return

    fields.push('updated_at = ?')
    values.push(Date.now())
    values.push(mangaId)

    this.db
      .prepare(`UPDATE library SET ${fields.join(', ')} WHERE manga_id = ?`)
      .run(...values)
  }

  remove(mangaId: string): void {
    this.db.prepare('DELETE FROM library WHERE manga_id = ?').run(mangaId)
  }

  findByMangaId(mangaId: string): LibraryEntry | null {
    const row = this.db.prepare('SELECT * FROM library WHERE manga_id = ?').get(mangaId)
    return row ? rowToEntry(row) : null
  }

  getAll(filters: LibraryFilters = {}): MangaWithLibrary[] {
    let sql = `
      SELECT m.*, l.id as lib_id, l.read_status, l.is_favorite, l.user_rating,
             l.user_notes, l.added_at as lib_added_at, l.updated_at as lib_updated_at,
             rp.last_read_at
      FROM library l
      JOIN manga m ON m.id = l.manga_id
      LEFT JOIN (
        SELECT manga_id, MAX(last_read_at) as last_read_at
        FROM reading_progress GROUP BY manga_id
      ) rp ON rp.manga_id = l.manga_id
    `
    const params: unknown[] = []
    const conditions: string[] = []

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'favorites') {
        conditions.push('l.is_favorite = 1')
      } else {
        conditions.push('l.read_status = ?')
        params.push(filters.status)
      }
    }

    if (filters.collectionId !== undefined) {
      sql += ` JOIN collection_manga cm ON cm.manga_id = m.id`
      conditions.push('cm.collection_id = ?')
      params.push(filters.collectionId)
    }

    if (filters.query) {
      conditions.push(
        `m.id IN (SELECT m2.id FROM manga m2 JOIN manga_fts fts ON m2.rowid = fts.rowid WHERE manga_fts MATCH ?)`
      )
      params.push(filters.query + '*')
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ')
    }

    const orderField =
      filters.sortBy === 'lastRead'
        ? 'rp.last_read_at'
        : filters.sortBy === 'title'
          ? 'm.title'
          : filters.sortBy === 'rating'
            ? 'l.user_rating'
            : 'l.added_at'
    const orderDir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC'
    sql += ` ORDER BY ${orderField} ${orderDir} NULLS LAST`

    const rows = this.db.prepare(sql).all(...params) as any[]

    return rows.map((row) => ({
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
      updatedAt: row.updated_at,
      library: {
        id: row.lib_id,
        mangaId: row.id,
        readStatus: row.read_status,
        isFavorite: Boolean(row.is_favorite),
        userRating: row.user_rating,
        userNotes: row.user_notes,
        addedAt: row.lib_added_at,
        updatedAt: row.lib_updated_at
      }
    }))
  }

  countByStatus(): Record<ReadStatus | 'all' | 'favorites', number> {
    const rows = this.db
      .prepare('SELECT read_status, COUNT(*) as count FROM library GROUP BY read_status')
      .all() as any[]
    const favCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM library WHERE is_favorite = 1').get() as any
    ).count
    const totalCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM library').get() as any
    ).count
    const result: Record<string, number> = { all: totalCount, favorites: favCount }
    for (const row of rows) {
      result[row.read_status] = row.count
    }
    return result as Record<ReadStatus | 'all' | 'favorites', number>
  }
}
