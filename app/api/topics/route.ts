import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";

/**
 * GET /api/topics — List all watched GitHub topics
 */
export async function GET() {
  const db = getDb();
  const topics = db
    .prepare(
      "SELECT topic, active, last_checked_at, repos_found, repos_added, created_at FROM watched_topics ORDER BY topic"
    )
    .all();
  return NextResponse.json({ topics, count: topics.length });
}

/**
 * POST /api/topics — Add a new topic to watch
 * Body: { topic: "my-topic" }
 * Requires API key auth.
 */
export async function POST(request: NextRequest) {
  // Auth
  if (hasApiKeys()) {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }
    const auth = validateApiKey(token);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.error.includes("Rate") ? 429 : 401 });
    }
  }

  try {
    const { topic } = await request.json();

    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Provide a topic string" }, { status: 400 });
    }

    // Validate topic format (GitHub topic rules: lowercase, hyphens, max 50 chars)
    const clean = topic.toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 50);

    const db = getDb();
    db.prepare("INSERT OR IGNORE INTO watched_topics (topic) VALUES (?)").run(clean);

    return NextResponse.json({ topic: clean, status: "watching" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
