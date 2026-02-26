PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS manga (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'mangadex',
    title TEXT NOT NULL,
    title_alt TEXT,
    description TEXT,
    status TEXT,
    demographic TEXT,
    content_rating TEXT DEFAULT 'safe',
    year INTEGER,
    authors TEXT,
    artists TEXT,
    tags TEXT,
    cover_url TEXT,
    cover_local_path TEXT,
    cover_filename TEXT,
    last_fetched_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manga_id TEXT NOT NULL UNIQUE REFERENCES manga(id) ON DELETE CASCADE,
    read_status TEXT NOT NULL DEFAULT 'plan_to_read',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    user_rating INTEGER,
    user_notes TEXT,
    added_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS chapter (
    id TEXT PRIMARY KEY,
    manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    source TEXT NOT NULL DEFAULT 'mangadex',
    chapter_number REAL,
    volume_number TEXT,
    title TEXT,
    language TEXT NOT NULL DEFAULT 'en',
    translator_group TEXT,
    page_count INTEGER,
    published_at INTEGER,
    is_downloaded INTEGER NOT NULL DEFAULT 0,
    download_path TEXT,
    file_size_bytes INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    chapter_id TEXT NOT NULL REFERENCES chapter(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL DEFAULT 0,
    total_pages INTEGER,
    is_completed INTEGER NOT NULL DEFAULT 0,
    last_read_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    UNIQUE(manga_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_manga_time
    ON reading_progress(manga_id, last_read_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapter_manga_number
    ON chapter(manga_id, chapter_number);

CREATE VIRTUAL TABLE IF NOT EXISTS manga_fts USING fts5(
    title, title_alt, description, authors, tags,
    content='manga',
    content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS manga_fts_insert AFTER INSERT ON manga BEGIN
    INSERT INTO manga_fts(rowid, title, title_alt, description, authors, tags)
    VALUES (new.rowid, new.title, new.title_alt, new.description, new.authors, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS manga_fts_delete AFTER DELETE ON manga BEGIN
    INSERT INTO manga_fts(manga_fts, rowid, title, title_alt, description, authors, tags)
    VALUES ('delete', old.rowid, old.title, old.title_alt, old.description, old.authors, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS manga_fts_update AFTER UPDATE ON manga BEGIN
    INSERT INTO manga_fts(manga_fts, rowid, title, title_alt, description, authors, tags)
    VALUES ('delete', old.rowid, old.title, old.title_alt, old.description, old.authors, old.tags);
    INSERT INTO manga_fts(rowid, title, title_alt, description, authors, tags)
    VALUES (new.rowid, new.title, new.title_alt, new.description, new.authors, new.tags);
END;

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

INSERT OR IGNORE INTO settings(key, value) VALUES
    ('theme', '"system"'),
    ('readerMode', '"single"'),
    ('readingDirection', '"ltr"'),
    ('imageQuality', '"data-saver"'),
    ('downloadConcurrency', '3'),
    ('prefetchPages', '5'),
    ('language', '"en"'),
    ('contentRatings', '["safe","suggestive"]'),
    ('highContrast', 'false'),
    ('fontSize', '"medium"'),
    ('animationsEnabled', 'true'),
    ('reduceMotion', 'false'),
    ('downloadLocation', 'null'),
    ('maxCacheGB', '10'),
    ('autoDownloadNewChapters', 'false'),
    ('showPageNumbers', 'true'),
    ('backgroundStyle', '"black"');
