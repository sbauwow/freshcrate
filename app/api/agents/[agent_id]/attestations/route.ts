import { NextRequest, NextResponse } from "next/server";
import { getAgentAttestations } from "@/lib/agent-manifest";
import { logRequest } from "@/lib/request-log";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agent_id: string }> }
) {
  const start = Date.now();
  const { agent_id } = await params;

  const out = getAgentAttestations(agent_id);
  const status = out.history.length === 0 ? 404 : 200;
  const res = NextResponse.json(out, { status });
  logRequest(request, status, start);
  return res;
}
