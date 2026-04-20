ALTER TABLE projects ADD COLUMN language_source TEXT NOT NULL DEFAULT '';

UPDATE projects
SET language_source = CASE
  WHEN source_type IN ('npm', 'pypi') AND COALESCE(language, '') != '' THEN 'registry'
  WHEN COALESCE(language, '') = 'Docs / Meta' THEN 'docs_meta'
  ELSE language_source
END
WHERE COALESCE(language_source, '') = '';

CREATE INDEX IF NOT EXISTS idx_projects_language_source ON projects(language_source);
