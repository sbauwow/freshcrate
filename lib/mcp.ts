import { getDb } from "./db";

export interface MCPManifest {
  transports: string[];
  auth: string[];
  runtime: string[];
  hosting: string[];
  language: string | null;
  detected_at: string;
  source: string;
}

export const MCP_LABELS: Record<string, string> = {
  // transports
  stdio: "stdio",
  http: "HTTP",
  sse: "SSE",
  websocket: "WebSocket",
  // auth
  api_key: "API key",
  oauth: "OAuth",
  bearer: "Bearer token",
  none: "No auth",
  // runtime
  docker: "Docker",
  npx: "npx",
  uvx: "uvx",
  pip: "pip",
  cargo: "cargo",
  "go-install": "go install",
  // hosting
  self_host: "Self-hosted",
  hosted: "Hosted",
};

export function getMCPManifest(projectId: number): MCPManifest | null {
  const db = getDb();
  const row = db
    .prepare("SELECT mcp_json FROM projects WHERE id = ?")
    .get(projectId) as { mcp_json: string } | undefined;

  if (!row || !row.mcp_json || row.mcp_json === "{}") return null;
  try {
    const data = JSON.parse(row.mcp_json) as MCPManifest;
    if (!data.transports) return null;
    return data;
  } catch {
    return null;
  }
}
