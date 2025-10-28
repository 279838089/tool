-- D1 schema initialization for auth + invite codes

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  code TEXT PRIMARY KEY,
  used INTEGER NOT NULL DEFAULT 0,
  used_by TEXT,
  used_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 初始化 10 个邀请码
INSERT OR IGNORE INTO invites (code) VALUES
  ('WXCODE-01-ALPHA'),
  ('WXCODE-02-BETA'),
  ('WXCODE-03-GAMMA'),
  ('WXCODE-04-DELTA'),
  ('WXCODE-05-EPS'),
  ('WXCODE-06-ZETA'),
  ('WXCODE-07-ETA'),
  ('WXCODE-08-THETA'),
  ('WXCODE-09-IOTA'),
  ('WXCODE-10-KAPPA');
