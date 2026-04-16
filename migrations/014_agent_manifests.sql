-- Agent identity + accountability manifests and action receipts

CREATE TABLE IF NOT EXISTS agent_manifests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manifest_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  owner_human_id TEXT NOT NULL,
  owner_entity_id TEXT,
  owner_display TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  risk_tier TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  proof_bundle_json TEXT,
  signature_alg TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 0,
  accountability_verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_agent_manifests_agent ON agent_manifests(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_manifests_owner ON agent_manifests(owner_human_id);
CREATE INDEX IF NOT EXISTS idx_agent_manifests_status ON agent_manifests(status);
CREATE INDEX IF NOT EXISTS idx_agent_manifests_expiry ON agent_manifests(expires_at);

CREATE TABLE IF NOT EXISTS agent_action_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT UNIQUE NOT NULL,
  manifest_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  risk_tier TEXT NOT NULL,
  target TEXT,
  policy_decision TEXT NOT NULL,
  outcome TEXT NOT NULL,
  input_hash TEXT,
  output_hash TEXT,
  receipt_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (manifest_id) REFERENCES agent_manifests(manifest_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_receipts_manifest ON agent_action_receipts(manifest_id);
CREATE INDEX IF NOT EXISTS idx_agent_receipts_agent ON agent_action_receipts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_receipts_created ON agent_action_receipts(created_at);
