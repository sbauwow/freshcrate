import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";
import { logRequest } from "@/lib/request-log";

/**
 * GET /api/topics — List all watched GitHub topics
 */
export async function GET(request: NextRequest) {
  const start = Date.now();
  const db = getDb();
  const topics = db
    .prepare(
      "SELECT topic, active, last_checked_at, repos_found, repos_added, created_at FROM watched_topics ORDER BY topic"
    )
    .all();
  logRequest(request, 200, start);
  return NextResponse.json({ topics, count: topics.length });
}

/**
 * POST /api/topics — Add a new topic to watch
 * Body: { topic: "my-topic" }
 * Requires API key auth.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  // Auth
  if (hasApiKeys()) {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      logRequest(request, 401, start);
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }
    const auth = validateApiKey(token);
    if (!auth.valid) {
      logRequest(request, auth.error.includes("Rate") ? 429 : 401, start);
      return NextResponse.json({ error: auth.error }, { status: auth.error.includes("Rate") ? 429 : 401 });
    }
  }

  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== "string") {
      logRequest(request, 400, start);
      return NextResponse.json({ error: "Provide a topic string" }, { status: 400 });
    }

    // Validate topic format (GitHub topic rules: lowercase, hyphens, max 50 chars)
    const clean = topic.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50);

    const db = getDb();
    db.prepare("INSERT OR IGNORE INTO watched_topics (topic) VALUES (?)").run(clean);

    logRequest(request, 201, start);
    return NextResponse.json({ topic: clean, status: "watching" }, { status: 201 });
  } catch (err) {
    logRequest(request, 500, start);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
