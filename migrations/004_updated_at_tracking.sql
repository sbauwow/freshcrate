-- Track updated_at when new releases are added
CREATE TRIGGER IF NOT EXISTS trg_update_project_timestamp
AFTER INSERT ON releases
BEGIN
  UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.project_id;
END;
