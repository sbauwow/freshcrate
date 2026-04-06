-- Dependency tracking and license audit

CREATE TABLE IF NOT EXISTS dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dep_name TEXT NOT NULL,
  dep_version TEXT NOT NULL DEFAULT '*',
  dep_type TEXT NOT NULL DEFAULT 'runtime',   -- runtime, dev, optional, peer
  ecosystem TEXT NOT NULL DEFAULT 'unknown',   -- npm, pypi, cargo, go, unknown
  license TEXT,                                -- SPDX identifier if resolved
  license_category TEXT,                       -- permissive, copyleft, weak_copyleft, unknown
  dep_repo_url TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deps_unique ON dependencies(project_id, ecosystem, dep_name);
CREATE INDEX IF NOT EXISTS idx_deps_project ON dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_deps_license ON dependencies(license_category);

-- License audit results stored per-project
ALTER TABLE projects ADD COLUMN deps_scanned_at TEXT;
ALTER TABLE projects ADD COLUMN deps_audit_json TEXT;
