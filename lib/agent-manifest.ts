import { getDb } from "@/lib/db";

type JsonObject = Record<string, unknown>;

export interface RegisterManifestResult {
  manifest_id: string;
  agent_id: string;
  status: "active";
  accountability_verified: boolean;
  expires_at: string;
}

export interface VerifyManifestResult {
  manifest_id: string;
  status: "active" | "revoked" | "expired" | "missing";
  signature_valid: boolean;
  is_expired: boolean;
  is_revoked: boolean;
  accountability_verified: boolean;
  risk_tier: "low" | "medium" | "high" | "unknown";
}

export interface RevokeManifestResult {
  manifest_id: string;
  status: "revoked";
  revoked_at: string;
}

export interface AgentAttestationHistoryRow {
  manifest_id: string;
  status: string;
  issued_at: string;
  expires_at: string;
  revoked_at: string | null;
  owner_human_id: string;
  owner_display: string;
}

export interface AgentAttestationResult {
  agent_id: string;
  current_manifest_id: string | null;
  history: AgentAttestationHistoryRow[];
}

export interface HighRiskGateResult {
  allowed: boolean;
  reason?: string;
}

export interface AppendAgentActionReceiptInput {
  manifest_id: string;
  agent_id: string;
  action_id: string;
  action_type: string;
  risk_tier: "low" | "medium" | "high";
  target?: string;
  policy_decision: string;
  outcome: string;
  input_hash?: string;
  output_hash?: string;
  signature: string;
}

export interface AppendAgentActionReceiptResult {
  receipt_id: string;
  stored: true;
}

const HIGH_RISK_CATEGORIES = new Set(["Security", "Infrastructure"]);

function asObject(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Manifest must be an object.");
  }
  return value as JsonObject;
}

function readString(obj: JsonObject, key: string, required = true): string {
  const value = obj[key];
  if (value === undefined || value === null) {
    if (required) throw new Error(`Missing required field: ${key}`);
    return "";
  }
  if (typeof value !== "string") throw new Error(`Invalid field type for ${key}`);
  const out = value.trim();
  if (required && !out) throw new Error(`Missing required field: ${key}`);
  return out;
}

function readNestedObject(obj: JsonObject, key: string): JsonObject {
  return asObject(obj[key]);
}

function parseManifest(manifestInput: unknown): {
  manifest: JsonObject;
  manifest_id: string;
  agent_id: string;
  agent_name: string;
  agent_version: string;
  owner_human_id: string;
  owner_entity_id: string;
  owner_display: string;
  owner_email: string;
  risk_tier: "low" | "medium" | "high";
  signature_alg: string;
  signature_valid: boolean;
  accountability_verified: boolean;
  issued_at: string;
  expires_at: string;
} {
  const manifest = asObject(manifestInput);

  const schema_version = readString(manifest, "schema_version");
  if (schema_version !== "1.0.0") {
    throw new Error("Unsupported schema_version. Expected 1.0.0");
  }

  const manifest_id = readString(manifest, "manifest_id");
  if (!/^mfst_[a-zA-Z0-9_-]{12,}$/.test(manifest_id)) {
    throw new Error("Invalid manifest_id format");
  }

  const agent = readNestedObject(manifest, "agent");
  const agent_id = readString(agent, "agent_id");
  if (!/^agt_[a-zA-Z0-9_-]{12,}$/.test(agent_id)) {
    throw new Error("Invalid agent_id format");
  }
  const agent_name = readString(agent, "name");
  const agent_version = readString(agent, "version");

  const accountability = readNestedObject(manifest, "accountability");
  const owner_human_id = readString(accountability, "owner_human_id");
  if (!/^hum_[a-zA-Z0-9_-]{12,}$/.test(owner_human_id)) {
    throw new Error("Invalid owner_human_id format");
  }
  const owner_entity_id = readString(accountability, "owner_entity_id", false);
  const owner_display = readString(accountability, "owner_display");
  const escalation = readNestedObject(accountability, "escalation");
  const owner_email = readString(escalation, "email");

  const policy = readNestedObject(manifest, "policy");
  const riskTierRaw = readString(policy, "risk_tier");
  if (riskTierRaw !== "low" && riskTierRaw !== "medium" && riskTierRaw !== "high") {
    throw new Error("Invalid risk_tier");
  }

  const auth = readNestedObject(manifest, "auth");
  const signingKeys = auth["signing_keys"];
  if (!Array.isArray(signingKeys) || signingKeys.length === 0) {
    throw new Error("auth.signing_keys must be a non-empty array");
  }
  const firstKey = asObject(signingKeys[0]);
  const signature_alg = readString(firstKey, "alg");

  const attestation = readNestedObject(manifest, "attestation");
  const issued_at = readString(attestation, "issued_at");
  const expires_at = readString(attestation, "expires_at");
  const signature = readString(attestation, "signature");

  const issuedAtMs = Date.parse(issued_at);
  const expiresAtMs = Date.parse(expires_at);
  if (!Number.isFinite(issuedAtMs) || !Number.isFinite(expiresAtMs)) {
    throw new Error("Invalid attestation timestamp");
  }
  if (expiresAtMs <= issuedAtMs) {
    throw new Error("attestation.expires_at must be after issued_at");
  }

  const signature_valid = Boolean(signature.length >= 8 && signingKeys.length > 0);
  const accountability_verified = Boolean(owner_human_id && signature_valid);

  return {
    manifest,
    manifest_id,
    agent_id,
    agent_name,
    agent_version,
    owner_human_id,
    owner_entity_id,
    owner_display,
    owner_email,
    risk_tier: riskTierRaw,
    signature_alg,
    signature_valid,
    accountability_verified,
    issued_at,
    expires_at,
  };
}

