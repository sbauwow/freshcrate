-- Multi-source ingestion identity + provenance (npm / PyPI / GitHub)

ALTER TABLE projects ADD COLUMN source_type TEXT NOT NULL DEFAULT 'github';
ALTER TABLE projects ADD COLUMN source_package_id TEXT;
ALTER TABLE projects ADD COLUMN source_url TEXT;
ALTER TABLE projects ADD COLUMN canonical_key TEXT;
ALTER TABLE projects ADD COLUMN provenance_json TEXT;
ALTER TABLE projects ADD COLUMN imported_at TEXT;

UPDATE projects
SET imported_at = COALESCE(imported_at, created_at, datetime('now'))
WHERE imported_at IS NULL OR imported_at = '';

CREATE INDEX IF NOT EXISTS idx_projects_source_type ON projects(source_type);
CREATE INDEX IF NOT EXISTS idx_projects_source_package ON projects(source_type, source_package_id);
CREATE INDEX IF NOT EXISTS idx_projects_canonical_key ON projects(canonical_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_source_pkg_unique
  ON projects(source_type, source_package_id)
  WHERE source_package_id IS NOT NULL AND source_package_id != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_canonical_unique
  ON projects(canonical_key)
  WHERE canonical_key IS NOT NULL AND canonical_key != '';
