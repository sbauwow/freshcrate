-- Topic watch: track GitHub topics we poll for new repos
CREATE TABLE IF NOT EXISTS watched_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL UNIQUE,
  last_checked_at TEXT,
  last_repo_pushed_at TEXT,
  repos_found INTEGER NOT NULL DEFAULT 0,
  repos_added INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_watched_topics_topic ON watched_topics(topic);