export function registerAgentManifest(
  manifestInput: unknown,
  proofBundle?: { owner_attestation?: string; ownership_nonce?: string }
): RegisterManifestResult {
  const db = getDb();
  const parsed = parseManifest(manifestInput);

  const existingActive = db
    .prepare(
      "SELECT manifest_id FROM agent_manifests WHERE agent_id = ? AND agent_version = ? AND status = 'active' AND revoked_at IS NULL"
    )
    .get(parsed.agent_id, parsed.agent_version) as { manifest_id: string } | undefined;

  if (existingActive && existingActive.manifest_id !== parsed.manifest_id) {
    throw new Error("Conflicting active manifest exists for this agent version.");
  }

  db.prepare(
    `INSERT INTO agent_manifests (
      manifest_id, agent_id, agent_name, agent_version,
      owner_human_id, owner_entity_id, owner_display, owner_email,
      risk_tier, manifest_json, proof_bundle_json,
      signature_alg, signature_valid, accountability_verified,
      status, issued_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(manifest_id) DO UPDATE SET
      agent_id=excluded.agent_id,
      agent_name=excluded.agent_name,
      agent_version=excluded.agent_version,
      owner_human_id=excluded.owner_human_id,
      owner_entity_id=excluded.owner_entity_id,
      owner_display=excluded.owner_display,
      owner_email=excluded.owner_email,
      risk_tier=excluded.risk_tier,
      manifest_json=excluded.manifest_json,
      proof_bundle_json=excluded.proof_bundle_json,
      signature_alg=excluded.signature_alg,
      signature_valid=excluded.signature_valid,
      accountability_verified=excluded.accountability_verified,
      status='active',
      issued_at=excluded.issued_at,
      expires_at=excluded.expires_at,
      revoked_at=NULL,
      revoked_reason=NULL`
  ).run(
    parsed.manifest_id,
    parsed.agent_id,
    parsed.agent_name,
    parsed.agent_version,
    parsed.owner_human_id,
    parsed.owner_entity_id || null,
    parsed.owner_display,
    parsed.owner_email,
    parsed.risk_tier,
    JSON.stringify(parsed.manifest),
    JSON.stringify(proofBundle || {}),
    parsed.signature_alg,
    parsed.signature_valid ? 1 : 0,
    parsed.accountability_verified ? 1 : 0,
    parsed.issued_at,
    parsed.expires_at
  );

  return {
    manifest_id: parsed.manifest_id,
    agent_id: parsed.agent_id,
    status: "active",
    accountability_verified: parsed.accountability_verified,
    expires_at: parsed.expires_at,
  };
}

