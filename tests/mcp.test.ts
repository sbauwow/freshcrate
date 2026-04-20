import { detectMcpManifest, looksLikeMcpServer } from "../scripts/lib/mcp-detect.mjs";
import { describe, it, expect } from "vitest";

describe("looksLikeMcpServer", () => {
  it("matches explicit MCP mentions", () => {
    expect(looksLikeMcpServer({ name: "mcp-github", short_desc: "", description: "", category: "", tags: "" })).toBe(true);
    expect(looksLikeMcpServer({ name: "x", short_desc: "", description: "model context protocol server", category: "", tags: "" })).toBe(true);
  });

  it("rejects non-MCP packages", () => {
    expect(looksLikeMcpServer({ name: "http-server", short_desc: "an http server", description: "", category: "Infrastructure", tags: "" })).toBe(false);
  });
});

describe("detectMcpManifest", () => {
  it("detects stdio transport by default for MCP packages", () => {
    const m = detectMcpManifest({
      name: "mcp-files",
      short_desc: "MCP server for file ops",
      description: "",
      readme_text: "install via npx",
      category: "MCP Servers",
      language: "TypeScript",
    });
    expect(m).not.toBeNull();
    expect(m!.transports).toContain("stdio");
    expect(m!.runtime).toContain("npx");
  });

  it("extracts transports from readme", () => {
    const m = detectMcpManifest({
      name: "mcp-api",
      short_desc: "",
      description: "MCP server",
      readme_text: "Supports streamable HTTP transport, SSE, and WebSocket. Uses OAuth for auth.",
      category: "MCP Servers",
      language: "",
    });
    expect(m).not.toBeNull();
    expect(m!.transports).toEqual(expect.arrayContaining(["http", "sse", "websocket"]));
    expect(m!.auth).toContain("oauth");
  });

  it("returns null for non-MCP packages", () => {
    const m = detectMcpManifest({
      name: "redis",
      short_desc: "a cache",
      description: "",
      readme_text: "supports http endpoint",
      category: "Databases",
      language: "C",
    });
    expect(m).toBeNull();
  });
});
