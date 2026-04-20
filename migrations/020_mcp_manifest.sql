-- MCP compatibility matrix: transport, auth, runtime, hosting signals
ALTER TABLE projects ADD COLUMN mcp_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE projects ADD COLUMN mcp_detected_at TEXT;
