import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /random — Redirect to a random project page.
 * The OG freshmeat feature: "Take me to a random project."
 */
export async function GET(request: Request) {
  const db = getDb();
  const row = db
    .prepare("SELECT name FROM projects ORDER BY RANDOM() LIMIT 1")
    .get() as { name: string } | undefined;

  const base = new URL(request.url).origin;

  if (!row) {
    return NextResponse.redirect(new URL("/", base));
  }

  return NextResponse.redirect(
    new URL(`/projects/${encodeURIComponent(row.name)}`, base)
  );
}
