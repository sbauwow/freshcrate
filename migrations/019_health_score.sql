-- Health/trust composite score: transparent per-factor breakdown
ALTER TABLE projects ADD COLUMN health_score INTEGER;
ALTER TABLE projects ADD COLUMN health_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE projects ADD COLUMN health_computed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_health_score ON projects(health_score);
