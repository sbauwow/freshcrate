import { NextRequest, NextResponse } from "next/server";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";
import { listWebhooks, registerWebhook } from "@/lib/webhooks";

/**
 * Authenticate the request using the same pattern as POST /api/projects.
 * Returns a NextResponse error if auth fails, or null if auth succeeds.
 */
function authenticateRequest(request: NextRequest): NextResponse | null {
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
      return NextResponse.json({ error: auth.error }, { status });
    }
  }
  return null;
}

/**
 * GET /api/webhooks — List all registered webhooks.
 * Requires API key authentication when keys are configured.
 */
export async function GET(request: NextRequest) {
  const authError = authenticateRequest(request);
  if (authError) return authError;

  const webhooks = listWebhooks();
  return NextResponse.json({ webhooks, count: webhooks.length });
}

/**
 * POST /api/webhooks — Register a new webhook.
 * Requires API key authentication when keys are configured.
 *
 * Body: { url: string, events?: string, secret?: string }
 */
export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request);
  if (authError) return authError;

  try {
    const data = await request.json();

    if (!data.url) {
      return NextResponse.json(
        { error: "Missing required field: url" },
        { status: 400 }
      );
    }

    // Basic URL validation
    try {
      new URL(data.url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Validate events if provided
    if (data.events) {
      const validEvents = ["new_package", "new_release"];
      const requestedEvents = data.events.split(",").map((e: string) => e.trim());
      const invalid = requestedEvents.filter((e: string) => !validEvents.includes(e));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid events: ${invalid.join(", ")}. Valid events: ${validEvents.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const id = registerWebhook(data.url, data.events, data.secret);
    return NextResponse.json({ id, url: data.url }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
