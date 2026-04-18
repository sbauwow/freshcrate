import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, hasApiKeys, validateApiKey } from "@/lib/auth";
import {
  appendAgentActionReceipt,
  RECEIPT_ACTION_TYPES,
  RECEIPT_OUTCOMES,
  RECEIPT_POLICY_DECISIONS,
  ReceiptActionType,
  ReceiptOutcome,
  ReceiptPolicyDecision,
} from "@/lib/agent-manifest";
import { logRequest } from "@/lib/request-log";

function normalizeRiskTier(value: unknown): "low" | "medium" | "high" {
  const risk = String(value ?? "").trim().toLowerCase();
  return risk === "medium" || risk === "high" ? risk : "low";
}

function normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T): T[number] | string {
  const text = String(value ?? "").trim().toLowerCase();
  return (allowed as readonly string[]).includes(text) ? (text as T[number]) : text;
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  if (hasApiKeys()) {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      const res = NextResponse.json({ error: "Authentication required." }, { status: 401 });
      logRequest(request, 401, start);
      return res;
    }
    const auth = validateApiKey(token);
    if (!auth.valid) {
      const status = auth.error.includes("Rate limit") ? 429 : 401;
      const res = NextResponse.json({ error: auth.error }, { status });
      logRequest(request, status, start);
      return res;
    }
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;

    const out = appendAgentActionReceipt({
      manifest_id: String(body.manifest_id ?? "").trim(),
      agent_id: String(body.agent_id ?? "").trim(),
      action_id: String(body.action_id ?? "").trim(),
      action_type: normalizeEnum(body.action_type, RECEIPT_ACTION_TYPES) as ReceiptActionType,
      risk_tier: normalizeRiskTier(body.risk_tier),
      target: typeof body.target === "string" ? body.target.trim() : undefined,
      policy_decision: normalizeEnum(body.policy_decision, RECEIPT_POLICY_DECISIONS) as ReceiptPolicyDecision,
      outcome: normalizeEnum(body.outcome, RECEIPT_OUTCOMES) as ReceiptOutcome,
      input_hash: typeof body.input_hash === "string" ? body.input_hash.trim() : undefined,
      output_hash: typeof body.output_hash === "string" ? body.output_hash.trim() : undefined,
      signature: String(body.signature ?? "").trim(),
    });

    const res = NextResponse.json(out, { status: 201 });
    logRequest(request, 201, start);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Receipt append failed.";
    const status = /active manifest/i.test(message) ? 403 : 400;
    const res = NextResponse.json({ error: message }, { status });
    logRequest(request, status, start);
    return res;
  }
}
