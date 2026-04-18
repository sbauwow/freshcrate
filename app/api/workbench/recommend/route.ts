import { NextRequest, NextResponse } from "next/server";
import { getAgentEditionRecommendations } from "@/lib/workbench-install";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();
  const persona = request.nextUrl.searchParams.get("persona") || undefined;
  const task = request.nextUrl.searchParams.get("task") || undefined;
  const recommendations = getAgentEditionRecommendations({ persona, task });

  logRequest(request, 200, start);
  return NextResponse.json({
    filters: { persona, task },
    recommendations,
  });
}
