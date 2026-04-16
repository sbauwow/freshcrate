import { NextRequest, NextResponse } from "next/server";
import {
  AgentDecisionPayload,
  AgentRiskTolerance,
  AgentRuntime,
  runAgentDecision,
} from "@/lib/agent-decision";
import { logRequest } from "@/lib/request-log";

function normalizeRuntime(value: unknown): AgentRuntime | undefined {
  const runtime = String(value ?? "").trim().toLowerCase();
  if (runtime === "local" || runtime === "cloud") return runtime as AgentRuntime;
  return undefined;
}

function normalizeRisk(value: unknown): AgentRiskTolerance | undefined {
  const risk = String(value ?? "").trim().toLowerCase();
  if (risk === "low" || risk === "medium" || risk === "high") return risk as AgentRiskTolerance;
  return undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes"].includes(text)) return true;
  if (["0", "false", "no"].includes(text)) return false;
  return undefined;
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    const res = NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    logRequest(request, 400, start);
    return res;
  }

  const payload: AgentDecisionPayload = {
    mode: (String(body.mode ?? "") as AgentDecisionPayload["mode"]),
    task: typeof body.task === "string" ? body.task.trim() : undefined,
    category: typeof body.category === "string" ? body.category.trim() : undefined,
    language: typeof body.language === "string" ? body.language.trim() : undefined,
    runtime: normalizeRuntime(body.runtime),
    risk_tolerance: normalizeRisk(body.risk_tolerance),
    verified_only: normalizeBoolean(body.verified_only),
    require_accountability: normalizeBoolean(body.require_accountability),
    limit: typeof body.limit === "number" ? Math.min(Math.max(body.limit, 1), 50) : undefined,
    a: typeof body.a === "string" ? body.a.trim() : undefined,
    b: typeof body.b === "string" ? body.b.trim() : undefined,
    name: typeof body.name === "string" ? body.name.trim() : undefined,
  };

  try {
    const output = runAgentDecision(payload);
    const status = output.mode === "preflight" && "exists" in output.result && !output.result.exists ? 404 : 200;
    const res = NextResponse.json(output, { status });
    logRequest(request, status, start);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Decision failed.";
    const status = /missing|invalid/i.test(message) ? 400 : /must exist/i.test(message) ? 404 : 500;
    const res = NextResponse.json({ error: message }, { status });
    logRequest(request, status, start);
    return res;
  }
}
