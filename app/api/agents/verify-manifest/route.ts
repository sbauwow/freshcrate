import { NextRequest, NextResponse } from "next/server";
import { verifyAgentManifest } from "@/lib/agent-manifest";
import { logRequest } from "@/lib/request-log";

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const body = await request.json();
    const manifestId = typeof body?.manifest_id === "string" ? body.manifest_id.trim() : "";
    if (!manifestId) {
      const res = NextResponse.json({ error: "Missing manifest_id" }, { status: 400 });
      logRequest(request, 400, start);
      return res;
    }

    const verified = verifyAgentManifest(manifestId);
    const status = verified.status === "missing" ? 404 : 200;
    const res = NextResponse.json(verified, { status });
    logRequest(request, status, start);
    return res;
  } catch {
    const res = NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    logRequest(request, 400, start);
    return res;
  }
}
