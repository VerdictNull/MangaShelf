CREATE TABLE IF NOT EXISTS collection (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_manga_id TEXT REFERENCES manga(id) ON DELETE SET NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000)
);

CREATE TABLE IF NOT EXISTS collection_manga (
    collection_id INTEGER NOT NULL REFERENCES collection(id) ON DELETE CASCADE,
    manga_id TEXT NOT NULL REFERENCES manga(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    added_at INTEGER NOT NULL DEFAULT (unixepoch('now') * 1000),
    PRIMARY KEY (collection_id, manga_id)
);
