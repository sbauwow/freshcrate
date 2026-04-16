import { NextRequest, NextResponse } from "next/server";
import { extractBearerToken, hasApiKeys, validateApiKey } from "@/lib/auth";
import { registerAgentManifest } from "@/lib/agent-manifest";
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
    const result = registerAgentManifest(body?.manifest, body?.proof_bundle);
    const res = NextResponse.json(result, { status: 201 });
    logRequest(request, 201, start);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Manifest registration failed.";
    const status = /conflicting active manifest/i.test(message) ? 409 : 400;
    const res = NextResponse.json({ error: message }, { status });
    logRequest(request, status, start);
    return res;
  }
}
