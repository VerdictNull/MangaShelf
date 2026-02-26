import type { Database } from 'better-sqlite3'
import type { AppSettings } from '@shared/types'

export class SettingsRepository {
  constructor(private db: Database) {}

  get<K extends keyof AppSettings>(key: K): AppSettings[K] | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as any
    if (!row) return null
    try {
      return JSON.parse(row.value)
    } catch {
      return row.value as AppSettings[K]
    }
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), now)
  }

  getAll(): AppSettings {
    const rows = this.db.prepare('SELECT key, value FROM settings').all() as any[]
    const result: Record<string, unknown> = {}
    for (const row of rows) {
      try {
        result[row.key] = JSON.parse(row.value)
      } catch {
        result[row.key] = row.value
      }
    }
    return result as unknown as AppSettings
  }

  setMany(updates: Partial<AppSettings>): void {
    const stmt = this.db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    const now = Date.now()
    const transaction = this.db.transaction((updates: Partial<AppSettings>) => {
      for (const [key, value] of Object.entries(updates)) {
        stmt.run(key, JSON.stringify(value), now)
      }
    })
    transaction(updates)
  }
}
