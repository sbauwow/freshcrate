import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /random — Redirect to a random project page.
 * The OG freshmeat feature: "Take me to a random project."
 */
export async function GET(request: NextRequest) {
  const db = getDb();
  const row = db
    .prepare("SELECT name FROM projects ORDER BY RANDOM() LIMIT 1")
    .get() as { name: string } | undefined;

  // Clone the request URL and just swap the pathname — preserves host/proto/port
  const url = request.nextUrl.clone();
  url.pathname = row ? `/projects/${encodeURIComponent(row.name)}` : "/";

  return NextResponse.redirect(url);
}
