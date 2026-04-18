import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { createTestDb, _resetDb } from "./setup";
import {
  registerAgentManifest,
  verifyAgentManifest,
  revokeAgentManifest,
  getAgentAttestations,
  requireActiveManifestForHighRiskCategory,
  appendAgentActionReceipt,
} from "@/lib/agent-manifest";

let db: Database.Database;

const sampleManifest = {
  schema_version: "1.0.0",
  manifest_id: "mfst_test_manifest_0001",
  agent: {
    agent_id: "agt_test_agent_0001",
    name: "test-agent",
    version: "1.0.0",
  },
  accountability: {
    owner_human_id: "hum_test_owner_0001",
    owner_display: "Owner One",
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
    signed_by: "Owner One",
    signature: "signed_payload_123",
  },
};

beforeEach(() => {
  db = createTestDb();
});

afterEach(() => {
  _resetDb();
});

describe("agent manifest registry", () => {
  it("registers a manifest and verifies as active", () => {
    const out = registerAgentManifest(sampleManifest, {
      owner_attestation: "attest-blob",
    });

    expect(out.manifest_id).toBe(sampleManifest.manifest_id);
    expect(out.status).toBe("active");
    expect(out.accountability_verified).toBe(true);

    const verified = verifyAgentManifest(sampleManifest.manifest_id);
    expect(verified.status).toBe("active");
    expect(verified.signature_valid).toBe(true);
    expect(verified.is_expired).toBe(false);
    expect(verified.is_revoked).toBe(false);
  });

  it("revokes a manifest and marks it revoked in verification", () => {
    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });
    const revoked = revokeAgentManifest(sampleManifest.manifest_id, "policy_violation");
    expect(revoked.status).toBe("revoked");

    const verified = verifyAgentManifest(sampleManifest.manifest_id);
    expect(verified.is_revoked).toBe(true);
    expect(verified.status).toBe("revoked");
  });

  it("lists attestations for an agent", () => {
    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });
    const out = getAgentAttestations(sampleManifest.agent.agent_id);
    expect(out.agent_id).toBe(sampleManifest.agent.agent_id);
    expect(out.history.length).toBe(1);
    expect(out.history[0].manifest_id).toBe(sampleManifest.manifest_id);
  });

  it("enforces active manifest for high-risk category submissions", () => {
    const noManifest = requireActiveManifestForHighRiskCategory("Security", undefined);
    expect(noManifest.allowed).toBe(false);

    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });
    const withManifest = requireActiveManifestForHighRiskCategory("Security", sampleManifest.manifest_id);
    expect(withManifest.allowed).toBe(true);
  });

  it("appends action receipt for active manifest", () => {
    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });

    const out = appendAgentActionReceipt({
      manifest_id: sampleManifest.manifest_id,
      agent_id: sampleManifest.agent.agent_id,
      action_id: "act_123",
      action_type: "tool_execution",
      risk_tier: "high",
      target: "github.com/org/repo",
      policy_decision: "allow",
      outcome: "success",
      input_hash: "sha256:abcdef123456",
      output_hash: "sha256:defabc654321",
      signature: "signature_123",
    });

    expect(out.stored).toBe(true);
    expect(out.receipt_id).toMatch(/^rcpt_/);
  });

  it("rejects receipt append for revoked manifest", () => {
    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });
    revokeAgentManifest(sampleManifest.manifest_id, "owner_request");

    expect(() =>
      appendAgentActionReceipt({
        manifest_id: sampleManifest.manifest_id,
        agent_id: sampleManifest.agent.agent_id,
        action_id: "act_999",
        action_type: "tool_execution",
        risk_tier: "high",
        target: "github.com/org/repo",
        policy_decision: "deny",
        outcome: "blocked",
        signature: "signature_999",
      })
    ).toThrow(/active manifest/i);
  });

  it("rejects receipt append when agent_id does not match manifest owner agent", () => {
    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });

    expect(() =>
      appendAgentActionReceipt({
        manifest_id: sampleManifest.manifest_id,
        agent_id: "agt_other_agent_9999",
        action_id: "act_wrong_agent",
        action_type: "tool_execution",
        risk_tier: "high",
        target: "github.com/org/repo",
        policy_decision: "allow",
        outcome: "success",
        signature: "sig_wrong_agent",
      })
    ).toThrow(/agent_id/i);
  });

  it("rejects receipt append when action risk exceeds manifest risk tier", () => {
    const mediumManifest = {
      ...sampleManifest,
      manifest_id: "mfst_test_manifest_medium_0001",
      agent: {
        ...sampleManifest.agent,
        agent_id: "agt_test_agent_medium_0001",
        name: "test-agent-medium",
      },
      accountability: {
        ...sampleManifest.accountability,
        owner_human_id: "hum_test_owner_medium_0001",
      },
      policy: {
        ...sampleManifest.policy,
        risk_tier: "medium",
      },
    };

    registerAgentManifest(mediumManifest, { owner_attestation: "attest-blob" });

    expect(() =>
      appendAgentActionReceipt({
        manifest_id: mediumManifest.manifest_id,
        agent_id: mediumManifest.agent.agent_id,
        action_id: "act_too_risky",
        action_type: "deployment",
        risk_tier: "high",
        target: "prod-cluster",
        policy_decision: "allow",
        outcome: "success",
        signature: "sig_too_risky",
      })
    ).toThrow(/risk tier/i);
  });

  it("rejects receipt append when enum fields are invalid", () => {
    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });

    expect(() =>
      appendAgentActionReceipt({
        manifest_id: sampleManifest.manifest_id,
        agent_id: sampleManifest.agent.agent_id,
        action_id: "act_invalid_enum",
        action_type: "weird_action" as "tool_execution",
        risk_tier: "high",
        target: "github.com/org/repo",
        policy_decision: "shrug" as "allow",
        outcome: "mystery" as "success",
        signature: "sig_invalid_enum",
      })
    ).toThrow(/action_type|policy_decision|outcome/i);
  });

  it("rejects receipt append when hashes are malformed", () => {
    registerAgentManifest(sampleManifest, { owner_attestation: "attest-blob" });

    expect(() =>
      appendAgentActionReceipt({
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
      })
    ).toThrow(/hash/i);
  });
});
