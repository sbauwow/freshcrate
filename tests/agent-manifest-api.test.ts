import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import Database from "better-sqlite3";
import { createTestDb, _resetDb } from "./setup";
import { POST as registerManifest } from "@/app/api/agents/register-manifest/route";
import { POST as verifyManifest } from "@/app/api/agents/verify-manifest/route";
import { POST as revokeManifest } from "@/app/api/agents/revoke-manifest/route";
import { GET as getAttestations } from "@/app/api/agents/[agent_id]/attestations/route";
import { POST as appendReceipt } from "@/app/api/agents/receipt/route";
import { POST as submitProject } from "@/app/api/projects/route";

let db: Database.Database;

const sampleManifest = {
  schema_version: "1.0.0",
  manifest_id: "mfst_api_manifest_0001",
  agent: {
    agent_id: "agt_api_agent_0001",
    name: "api-agent",
    version: "1.0.0",
  },
  accountability: {
    owner_human_id: "hum_api_owner_0001",
    owner_display: "Owner API",
    escalation: { email: "owner@example.com" },
  },
  policy: {
    risk_tier: "high",
    allowed_actions: ["read", "write"],
    prohibited_actions: ["delete-prod"],
  },
  auth: {
    credential_sources: ["api_key"],
    signing_keys: [{ kid: "k1", alg: "Ed25519", public_key_pem: "-----BEGIN PUBLIC KEY-----abc-----END PUBLIC KEY-----" }],
  },
  runtime: {
    execution_modes: ["cloud"],
  },
  attestation: {
    issued_at: "2026-04-16T00:00:00Z",
    expires_at: "2027-04-16T00:00:00Z",
    signed_by: "Owner API",
    signature: "signed_payload_api_123",
  },
};

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("agent manifest api", () => {
  it("registers, verifies, lists attestations, and revokes a manifest", async () => {
    const registerReq = new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manifest: sampleManifest, proof_bundle: { owner_attestation: "attest-blob" } }),
    });
    const registerRes = await registerManifest(registerReq);
    expect(registerRes.status).toBe(201);

    const verifyReq = new NextRequest("https://freshcrate.ai/api/agents/verify-manifest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manifest_id: sampleManifest.manifest_id }),
    });
    const verifyRes = await verifyManifest(verifyReq);
    const verifyData = await verifyRes.json();
    expect(verifyRes.status).toBe(200);
    expect(verifyData.status).toBe("active");

    const attestReq = new NextRequest("https://freshcrate.ai/api/agents/agt_api_agent_0001/attestations");
    const attestRes = await getAttestations(attestReq, { params: Promise.resolve({ agent_id: sampleManifest.agent.agent_id }) });
    const attestData = await attestRes.json();
    expect(attestRes.status).toBe(200);
    expect(attestData.current_manifest_id).toBe(sampleManifest.manifest_id);
    expect(attestData.history).toHaveLength(1);

    const revokeReq = new NextRequest("https://freshcrate.ai/api/agents/revoke-manifest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ manifest_id: sampleManifest.manifest_id, reason: "owner_request" }),
    });
    const revokeRes = await revokeManifest(revokeReq);
    const revokeData = await revokeRes.json();
    expect(revokeRes.status).toBe(200);
    expect(revokeData.status).toBe("revoked");
  });

  it("rejects receipt append when agent_id does not match manifest agent", async () => {
    await registerManifest(
      new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifest: sampleManifest, proof_bundle: { owner_attestation: "attest-blob" } }),
      })
    );

    const receiptReq = new NextRequest("https://freshcrate.ai/api/agents/receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        manifest_id: sampleManifest.manifest_id,
        agent_id: "agt_other_agent_9999",
        action_id: "act_mismatch",
        action_type: "tool_execution",
        risk_tier: "high",
        target: "github.com/org/repo",
        policy_decision: "allow",
        outcome: "success",
        signature: "sig_mismatch",
      }),
    });

    const receiptRes = await appendReceipt(receiptReq);
    const receiptData = await receiptRes.json();
    expect(receiptRes.status).toBe(400);
    expect(receiptData.error).toMatch(/agent_id/i);
  });

  it("rejects receipt append when action risk exceeds manifest risk tier", async () => {
    const mediumManifest = {
      ...sampleManifest,
      manifest_id: "mfst_api_manifest_medium_0001",
      agent: {
        ...sampleManifest.agent,
        agent_id: "agt_api_agent_medium_0001",
        name: "api-agent-medium",
      },
      accountability: {
        ...sampleManifest.accountability,
        owner_human_id: "hum_api_owner_medium_0001",
      },
      policy: {
        ...sampleManifest.policy,
        risk_tier: "medium",
      },
    };

    await registerManifest(
      new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifest: mediumManifest, proof_bundle: { owner_attestation: "attest-blob" } }),
      })
    );

    const receiptReq = new NextRequest("https://freshcrate.ai/api/agents/receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        manifest_id: mediumManifest.manifest_id,
        agent_id: mediumManifest.agent.agent_id,
        action_id: "act_too_risky",
        action_type: "deployment",
        risk_tier: "high",
        target: "prod-cluster",
        policy_decision: "allow",
        outcome: "success",
        signature: "sig_too_risky",
      }),
    });

    const receiptRes = await appendReceipt(receiptReq);
    const receiptData = await receiptRes.json();
    expect(receiptRes.status).toBe(400);
    expect(receiptData.error).toMatch(/risk tier/i);
  });

  it("rejects receipt append when enum fields are invalid", async () => {
    await registerManifest(
      new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifest: sampleManifest, proof_bundle: { owner_attestation: "attest-blob" } }),
      })
    );

    const receiptReq = new NextRequest("https://freshcrate.ai/api/agents/receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        manifest_id: sampleManifest.manifest_id,
        agent_id: sampleManifest.agent.agent_id,
        action_id: "act_invalid_enum",
        action_type: "weird_action",
        risk_tier: "high",
        target: "github.com/org/repo",
        policy_decision: "shrug",
        outcome: "mystery",
        signature: "sig_invalid_enum",
      }),
    });

    const receiptRes = await appendReceipt(receiptReq);
    const receiptData = await receiptRes.json();
    expect(receiptRes.status).toBe(400);
    expect(receiptData.error).toMatch(/action_type|policy_decision|outcome/i);
  });

  it("rejects receipt append when hashes are malformed", async () => {
    await registerManifest(
      new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifest: sampleManifest, proof_bundle: { owner_attestation: "attest-blob" } }),
      })
    );

    const receiptReq = new NextRequest("https://freshcrate.ai/api/agents/receipt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        manifest_id: sampleManifest.manifest_id,
        agent_id: sampleManifest.agent.agent_id,
        action_id: "act_bad_hash",
        action_type: "tool_execution",
        risk_tier: "high",
        target: "github.com/org/repo",
        policy_decision: "allow",
        outcome: "success",
        input_hash: "abc123",
        output_hash: "sha256:",
        signature: "sig_bad_hash",
      }),
    });

    const receiptRes = await appendReceipt(receiptReq);
    const receiptData = await receiptRes.json();
    expect(receiptRes.status).toBe(400);
    expect(receiptData.error).toMatch(/hash/i);
  });

  it("enforces x-manifest-id on high-risk package submission", async () => {
    const body = {
      name: "secure-package",
      short_desc: "security tool",
      version: "1.0.0",
      author: "Steve",
      category: "Security",
      tags: ["security"],
    };

    const blockedReq = new NextRequest("https://freshcrate.ai/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const blockedRes = await submitProject(blockedReq);
    expect(blockedRes.status).toBe(403);

    await registerManifest(
      new NextRequest("https://freshcrate.ai/api/agents/register-manifest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manifest: sampleManifest, proof_bundle: { owner_attestation: "attest-blob" } }),
      })
    );

    const allowedReq = new NextRequest("https://freshcrate.ai/api/projects", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-manifest-id": sampleManifest.manifest_id,
      },
      body: JSON.stringify({ ...body, name: "secure-package-2" }),
    });
    const allowedRes = await submitProject(allowedReq);
    expect(allowedRes.status).toBe(201);
  });
});
