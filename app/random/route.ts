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

  // Use x-forwarded-host (set by Railway/reverse proxy) or fall back to request host
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "freshcrate.ai";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = `${proto}://${host}`;

  if (!row) {
    return NextResponse.redirect(new URL("/", base));
  }

  return NextResponse.redirect(
    new URL(`/projects/${encodeURIComponent(row.name)}`, base)
  );
}
