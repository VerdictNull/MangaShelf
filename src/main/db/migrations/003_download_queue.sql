CREATE TABLE IF NOT EXISTS download_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chapter_id TEXT NOT NULL REFERENCES chapter(id) ON DELETE CASCADE,
    manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    progress_pages INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER,
    error_message TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    queued_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    started_at INTEGER,
    completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS reading_session (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL REFERENCES chapter(id) ON DELETE CASCADE,
    pages_read INTEGER NOT NULL DEFAULT 0,
    started_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    ended_at INTEGER
);
