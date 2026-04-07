-- Add readme_text column (plain text extracted from readme_html) and include in FTS5

-- Plain-text README for full-text search (no HTML noise)
ALTER TABLE projects ADD COLUMN readme_text TEXT NOT NULL DEFAULT '';

-- Rebuild FTS5 index to include readme_text
-- Drop and recreate since FTS5 columns can't be altered in-place
DROP TRIGGER IF EXISTS projects_fts_insert;
DROP TRIGGER IF EXISTS projects_fts_update;
DROP TRIGGER IF EXISTS projects_fts_delete;
DROP TABLE IF EXISTS projects_fts;

CREATE VIRTUAL TABLE projects_fts USING fts5(
  name,
  short_desc,
  description,
  readme_text,
  content=projects,
  content_rowid=id
);

-- Sync triggers — now include readme_text
CREATE TRIGGER projects_fts_insert AFTER INSERT ON projects BEGIN
  INSERT INTO projects_fts(rowid, name, short_desc, description, readme_text)
  VALUES (new.id, new.name, new.short_desc, new.description, new.readme_text);
END;

CREATE TRIGGER projects_fts_update AFTER UPDATE ON projects BEGIN
  INSERT INTO projects_fts(projects_fts, rowid, name, short_desc, description, readme_text)
  VALUES ('delete', old.id, old.name, old.short_desc, old.description, old.readme_text);
  INSERT INTO projects_fts(rowid, name, short_desc, description, readme_text)
  VALUES (new.id, new.name, new.short_desc, new.description, new.readme_text);
END;

CREATE TRIGGER projects_fts_delete AFTER DELETE ON projects BEGIN
  INSERT INTO projects_fts(projects_fts, rowid, name, short_desc, description, readme_text)
  VALUES ('delete', old.id, old.name, old.short_desc, old.description, old.readme_text);
END;

-- Populate readme_text from existing readme_html (strip HTML tags via replace cascade)
-- SQLite doesn't have regex replace, so we do a basic tag strip
-- The real strip happens in enrich.mjs; this is a rough initial fill
UPDATE projects SET readme_text = replace(replace(replace(replace(replace(
  replace(replace(replace(replace(replace(
    readme_html,
    '<br>', ' '), '<br/>', ' '), '<br />', ' '), '<p>', ' '), '</p>', ' '),
    '<li>', ' '), '</li>', ' '), '<h1>', ' '), '<h2>', ' '), '<h3>', ' ')
WHERE readme_text = '' AND readme_html IS NOT NULL AND readme_html != '';

-- Rebuild FTS index
INSERT INTO projects_fts(projects_fts) VALUES('rebuild');
