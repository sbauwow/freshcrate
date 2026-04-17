import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { createTestDb, insertTestProject, _resetDb } from "./setup";
import { GET as getRecommend } from "@/app/api/agent/recommend/route";
import { GET as getCompare } from "@/app/api/agent/compare/route";
import { GET as getPreflight } from "@/app/api/agent/preflight/route";
import { POST as postDecision } from "@/app/api/agent/decision/route";

let db: Database.Database;

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("agent decision api", () => {
  it("returns 400 when recommend is missing task", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/agent/recommend");
    const response = await getRecommend(request);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/task/i) });
  });

  it("returns 404 when compare target is missing", async () => {
    insertTestProject(db, { name: "present-one", category: "AI Agents", tags: ["agent"] });

    const request = new NextRequest("https://freshcrate.ai/api/agent/compare?a=present-one&b=missing-one&task=agent");
    const response = await getCompare(request);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/must exist/i) });
  });

  it("returns 404 preflight payload for unknown project", async () => {
    const request = new NextRequest("https://freshcrate.ai/api/agent/preflight?name=missing-one");
    const response = await getPreflight(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.preflight.status).toBe("missing");
    expect(data.preflight.exists).toBe(false);
  });

  it("normalizes composite decision body booleans and string limit", async () => {
    const secureId = insertTestProject(db, {
      name: "secure-agent",
      category: "AI Agents",
      short_desc: "verified local agent",
      tags: ["agent", "local", "security"],
    });
    const backupId = insertTestProject(db, {
      name: "backup-agent",
      category: "AI Agents",
      short_desc: "another verified local agent",
      tags: ["agent", "local", "security"],
    });
    const noisyId = insertTestProject(db, {
      name: "noisy-agent",
      category: "AI Agents",
      short_desc: "unverified noisy agent",
      tags: ["agent", "cloud"],
    });

    db.prepare("UPDATE projects SET verified = 1, stars = 120, language = 'TypeScript' WHERE id = ?").run(secureId);
    db.prepare("UPDATE projects SET verified = 1, stars = 100, language = 'TypeScript' WHERE id = ?").run(backupId);
    db.prepare("UPDATE projects SET verified = 0, stars = 90, language = 'TypeScript' WHERE id = ?").run(noisyId);

    const request = new NextRequest("https://freshcrate.ai/api/agent/decision", {
      method: "POST",
      body: JSON.stringify({
        mode: "recommend",
        task: "security agent",
        verified_only: "true",
        require_accountability: "false",
        limit: "1",
      }),
      headers: { "content-type": "application/json" },
    });

    const response = await postDecision(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.mode).toBe("recommend");
    expect(data.result).toHaveLength(1);
    expect(data.result[0].name).toBe("secure-agent");
  });

  it("surfaces accountability metadata in recommend api payloads", async () => {
    insertTestProject(db, {
      name: "accountable-agent",
      category: "AI Agents",
      short_desc: "Accountable",
      tags: ["agent"],
    });

    const register = await import("@/app/api/agents/register-manifest/route");
    await register.POST(
      new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          manifest: {
            schema_version: "1.0.0",
            manifest_id: "mfst_acc_api_surface_123456",
            agent: { agent_id: "agt_acc_api_surface_123456", name: "accountable-agent", version: "1.2.3" },
            accountability: {
              owner_human_id: "hum_acc_api_surface_123456",
              owner_display: "API Surface Owner",
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
          proof_bundle: { owner_attestation: "attest" },
        }),
      })
    );

    const response = await getRecommend(
      new NextRequest("https://freshcrate.ai/api/agent/recommend?task=agent&category=AI%20Agents&limit=5")
    );
    const data = await response.json();
    const rec = data.recommendations.find((item: { name: string }) => item.name === "accountable-agent");

    expect(response.status).toBe(200);
    expect(rec.accountability.has_manifest).toBe(true);
    expect(rec.accountability.manifest_id).toBe("mfst_acc_api_surface_123456");
    expect(rec.accountability.owner_display).toBe("API Surface Owner");
    expect(rec.accountability.risk_tier).toBe("medium");
  });

  it("surfaces accountability metadata in compare and preflight api payloads", async () => {
    insertTestProject(db, {
      name: "accountable-compare-agent",
      category: "AI Agents",
      short_desc: "Accountable",
      tags: ["agent", "security"],
    });
    insertTestProject(db, {
      name: "plain-compare-agent",
      category: "AI Agents",
      short_desc: "Plain",
      tags: ["agent", "security"],
    });

    const register = await import("@/app/api/agents/register-manifest/route");
    await register.POST(
      new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          manifest: {
            schema_version: "1.0.0",
            manifest_id: "mfst_compare_api_surface_123456",
            agent: { agent_id: "agt_compare_api_surface_123456", name: "accountable-compare-agent", version: "1.0.0" },
            accountability: {
              owner_human_id: "hum_compare_api_surface_123456",
              owner_display: "Compare API Owner",
              escalation: { email: "owner@example.com" },
            },
            policy: { risk_tier: "high", allowed_actions: ["read"], prohibited_actions: [] },
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
          proof_bundle: { owner_attestation: "attest" },
        }),
      })
    );

    const compareResponse = await getCompare(
      new NextRequest(
        "https://freshcrate.ai/api/agent/compare?a=accountable-compare-agent&b=plain-compare-agent&task=security+agent"
      )
    );
    const compareData = await compareResponse.json();

    expect(compareResponse.status).toBe(200);
    expect(compareData.comparison.accountability.projectA.has_manifest).toBe(true);
    expect(compareData.comparison.accountability.projectB.has_manifest).toBe(false);
    expect(compareData.comparison.accountability.preferred).toBe("accountable-compare-agent");

    const preflightResponse = await getPreflight(
      new NextRequest("https://freshcrate.ai/api/agent/preflight?name=accountable-compare-agent")
    );
    const preflightData = await preflightResponse.json();

    expect(preflightResponse.status).toBe(200);
    expect(preflightData.preflight.accountability.has_manifest).toBe(true);
    expect(preflightData.preflight.accountability.manifest_id).toBe("mfst_compare_api_surface_123456");
    expect(preflightData.preflight.accountability.owner_display).toBe("Compare API Owner");
  });
});
