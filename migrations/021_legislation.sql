-- AI legislation tracker: live multi-jurisdiction ingest
-- Replaces hardcoded lib/legislation.ts list with DB-backed entries
-- ingested by daily cron from UK Parliament, US Congress, US Federal
-- Register, and EUR-Lex. Anchor entries (EU AI Act, EO 14110, Colorado
-- SB24-205) remain hardcoded and merge in at read time.

CREATE TABLE IF NOT EXISTS legislation_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  region TEXT NOT NULL,
  instrument TEXT NOT NULL,
  status TEXT NOT NULL,
  effective_date TEXT,
  themes TEXT NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL DEFAULT '',
  issues TEXT NOT NULL DEFAULT '[]',
  source_url TEXT NOT NULL DEFAULT '',
  last_updated TEXT NOT NULL,
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_legislation_region ON legislation_items(region);
CREATE INDEX IF NOT EXISTS idx_legislation_status ON legislation_items(status);
CREATE INDEX IF NOT EXISTS idx_legislation_source ON legislation_items(source);
CREATE INDEX IF NOT EXISTS idx_legislation_last_updated ON legislation_items(last_updated);
