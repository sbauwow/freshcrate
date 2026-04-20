// MCP compatibility detection: scan readme text for transport/auth/runtime/hosting.
// Produces a manifest of inferred capabilities. Explicit manifests (from submit
// form) should always override detected values.

const TRANSPORT_PATTERNS = [
  { id: "stdio", re: /\b(stdio|standard\s*(input|i\/o))\b/i },
  { id: "http", re: /\b(streamable\s+http|http\s+transport|http\s+endpoint)\b/i },
  { id: "sse", re: /\b(sse|server[-\s]?sent\s+events)\b/i },
  { id: "websocket", re: /\b(websocket|\bws:\/\/|\bwss:\/\/)\b/i },
];

const AUTH_PATTERNS = [
  { id: "api_key", re: /\bapi[-_\s]?key(s)?\b/i },
  { id: "oauth", re: /\boauth(2)?\b/i },
  { id: "bearer", re: /\bbearer\s+token\b/i },
  { id: "none", re: /\b(no\s+auth|without\s+auth|unauthenticated)\b/i },
];

const RUNTIME_PATTERNS = [
  { id: "docker", re: /\b(docker|dockerfile|container)\b/i },
  { id: "npx", re: /\bnpx\b/i },
  { id: "uvx", re: /\buvx\b/i },
  { id: "pip", re: /\bpip\s+install\b/i },
  { id: "cargo", re: /\bcargo\s+install\b/i },
  { id: "go-install", re: /\bgo\s+install\b/i },
];

const HOSTING_PATTERNS = [
  { id: "self_host", re: /\b(self[-\s]?host|host\s+yourself|on[-\s]?prem)\b/i },
  { id: "hosted", re: /\b(hosted\s+service|managed\s+service|\bsaas\b|cloud\s+hosted)\b/i },
];

function matches(text, patterns) {
  return patterns.filter((p) => p.re.test(text)).map((p) => p.id);
}

// Heuristic MCP server indicator: need at least one hint that this package is
// actually an MCP server. Otherwise non-MCP packages pick up false matches.
export function looksLikeMcpServer(project) {
  const hay = `${project.name} ${project.short_desc} ${project.description} ${project.category} ${project.tags || ""}`;
  return /\bmcp\b/i.test(hay) || /model\s*context\s*protocol/i.test(hay);
}

export function detectMcpManifest(project) {
  if (!looksLikeMcpServer(project)) return null;

  const corpus = [
    project.short_desc || "",
    project.description || "",
    project.readme_text || "",
  ].join("\n");

  const manifest = {
    transports: matches(corpus, TRANSPORT_PATTERNS),
    auth: matches(corpus, AUTH_PATTERNS),
    runtime: matches(corpus, RUNTIME_PATTERNS),
    hosting: matches(corpus, HOSTING_PATTERNS),
    language: project.language || null,
    detected_at: new Date().toISOString(),
    source: "readme-heuristic",
  };

  // Default: if a package reads as MCP but no transport mentioned,
  // stdio is the protocol default.
  if (manifest.transports.length === 0) manifest.transports.push("stdio");

  return manifest;
}
