import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, hasApiKeys, validateApiKey } from "@/lib/auth";
import { appendAgentActionReceipt } from "@/lib/agent-manifest";
import { logRequest } from "@/lib/request-log";

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
      manifest_id: String(body.manifest_id ?? ""),
      agent_id: String(body.agent_id ?? ""),
      action_id: String(body.action_id ?? ""),
      action_type: String(body.action_type ?? ""),
      risk_tier: (String(body.risk_tier ?? "low") as "low" | "medium" | "high"),
      target: typeof body.target === "string" ? body.target : undefined,
      policy_decision: String(body.policy_decision ?? ""),
      outcome: String(body.outcome ?? ""),
      input_hash: typeof body.input_hash === "string" ? body.input_hash : undefined,
      output_hash: typeof body.output_hash === "string" ? body.output_hash : undefined,
      signature: String(body.signature ?? ""),
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
