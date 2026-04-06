import { NextRequest, NextResponse } from "next/server";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";
import { removeWebhook } from "@/lib/webhooks";
import { logRequest } from "@/lib/request-log";

/**
 * DELETE /api/webhooks/[id] — Remove a webhook by ID.
 * Requires API key authentication when keys are configured.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const start = Date.now();
  // Auth check
  if (hasApiKeys()) {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required. Include: Authorization: Bearer <api_key>" },
        { status: 401 }
      );
    }
    const auth = validateApiKey(token);
    if (!auth.valid) {
      const status = auth.error.includes("Rate limit") ? 429 : 401;
      logRequest(request, status, start);
      return NextResponse.json({ error: auth.error }, { status });
    }
  }

  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    logRequest(request, 400, start);
    return NextResponse.json({ error: "Invalid webhook ID" }, { status: 400 });
  }

  const deleted = removeWebhook(id);
  if (!deleted) {
    logRequest(request, 404, start);
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  logRequest(request, 200, start);
  return NextResponse.json({ deleted: true, id });
}
