import { NextRequest, NextResponse } from "next/server";
import { AgentRiskTolerance, AgentRuntime, recommendProjectsForAgent } from "@/lib/agent-decision";
import { logRequest } from "@/lib/request-log";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const task = (request.nextUrl.searchParams.get("task") || "").trim();

  if (!task) {
    const res = NextResponse.json({ error: "Missing query parameter: task" }, { status: 400 });
    logRequest(request, 400, start);
    return res;
  }

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

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "10");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 10;

  const recommendations = recommendProjectsForAgent({
    task,
    category,
    language,
    runtime,
    risk_tolerance,
    verified_only,
    require_accountability,
    limit,
  });

  const res = NextResponse.json({
    task,
    category,
    language,
    runtime,
    risk_tolerance,
    verified_only,
    require_accountability,
    limit,
    count: recommendations.length,
    recommendations,
  });
  logRequest(request, 200, start);
  return res;
}
