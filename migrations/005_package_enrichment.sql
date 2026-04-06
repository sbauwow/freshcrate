-- Package enrichment: stars, forks, language, README cache, similar packages
ALTER TABLE projects ADD COLUMN stars INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN forks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE projects ADD COLUMN language TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN readme_html TEXT NOT NULL DEFAULT '';
ALTER TABLE projects ADD COLUMN readme_fetched_at TEXT;
ALTER TABLE projects ADD COLUMN last_github_sync TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_stars ON projects(stars DESC);
