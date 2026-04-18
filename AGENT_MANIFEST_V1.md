# Agent Identity + Accountability Manifest (AIAM) v1

Status: proposal ready for implementation

Goal: every agent has a verifiable accountable human and a signed policy envelope.

## Core invariants

1. No responsible human -> no verified status.
2. No valid signature/expiry -> manifest invalid.
3. High-risk actions require active non-revoked manifest.
4. All execution requests produce immutable action receipts.

## Data model

Primary schema file:
- `schemas/agent-manifest.v1.schema.json`

Key IDs:
- `agent_id` -> `agt_*`
- `manifest_id` -> `mfst_*`
- `owner_human_id` -> `hum_*`
- `owner_entity_id` -> `org_*` (optional)

Trust layers:
- Public: pseudonymous owner display + trust status + attestation timeline
- Private escrow: legal identity docs linked to `owner_human_id` (not publicly exposed)

## API contracts

All routes under `/api/agents`.
All write routes should use existing API-key auth pattern in Freshcrate.

### 1) Register manifest

POST `/api/agents/register-manifest`

Request body:
```json
{
  "manifest": { "schema_version": "1.0.0", "...": "see schema" },
  "proof_bundle": {
    "owner_attestation": "base64-or-jws",
    "ownership_nonce": "optional challenge nonce"
  }
}
```

Validation:
- JSON schema valid
- `expires_at > issued_at`
- `owner_human_id` present
- signature verifies against one of `auth.signing_keys`

Response 201:
```json
{
  "manifest_id": "mfst_...",
  "agent_id": "agt_...",
  "status": "active",
  "accountability_verified": true,
  "expires_at": "2026-10-01T00:00:00Z"
}
```

Errors:
- 400 invalid schema
- 401/403 auth failure
- 409 conflicting active manifest for same `agent_id` + version

### 2) Verify manifest

POST `/api/agents/verify-manifest`

Request:
```json
{
  "manifest_id": "mfst_..."
}
```

Response 200:
```json
{
  "manifest_id": "mfst_...",
  "status": "active",
  "signature_valid": true,
  "is_expired": false,
  "is_revoked": false,
  "accountability_verified": true,
  "risk_tier": "medium"
}
```

### 3) Revoke manifest

POST `/api/agents/revoke-manifest`

Request:
```json
{
  "manifest_id": "mfst_...",
  "reason": "compromised_key | owner_request | policy_violation | superseded"
}
```

Response 200:
```json
{
  "manifest_id": "mfst_...",
  "status": "revoked",
  "revoked_at": "2026-04-16T18:00:00Z"
}
```

### 4) List attestations for an agent

GET `/api/agents/{agent_id}/attestations`

Response 200:
```json
{
  "agent_id": "agt_...",
  "current_manifest_id": "mfst_...",
  "history": [
    {
      "manifest_id": "mfst_...",
      "status": "active",
      "issued_at": "...",
      "expires_at": "...",
      "revoked_at": null,
      "owner_human_id": "hum_...",
      "owner_display": "Ops Lead"
    }
  ]
}
```

### 5) Append action receipt

POST `/api/agents/receipt`

Request:
```json
{
  "manifest_id": "mfst_...",
  "agent_id": "agt_...",
  "action_id": "act_...",
  "timestamp": "2026-04-16T18:10:00Z",
  "action_type": "tool_execution",
  "risk_tier": "high",
  "target": "github.com/org/repo",
  "policy_decision": "allow",
  "outcome": "success",
  "input_hash": "sha256:...",
  "output_hash": "sha256:...",
  "signature": "jws-or-detached"
}
```

Response 201:
```json
{
  "receipt_id": "rcpt_...",
  "stored": true
}
```

## Runtime enforcement contract

For agent-originated calls, require headers:
- `x-agent-id`
- `x-agent-version`
- `x-manifest-id`
- `x-owner-human-id`
- `x-manifest-signature`

Gateway checks before privileged actions:
1. manifest exists and active
2. manifest not expired/revoked
3. signature valid
4. owner_human_id matches manifest
5. requested action not in prohibited actions
6. if risk_tier=high and accountability_verified=false -> deny

## Ranking impact (Freshcrate decision layer)

New ranking feature flags:
- `accountability_verified` (bool)
- `manifest_status` (`active|expired|revoked|missing`)
- `owner_reputation_score` (optional v2)

Decision behavior:
- `verified_only=true` currently filters project verification.
- v2 extension: when `require_accountability=true`, filter to `accountability_verified && manifest_status=active`.

## Suggested SQL schema additions (next implementation slice)

```sql
CREATE TABLE agent_manifests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manifest_id TEXT UNIQUE NOT NULL,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  owner_human_id TEXT NOT NULL,
  owner_entity_id TEXT,
  owner_display TEXT NOT NULL,
  risk_tier TEXT NOT NULL,
  manifest_json TEXT NOT NULL,
  signature_alg TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoked_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_agent_manifests_agent ON agent_manifests(agent_id);
CREATE INDEX idx_agent_manifests_owner ON agent_manifests(owner_human_id);
CREATE INDEX idx_agent_manifests_status ON agent_manifests(status);

CREATE TABLE agent_action_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT UNIQUE NOT NULL,
  manifest_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  action_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  risk_tier TEXT NOT NULL,
  target TEXT,
  policy_decision TEXT NOT NULL,
  outcome TEXT NOT NULL,
  input_hash TEXT,
  output_hash TEXT,
  receipt_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Rollout plan

Phase A (1 sprint):
- Implement register/verify/revoke + attestations
- Add accountability badge + API exposure
- Wire basic enforcement for high-risk write endpoints

Phase B:
- action receipts + incident export
- owner reputation scoring
- mandatory accountability for promoted/verified agent listings
