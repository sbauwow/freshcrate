-- FTS5 full-text search on projects

CREATE VIRTUAL TABLE IF NOT EXISTS projects_fts USING fts5(
  name,
  short_desc,
  description,
  content=projects,
  content_rowid=id
);

-- Keep FTS index in sync with projects table

CREATE TRIGGER IF NOT EXISTS projects_fts_insert AFTER INSERT ON projects BEGIN
  INSERT INTO projects_fts(rowid, name, short_desc, description)
  VALUES (new.id, new.name, new.short_desc, new.description);
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_update AFTER UPDATE ON projects BEGIN
  INSERT INTO projects_fts(projects_fts, rowid, name, short_desc, description)
  VALUES ('delete', old.id, old.name, old.short_desc, old.description);
  INSERT INTO projects_fts(rowid, name, short_desc, description)
  VALUES (new.id, new.name, new.short_desc, new.description);
END;

CREATE TRIGGER IF NOT EXISTS projects_fts_delete AFTER DELETE ON projects BEGIN
  INSERT INTO projects_fts(projects_fts, rowid, name, short_desc, description)
  VALUES ('delete', old.id, old.name, old.short_desc, old.description);
END;

-- Populate FTS from existing data
INSERT INTO projects_fts(projects_fts) VALUES('rebuild');
