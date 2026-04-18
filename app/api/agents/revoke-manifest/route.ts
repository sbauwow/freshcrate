import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, hasApiKeys, validateApiKey } from "@/lib/auth";
import { revokeAgentManifest } from "@/lib/agent-manifest";
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
    const body = await request.json();
    const manifestId = typeof body?.manifest_id === "string" ? body.manifest_id.trim() : "";
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "unspecified";

    if (!manifestId) {
      const res = NextResponse.json({ error: "Missing manifest_id" }, { status: 400 });
      logRequest(request, 400, start);
      return res;
    }

    const revoked = revokeAgentManifest(manifestId, reason);
    const res = NextResponse.json(revoked);
    logRequest(request, 200, start);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manifest revocation failed.";
    const status = /not found/i.test(message) ? 404 : 400;
    const res = NextResponse.json({ error: message }, { status });
    logRequest(request, status, start);
    return res;
  }
}
