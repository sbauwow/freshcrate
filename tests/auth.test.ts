import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, _resetDb } from "./setup";
import {
  createApiKey,
  validateApiKey,
  listApiKeys,
  revokeApiKey,
  hasApiKeys,
  extractBearerToken,
} from "@/lib/auth";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("createApiKey", () => {
  it("creates a key with fc_ prefix", () => {
    const { key, id } = createApiKey("test-agent");
    expect(key).toMatch(/^fc_[a-f0-9]{32}$/);
    expect(id).toBeGreaterThan(0);
  });

  it("stores the key in the database", () => {
    createApiKey("my-bot");
    const keys = listApiKeys();
    expect(keys).toHaveLength(1);
    expect(keys[0].name).toBe("my-bot");
    expect(keys[0].key_prefix).toMatch(/^fc_/);
  });
});

describe("validateApiKey", () => {
  it("validates a correct key", () => {
    const { key } = createApiKey("valid-agent");
    const result = validateApiKey(key);
    expect(result.valid).toBe(true);
  });

  it("rejects an invalid key", () => {
    const result = validateApiKey("fc_invalid_key_here_1234567890ab");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe("Invalid API key");
  });

  it("rejects a revoked key", () => {
    const { key, id } = createApiKey("revoke-me");
    revokeApiKey(id);
    const result = validateApiKey(key);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("revoked");
  });

  it("enforces rate limits", () => {
    const { key } = createApiKey("rate-test", 3);

    // First 3 should succeed
    expect(validateApiKey(key).valid).toBe(true);
    expect(validateApiKey(key).valid).toBe(true);
    expect(validateApiKey(key).valid).toBe(true);

    // 4th should fail
    const result = validateApiKey(key);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toContain("Rate limit");
  });
});

describe("hasApiKeys", () => {
  it("returns false when no keys exist", () => {
    expect(hasApiKeys()).toBe(false);
  });

  it("returns true when active keys exist", () => {
    createApiKey("some-agent");
    expect(hasApiKeys()).toBe(true);
  });

  it("returns false when all keys are revoked", () => {
    const { id } = createApiKey("revoked-agent");
    revokeApiKey(id);
    expect(hasApiKeys()).toBe(false);
  });
});

describe("revokeApiKey", () => {
  it("revokes an existing key", () => {
    const { id } = createApiKey("to-revoke");
    expect(revokeApiKey(id)).toBe(true);
  });

  it("returns false for nonexistent key", () => {
    expect(revokeApiKey(999)).toBe(false);
  });

  it("returns false for already revoked key", () => {
    const { id } = createApiKey("double-revoke");
    revokeApiKey(id);
    expect(revokeApiKey(id)).toBe(false);
  });
});

describe("extractBearerToken", () => {
  it("extracts token from Bearer header", () => {
    expect(extractBearerToken("Bearer fc_abc123")).toBe("fc_abc123");
  });

  it("handles case insensitive Bearer", () => {
    expect(extractBearerToken("bearer fc_abc123")).toBe("fc_abc123");
  });

  it("returns null for missing header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for non-Bearer auth", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });
});

describe("listApiKeys", () => {
  it("lists keys without exposing hashes", () => {
    createApiKey("agent-1");
    createApiKey("agent-2");
    const keys = listApiKeys();
    expect(keys).toHaveLength(2);
    // Should NOT have key_hash field
    for (const k of keys) {
      expect(k).not.toHaveProperty("key_hash");
      expect(k).toHaveProperty("key_prefix");
      expect(k).toHaveProperty("name");
    }
  });
});
