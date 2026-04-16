import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, insertTestProject, _resetDb } from "./setup";
import {
  recommendProjectsForAgent,
  compareProjectsForAgent,
  preflightProjectForAgent,
  runAgentDecision,
} from "@/lib/agent-decision";
import { registerAgentManifest } from "@/lib/agent-manifest";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("recommendProjectsForAgent", () => {
  it("ranks category/language/tag matches above weaker matches", () => {
    const top = insertTestProject(db, {
      name: "mcp-guardian",
      category: "MCP Servers",
      short_desc: "Security policy MCP server",
      tags: ["mcp", "security", "policy"],
    });

    const weaker = insertTestProject(db, {
      name: "generic-agent",
      category: "AI Agents",
      short_desc: "General automation",
      tags: ["agent"],
    });

    db.prepare("UPDATE projects SET stars = 250, verified = 1, language = 'TypeScript' WHERE id = ?").run(top);
    db.prepare("UPDATE projects SET stars = 500, verified = 0, language = 'Python' WHERE id = ?").run(weaker);

    const recs = recommendProjectsForAgent({
      task: "need mcp security tooling",
      category: "MCP Servers",
      language: "TypeScript",
      limit: 5,
    });

    expect(recs.length).toBeGreaterThanOrEqual(2);
    expect(recs[0].name).toBe("mcp-guardian");
    expect(recs[0].score).toBeGreaterThan(recs[1].score);
  });

  it("supports verified_only hard filter", () => {
    const verified = insertTestProject(db, {
      name: "verified-sec",
      category: "Security",
      tags: ["security", "local"],
    });
    const unverified = insertTestProject(db, {
      name: "unverified-sec",
      category: "Security",
      tags: ["security", "local"],
    });

    db.prepare("UPDATE projects SET verified = 1, stars = 100, language = 'TypeScript' WHERE id = ?").run(verified);
    db.prepare("UPDATE projects SET verified = 0, stars = 200, language = 'TypeScript' WHERE id = ?").run(unverified);

    const recs = recommendProjectsForAgent({
      task: "security",
      category: "Security",
      language: "TypeScript",
      verified_only: true,
      limit: 10,
    });

    expect(recs.find((r) => r.name === "unverified-sec")).toBeUndefined();
    expect(recs.find((r) => r.name === "verified-sec")).toBeDefined();
  });

  it("boosts local runtime-compatible packages when runtime=local", () => {
    const local = insertTestProject(db, {
      name: "local-runner",
      category: "AI Agents",
      short_desc: "Local self-hosted runner",
      tags: ["local", "self-hosted", "agent"],
    });
    const cloud = insertTestProject(db, {
      name: "cloud-runner",
      category: "AI Agents",
      short_desc: "Hosted serverless runner",
      tags: ["cloud", "serverless", "agent"],
    });

    db.prepare("UPDATE projects SET stars = 50, verified = 1, language = 'TypeScript' WHERE id = ?").run(local);
    db.prepare("UPDATE projects SET stars = 50, verified = 1, language = 'TypeScript' WHERE id = ?").run(cloud);

    const recs = recommendProjectsForAgent({
      task: "run agent",
      runtime: "local",
      risk_tolerance: "medium",
      limit: 5,
    });

    const localRank = recs.findIndex((r) => r.name === "local-runner");
    const cloudRank = recs.findIndex((r) => r.name === "cloud-runner");
    expect(localRank).toBeGreaterThanOrEqual(0);
    expect(cloudRank).toBeGreaterThanOrEqual(0);
    expect(localRank).toBeLessThan(cloudRank);
  });

  it("prefers reliability-calibrated packages when intent is otherwise equal", () => {
    const robust = insertTestProject(db, {
      name: "robust-agent",
      category: "AI Agents",
      short_desc: "Agent runtime",
      tags: ["agent", "runtime"],
    });
    const fragile = insertTestProject(db, {
      name: "fragile-agent",
      category: "AI Agents",
      short_desc: "Agent runtime",
      tags: ["agent", "runtime"],
    });

    db.prepare("UPDATE projects SET stars = 80, verified = 1, language = 'TypeScript' WHERE id = ?").run(robust);
    db.prepare("UPDATE projects SET stars = 80, verified = 1, language = 'TypeScript' WHERE id = ?").run(fragile);

    db.prepare(
      "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.1.0', '', 'Low', datetime('now','-7 day'))"
    ).run(robust);
    db.prepare(
      "INSERT INTO releases (project_id, version, changes, urgency, created_at) VALUES (?, '1.2.0', '', 'Low', datetime('now','-1 day'))"
    ).run(robust);

    db.prepare(
      "UPDATE projects SET verification_json = ?, deps_audit_json = ?, deps_scanned_at = datetime('now') WHERE id = ?"
    ).run(
      JSON.stringify({ score: 0.95, checks_passed: 12, checks_failed: 0 }),
      JSON.stringify({ disallowed_count: 0, unknown_ratio: 0.05 }),
      robust
    );

    db.prepare(
      "UPDATE projects SET verification_json = ?, deps_audit_json = ?, deps_scanned_at = datetime('now') WHERE id = ?"
    ).run(
      JSON.stringify({ score: 0.4, checks_passed: 5, checks_failed: 7 }),
      JSON.stringify({ disallowed_count: 3, unknown_ratio: 0.8 }),
      fragile
    );

    const recs = recommendProjectsForAgent({
      task: "agent runtime",
      category: "AI Agents",
      language: "TypeScript",
      risk_tolerance: "low",
      limit: 5,
    });

    const robustRank = recs.findIndex((r) => r.name === "robust-agent");
    const fragileRank = recs.findIndex((r) => r.name === "fragile-agent");
    expect(robustRank).toBeGreaterThanOrEqual(0);
    expect(fragileRank).toBeGreaterThanOrEqual(0);
    expect(robustRank).toBeLessThan(fragileRank);
  });

  it("filters to accountable agents when require_accountability=true", () => {
    insertTestProject(db, {
      name: "accountable-agent",
      category: "AI Agents",
      short_desc: "Accountable",
      tags: ["agent"],
    });
    insertTestProject(db, {
      name: "unaccountable-agent",
      category: "AI Agents",
      short_desc: "No manifest",
      tags: ["agent"],
    });

    registerAgentManifest(
      {
        schema_version: "1.0.0",
        manifest_id: "mfst_acc_test_123456",
        agent: { agent_id: "agt_acc_test_123456", name: "accountable-agent", version: "1.0.0" },
        accountability: {
          owner_human_id: "hum_acc_test_123456",
          owner_display: "Owner",
          escalation: { email: "owner@example.com" },
        },
        policy: { risk_tier: "medium", allowed_actions: ["read"], prohibited_actions: [] },
        auth: {
          credential_sources: ["api_key"],
          signing_keys: [{ kid: "k1", alg: "Ed25519", public_key_pem: "-----BEGIN PUBLIC KEY-----abc-----END PUBLIC KEY-----" }],
        },
        runtime: { execution_modes: ["cloud"] },
        attestation: {
          issued_at: "2026-04-16T00:00:00Z",
          expires_at: "2027-04-16T00:00:00Z",
          signed_by: "Owner",
          signature: "signed_payload_123",
        },
      },
      { owner_attestation: "attest" }
    );

    const recs = recommendProjectsForAgent({
      task: "agent",
      category: "AI Agents",
      require_accountability: true,
      limit: 10,
    });

    expect(recs.find((r) => r.name === "accountable-agent")).toBeDefined();
    expect(recs.find((r) => r.name === "unaccountable-agent")).toBeUndefined();
  });
});

