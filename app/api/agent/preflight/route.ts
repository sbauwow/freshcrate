import { NextRequest, NextResponse } from "next/server";
import { preflightProjectForAgent } from "@/lib/agent-decision";
import { logRequest } from "@/lib/request-log";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const name = (request.nextUrl.searchParams.get("name") || "").trim();

  if (!name) {
    const res = NextResponse.json({ error: "Missing query parameter: name" }, { status: 400 });
    logRequest(request, 400, start);
    return res;
  }

  const preflight = preflightProjectForAgent(name);
  const status = preflight.status === "missing" ? 404 : 200;
  const res = NextResponse.json({ name, preflight }, { status });
  logRequest(request, status, start);
  return res;
}
