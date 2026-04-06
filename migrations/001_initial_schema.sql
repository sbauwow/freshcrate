-- Initial schema: projects, releases, tags tables and indexes

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  short_desc TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  homepage_url TEXT NOT NULL DEFAULT '',
  repo_url TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT 'MIT',
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  author TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  version TEXT NOT NULL,
  changes TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT 'Low',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id),
  tag TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_unique ON tags(project_id, tag);
CREATE INDEX IF NOT EXISTS idx_releases_project ON releases(project_id);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_releases_created ON releases(created_at);