export function verifyAgentManifest(manifestId: string): VerifyManifestResult {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT manifest_id, risk_tier, status, signature_valid, accountability_verified, revoked_at, expires_at FROM agent_manifests WHERE manifest_id = ?"
    )
    .get(manifestId) as
    | {
        manifest_id: string;
        risk_tier: "low" | "medium" | "high";
        status: string;
        signature_valid: number;
        accountability_verified: number;
        revoked_at: string | null;
        expires_at: string;
      }
    | undefined;

  if (!row) {
    return {
      manifest_id: manifestId,
      status: "missing",
      signature_valid: false,
      is_expired: true,
      is_revoked: false,
      accountability_verified: false,
      risk_tier: "unknown",
    };
  }

  const is_revoked = Boolean(row.revoked_at || row.status === "revoked");
  const is_expired = Date.parse(row.expires_at) <= Date.now();
  const status: VerifyManifestResult["status"] = is_revoked
    ? "revoked"
    : is_expired
      ? "expired"
      : "active";

  return {
    manifest_id: row.manifest_id,
    status,
    signature_valid: Boolean(row.signature_valid),
    is_expired,
    is_revoked,
    accountability_verified: Boolean(row.accountability_verified),
    risk_tier: row.risk_tier || "unknown",
  };
}

export function revokeAgentManifest(manifestId: string, reason: string): RevokeManifestResult {
  const db = getDb();
  const result = db
    .prepare(
      "UPDATE agent_manifests SET status = 'revoked', revoked_at = datetime('now'), revoked_reason = ? WHERE manifest_id = ?"
    )
    .run(reason || "unspecified", manifestId);

  if (result.changes === 0) {
    throw new Error("Manifest not found.");
  }

  const row = db
    .prepare("SELECT revoked_at FROM agent_manifests WHERE manifest_id = ?")
    .get(manifestId) as { revoked_at: string };

  return {
    manifest_id: manifestId,
    status: "revoked",
    revoked_at: row.revoked_at,
  };
}

export function getAgentAttestations(agentId: string): AgentAttestationResult {
  const db = getDb();
  const history = db
    .prepare(
      `SELECT manifest_id, status, issued_at, expires_at, revoked_at, owner_human_id, owner_display
       FROM agent_manifests
       WHERE agent_id = ?
       ORDER BY issued_at DESC, created_at DESC`
    )
    .all(agentId) as AgentAttestationHistoryRow[];

  const active = history.find((h) => h.status === "active" && !h.revoked_at) || null;

  return {
    agent_id: agentId,
    current_manifest_id: active?.manifest_id || null,
    history,
  };
}

export function requireActiveManifestForHighRiskCategory(
  category: string,
  manifestId?: string
): HighRiskGateResult {
  if (!HIGH_RISK_CATEGORIES.has(category)) {
    return { allowed: true };
  }

  if (!manifestId) {
    return {
      allowed: false,
      reason: "High-risk category submission requires x-manifest-id for an active accountable agent manifest.",
    };
  }

  const verified = verifyAgentManifest(manifestId);
  if (verified.status !== "active" || !verified.signature_valid || !verified.accountability_verified) {
    return {
      allowed: false,
      reason: "Manifest is not active/accountability-verified.",
    };
  }

  return { allowed: true };
}

export function appendAgentActionReceipt(
  input: AppendAgentActionReceiptInput
): AppendAgentActionReceiptResult {
  const db = getDb();

  if (!input.manifest_id?.trim() || !input.agent_id?.trim() || !input.action_id?.trim()) {
    throw new Error("Missing required receipt fields.");
  }

  if (!input.signature?.trim()) {
    throw new Error("Missing signature for receipt append.");
  }

  const verified = verifyAgentManifest(input.manifest_id);
  if (verified.status !== "active" || !verified.signature_valid || !verified.accountability_verified) {
    throw new Error("Cannot append receipt without active manifest.");
  }

  const manifestRow = db
    .prepare("SELECT agent_id FROM agent_manifests WHERE manifest_id = ?")
    .get(input.manifest_id) as { agent_id: string } | undefined;

  if (!manifestRow) {
    throw new Error("Manifest not found for receipt append.");
  }

  if (manifestRow.agent_id !== input.agent_id) {
    throw new Error("Receipt agent_id does not match manifest agent_id.");
  }

  const receipt_id = `rcpt_${input.action_id}_${Date.now()}`;

  db.prepare(
    `INSERT INTO agent_action_receipts (
      receipt_id, manifest_id, agent_id, action_id, action_type,
      risk_tier, target, policy_decision, outcome,
      input_hash, output_hash, receipt_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    receipt_id,
    input.manifest_id,
    input.agent_id,
    input.action_id,
    input.action_type,
    input.risk_tier,
    input.target || null,
    input.policy_decision,
    input.outcome,
    input.input_hash || null,
    input.output_hash || null,
    JSON.stringify({ ...input, receipt_id })
  );

  return { receipt_id, stored: true };
}
