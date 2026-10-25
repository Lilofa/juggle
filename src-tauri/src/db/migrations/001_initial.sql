-- Version 1 of the Juggle database.
-- Dates are text: timestamps are UTC ISO-8601, calendar days are YYYY-MM-DD.

CREATE TABLE projects (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL,
    color       TEXT    NOT NULL DEFAULT '#4f6bed',
    description TEXT    NOT NULL DEFAULT '',
    archived    INTEGER NOT NULL DEFAULT 0,
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE tasks (
    id           INTEGER PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title        TEXT    NOT NULL,
    description  TEXT    NOT NULL DEFAULT '',
    status       TEXT    NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    priority     TEXT    NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    due_date     TEXT,
    position     INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_tasks_board ON tasks(project_id, status, position);
CREATE INDEX idx_tasks_due ON tasks(due_date);

CREATE TABLE notes (
    id         INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT    NOT NULL DEFAULT '',
    body       TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_notes_project ON notes(project_id);

-- Links only. Deleting a link never deletes the file.
CREATE TABLE file_links (
    id         INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path       TEXT    NOT NULL,
    label      TEXT    NOT NULL DEFAULT '',
    is_dir     INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (project_id, path)
);

-- A pack is one imported folder. Its files are copied into library_path.
-- Deleting a pack row never deletes the files on disk.
CREATE TABLE media_packs (
    id           INTEGER PRIMARY KEY,
    project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    source_path  TEXT    NOT NULL,
    library_path TEXT    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE media_items (
    id         INTEGER PRIMARY KEY,
    pack_id    INTEGER NOT NULL REFERENCES media_packs(id) ON DELETE CASCADE,
    file_name  TEXT    NOT NULL,
    kind       TEXT    NOT NULL CHECK (kind IN ('image', 'video')),
    size_bytes INTEGER NOT NULL,
    mark       TEXT    NOT NULL DEFAULT 'none' CHECK (mark IN ('none', 'use', 'maybe', 'reject')),
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    UNIQUE (pack_id, file_name)
);
CREATE INDEX idx_media_items_pack ON media_items(pack_id, position);

-- Content calendar. A post without a date is an unscheduled idea.
CREATE TABLE posts (
    id         INTEGER PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    title      TEXT    NOT NULL,
    platform   TEXT    NOT NULL CHECK (platform IN ('instagram', 'vk', 'facebook', 'youtube_shorts', 'other')),
    status     TEXT    NOT NULL DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'scheduled', 'posted')),
    date       TEXT,
    time       TEXT,
    caption    TEXT    NOT NULL DEFAULT '',
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
    updated_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX idx_posts_date ON posts(date);

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
