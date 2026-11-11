-- ============================================================
--  AlAlfi Secondary School - Cloudflare D1 schema
--  All content + users + sessions live here (server-side only).
-- ============================================================

-- ---------- Admin users ----------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT    NOT NULL DEFAULT '',
  role          TEXT    NOT NULL DEFAULT 'admin',       -- superadmin | admin
  device        TEXT    NOT NULL DEFAULT '',             -- assigned device label
  perms         TEXT    NOT NULL DEFAULT '{}',           -- JSON permission map
  password_hash TEXT    NOT NULL,                        -- SHA-256(salt + password)
  salt          TEXT    NOT NULL,
  last_device   TEXT    NOT NULL DEFAULT '',
  last_login    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Sessions (server-side, expiring) ----------
CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);

-- ---------- Content (single JSON blob per collection) ----------
CREATE TABLE IF NOT EXISTS content (
  key        TEXT PRIMARY KEY,          -- settings | about | news | events | ...
  value      TEXT NOT NULL,             -- JSON
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Optional: change log ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,
  action     TEXT NOT NULL,
  detail     TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
