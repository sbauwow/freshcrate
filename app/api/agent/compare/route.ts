import { NextRequest, NextResponse } from "next/server";
import { AgentRiskTolerance, AgentRuntime, compareProjectsForAgent } from "@/lib/agent-decision";
import { logRequest } from "@/lib/request-log";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const a = (request.nextUrl.searchParams.get("a") || "").trim();
  const b = (request.nextUrl.searchParams.get("b") || "").trim();

  if (!a || !b) {
    const res = NextResponse.json({ error: "Missing query parameters: a and b are required" }, { status: 400 });
    logRequest(request, 400, start);
    return res;
  }

  const task = (request.nextUrl.searchParams.get("task") || "").trim() || undefined;
  const category = (request.nextUrl.searchParams.get("category") || "").trim() || undefined;
  const language = (request.nextUrl.searchParams.get("language") || "").trim() || undefined;
  const runtimeRaw = (request.nextUrl.searchParams.get("runtime") || "").trim().toLowerCase();
  const runtime: AgentRuntime | undefined = runtimeRaw === "local" || runtimeRaw === "cloud" ? (runtimeRaw as AgentRuntime) : undefined;
  const riskRaw = (request.nextUrl.searchParams.get("risk_tolerance") || "").trim().toLowerCase();
  const risk_tolerance: AgentRiskTolerance | undefined =
    riskRaw === "low" || riskRaw === "medium" || riskRaw === "high" ? (riskRaw as AgentRiskTolerance) : undefined;
  const verified_only = ["1", "true", "yes"].includes((request.nextUrl.searchParams.get("verified_only") || "").toLowerCase());
  const require_accountability = ["1", "true", "yes"].includes(
    (request.nextUrl.searchParams.get("require_accountability") || "").toLowerCase()
  );

  try {
    const comparison = compareProjectsForAgent(a, b, {
      task,
      category,
      language,
      runtime,
      risk_tolerance,
      verified_only,
      require_accountability,
    });
    const res = NextResponse.json({
      a,
      b,
      context: { task, category, language, runtime, risk_tolerance, verified_only, require_accountability },
      comparison,
    });
    logRequest(request, 200, start);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Comparison failed";
    const status = /must exist/i.test(message) ? 404 : 500;
    const res = NextResponse.json({ error: message }, { status });
    logRequest(request, status, start);
    return res;
  }
}
