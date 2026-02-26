import type { Database } from 'better-sqlite3'
import type { DownloadQueueItem, DownloadStatus } from '@shared/types'

function rowToItem(row: any): DownloadQueueItem {
  return {
    id: row.id,
    chapterId: row.chapter_id,
    mangaId: row.manga_id,
    status: row.status,
    priority: row.priority,
    progressPages: row.progress_pages,
    totalPages: row.total_pages,
    errorMessage: row.error_message,
    retryCount: row.retry_count,
    queuedAt: row.queued_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    mangaTitle: row.manga_title ?? null,
    chapterNumber: row.chapter_number ?? null,
    chapterTitle: row.chapter_title ?? null
  }
}

const ENRICHED_SELECT = `
  SELECT dq.*,
    m.title AS manga_title,
    ch.chapter_number,
    ch.title AS chapter_title
  FROM download_queue dq
  LEFT JOIN manga m ON m.id = dq.manga_id
  LEFT JOIN chapter ch ON ch.id = dq.chapter_id
`

export class DownloadRepository {
  constructor(private db: Database) {}

  enqueue(chapterId: string, mangaId: string, priority = 0): DownloadQueueItem {
    const existing = this.db
      .prepare(
        `SELECT id FROM download_queue WHERE chapter_id = ? AND status NOT IN ('completed', 'failed')`
      )
      .get(chapterId) as any
    if (existing) return this.findById(existing.id)!

    const now = Date.now()
    const info = this.db
      .prepare(
        `INSERT INTO download_queue (chapter_id, manga_id, priority, queued_at)
         VALUES (?, ?, ?, ?)`
      )
      .run(chapterId, mangaId, priority, now)
    return this.findById(Number(info.lastInsertRowid))!
  }

  findById(id: number): DownloadQueueItem | null {
    const row = this.db
      .prepare(`${ENRICHED_SELECT} WHERE dq.id = ?`)
      .get(id)
    return row ? rowToItem(row) : null
  }

  findByChapterId(chapterId: string): DownloadQueueItem | null {
    const row = this.db
      .prepare(`${ENRICHED_SELECT} WHERE dq.chapter_id = ? ORDER BY dq.queued_at DESC LIMIT 1`)
      .get(chapterId)
    return row ? rowToItem(row) : null
  }

  getQueue(): DownloadQueueItem[] {
    const rows = this.db
      .prepare(
        `${ENRICHED_SELECT}
         WHERE dq.status IN ('pending', 'downloading', 'paused', 'failed')
         ORDER BY dq.priority DESC, dq.queued_at ASC`
      )
      .all() as any[]
    return rows.map(rowToItem)
  }

  getPendingForResume(): DownloadQueueItem[] {
    // Called on app start: reset 'downloading' → 'pending', then return all pending
    this.db
      .prepare(`UPDATE download_queue SET status = 'pending' WHERE status = 'downloading'`)
      .run()
    const rows = this.db
      .prepare(
        `${ENRICHED_SELECT}
         WHERE dq.status = 'pending' ORDER BY dq.priority DESC, dq.queued_at ASC`
      )
      .all() as any[]
    return rows.map(rowToItem)
  }

  updateStatus(id: number, status: DownloadStatus, extra?: {
    progressPages?: number
    totalPages?: number
    errorMessage?: string
    startedAt?: number
    completedAt?: number
  }): void {
    const fields = ['status = ?']
    const values: unknown[] = [status]

    if (extra?.progressPages !== undefined) { fields.push('progress_pages = ?'); values.push(extra.progressPages) }
    if (extra?.totalPages !== undefined) { fields.push('total_pages = ?'); values.push(extra.totalPages) }
    if (extra?.errorMessage !== undefined) { fields.push('error_message = ?'); values.push(extra.errorMessage) }
    if (extra?.startedAt !== undefined) { fields.push('started_at = ?'); values.push(extra.startedAt) }
    if (extra?.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(extra.completedAt) }

    values.push(id)
    this.db.prepare(`UPDATE download_queue SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  }

  incrementProgress(id: number): void {
    this.db
      .prepare('UPDATE download_queue SET progress_pages = progress_pages + 1 WHERE id = ?')
      .run(id)
  }

  incrementRetry(id: number): void {
    this.db
      .prepare('UPDATE download_queue SET retry_count = retry_count + 1 WHERE id = ?')
      .run(id)
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM download_queue WHERE id = ?').run(id)
  }

  clearCompleted(): void {
    this.db.prepare(`DELETE FROM download_queue WHERE status IN ('completed', 'failed')`).run()
  }
}
