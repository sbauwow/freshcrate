-- API request log for analytics and debugging
CREATE TABLE IF NOT EXISTS request_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  ip TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  api_key_prefix TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_request_log_created ON request_log(created_at);
CREATE INDEX IF NOT EXISTS idx_request_log_path ON request_log(path);
