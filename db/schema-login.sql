-- ---------- brute-force protection ----------
CREATE TABLE IF NOT EXISTS login_attempts (
  ip         TEXT PRIMARY KEY,
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_try   TEXT NOT NULL DEFAULT (datetime('now'))
);
