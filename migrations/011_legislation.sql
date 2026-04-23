-- Legislation tracker tables

CREATE TABLE IF NOT EXISTS legislation (
  id TEXT PRIMARY KEY,
  jurisdiction TEXT NOT NULL,
  region TEXT NOT NULL,
  instrument TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_force', 'approved_not_effective', 'in_negotiation', 'proposed', 'paused_or_blocked')),
  effective_date TEXT,
  themes TEXT NOT NULL DEFAULT '[]',        -- JSON array
  summary TEXT NOT NULL,
  issues TEXT NOT NULL DEFAULT '[]',        -- JSON array
  source_url TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  auto_source TEXT,                          -- which feed/scraper found this
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS governance_issues (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'regional', 'national')),
  regions TEXT NOT NULL DEFAULT '[]',        -- JSON array
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  why_it_matters TEXT NOT NULL,
  signals_to_watch TEXT NOT NULL DEFAULT '[]', -- JSON array
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS legislation_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  feed_url TEXT NOT NULL UNIQUE,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('rss', 'atom', 'api')),
  region TEXT,
  keywords TEXT NOT NULL DEFAULT '[]',       -- JSON array of terms to match
  last_fetched_at TEXT,
  last_item_date TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed the RSS/feed sources
INSERT OR IGNORE INTO legislation_sources (name, feed_url, feed_type, region, keywords) VALUES
  ('US Congress - AI Bills', 'https://www.congress.gov/rss/search-results.xml?query=%7B%22source%22%3A%22legislation%22%2C%22search%22%3A%22artificial+intelligence%22%7D', 'rss', 'North America', '["artificial intelligence","AI","machine learning","algorithm"]'),
  ('EUR-Lex - AI Legislation', 'https://eur-lex.europa.eu/EN/display-feed.html?rssId=86', 'rss', 'Europe', '["artificial intelligence","AI act","algorithm","automated decision"]'),
  ('UK Parliament - AI Bills', 'https://bills.parliament.uk/rss/allbills.rss', 'rss', 'Europe', '["artificial intelligence","AI","algorithm","automated"]'),
  ('Canada LEGISinfo', 'https://www.parl.ca/legisinfo/en/rss/bills', 'rss', 'North America', '["artificial intelligence","AI","algorithm","automated decision"]'),
  ('OECD AI Policy Observatory', 'https://oecd.ai/en/feed', 'rss', NULL, '["policy","regulation","governance","legislation"]');
