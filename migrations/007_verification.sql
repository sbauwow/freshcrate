-- Package verification: machine-checkable trust signals
ALTER TABLE projects ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN verification_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE projects ADD COLUMN verified_at TEXT;
ALTER TABLE projects ADD COLUMN submitted_by_key TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_projects_verified ON projects(verified);