describe("compareProjectsForAgent", () => {
  it("returns winner and score delta for two projects", () => {
    const a = insertTestProject(db, {
      name: "alpha-sec",
      category: "Security",
      tags: ["security", "audit"],
    });
    const b = insertTestProject(db, {
      name: "beta-tool",
      category: "Developer Tools",
      tags: ["cli"],
    });

    db.prepare("UPDATE projects SET stars = 300, verified = 1, language = 'TypeScript' WHERE id = ?").run(a);
    db.prepare("UPDATE projects SET stars = 10, verified = 0, language = 'Python' WHERE id = ?").run(b);

    const out = compareProjectsForAgent("alpha-sec", "beta-tool", {
      task: "security",
      category: "Security",
      language: "TypeScript",
    });

    expect(out.winner).toBe("alpha-sec");
    expect(out.score_delta).toBeGreaterThan(0);
    expect(out.projectA.name).toBe("alpha-sec");
    expect(out.projectB.name).toBe("beta-tool");
  });
});

describe("preflightProjectForAgent", () => {
  it("flags risky project when key readiness checks fail", () => {
    const id = insertTestProject(db, {
      name: "risky-one",
      repo_url: "",
      homepage_url: "",
      license: "",
    });

    db.prepare("UPDATE projects SET stars = 0, verified = 0 WHERE id = ?").run(id);

    const out = preflightProjectForAgent("risky-one");

    expect(out.exists).toBe(true);
    expect(out.status).toBe("risky");
    expect(out.summary.fail).toBeGreaterThan(0);
    expect(out.checks.some((c) => c.key === "repo_url" && c.ok === false)).toBe(true);
  });

  it("returns missing status for unknown project", () => {
    const out = preflightProjectForAgent("does-not-exist");
    expect(out.exists).toBe(false);
    expect(out.status).toBe("missing");
  });
});

describe("runAgentDecision", () => {
  it("routes recommend mode", () => {
    const id = insertTestProject(db, { name: "decider", category: "AI Agents", tags: ["agent"] });
    db.prepare("UPDATE projects SET verified = 1, stars = 99, language = 'TypeScript' WHERE id = ?").run(id);

    const out = runAgentDecision({
      mode: "recommend",
      task: "agent",
      limit: 3,
      verified_only: true,
    });

    expect(out.mode).toBe("recommend");
    expect(Array.isArray(out.result)).toBe(true);
  });

  it("throws on invalid mode", () => {
    expect(() =>
      runAgentDecision({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mode: "wat" as any,
      })
    ).toThrow(/Invalid decision mode/i);
  });
});
