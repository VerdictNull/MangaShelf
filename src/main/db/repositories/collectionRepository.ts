import type { Database } from 'better-sqlite3'
import type { Collection } from '@shared/types'

function rowToCollection(row: any): Collection {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverMangaId: row.cover_manga_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at
  }
}

export class CollectionRepository {
  constructor(private db: Database) {}

  create(name: string, description?: string): Collection {
    const now = Date.now()
    const info = this.db
      .prepare(
        'INSERT INTO collection (name, description, created_at) VALUES (?, ?, ?)'
      )
      .run(name, description ?? null, now)
    return this.findById(Number(info.lastInsertRowid))!
  }

  update(id: number, updates: { name?: string; description?: string; coverMangaId?: string }): void {
    const fields: string[] = []
    const values: unknown[] = []

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description) }
    if (updates.coverMangaId !== undefined) { fields.push('cover_manga_id = ?'); values.push(updates.coverMangaId) }

    if (fields.length === 0) return
    values.push(id)
    this.db.prepare(`UPDATE collection SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  delete(id: number): void {
    this.db.prepare('DELETE FROM collection WHERE id = ?').run(id)
  }

  findById(id: number): Collection | null {
    const row = this.db.prepare('SELECT * FROM collection WHERE id = ?').get(id)
    return row ? rowToCollection(row) : null
  }

  getAll(): Collection[] {
    const rows = this.db
      .prepare('SELECT * FROM collection ORDER BY sort_order ASC, created_at ASC')
      .all() as any[]
    return rows.map(rowToCollection)
  }

  addManga(collectionId: number, mangaId: string): void {
    const now = Date.now()
    this.db
      .prepare(
        'INSERT OR IGNORE INTO collection_manga (collection_id, manga_id, added_at) VALUES (?, ?, ?)'
      )
      .run(collectionId, mangaId, now)
  }

  removeManga(collectionId: number, mangaId: string): void {
    this.db
      .prepare('DELETE FROM collection_manga WHERE collection_id = ? AND manga_id = ?')
      .run(collectionId, mangaId)
  }

  getMangaIds(collectionId: number): string[] {
    const rows = this.db
      .prepare(
        'SELECT manga_id FROM collection_manga WHERE collection_id = ? ORDER BY sort_order ASC'
      )
      .all(collectionId) as any[]
    return rows.map((r) => r.manga_id)
  }
}
