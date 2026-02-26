import Database from 'better-sqlite3'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { AppPaths } from '../appPaths'
import log from 'electron-log/main'

let db: Database.Database | null = null

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function initDatabase(): Database.Database {
  log.info('Initializing database at:', AppPaths.database)

  db = new Database(AppPaths.database)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')

  runMigrations(db)

  log.info('Database initialized successfully')
  return db
}

function runMigrations(db: Database.Database): void {
  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
    )
  `)

  const migrationsDir = join(__dirname, 'migrations')
  let migrationFiles: string[]

  try {
    migrationFiles = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
  } catch {
    log.warn('Migrations directory not found, skipping migrations')
    return
  }

  const applied = db
    .prepare('SELECT filename FROM _migrations')
    .all()
    .map((r: any) => r.filename as string)

  for (const file of migrationFiles) {
    if (applied.includes(file)) continue

    log.info('Running migration:', file)
    const sql = readFileSync(join(migrationsDir, file), 'utf-8')

    db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file)
    })()

    log.info('Migration applied:', file)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    log.info('Database closed')
  }
}
