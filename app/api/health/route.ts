import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * GET /api/health — Health check endpoint.
 * Returns 200 if the app + database are operational.
 * Use for uptime monitoring (UptimeRobot, Pingdom, etc.).
 */
export async function GET() {
  const start = Date.now();

  try {
    const db = getDb();

    // Verify DB is readable
    const row = db.prepare("SELECT COUNT(*) as c FROM projects").get() as { c: number };

    // Verify DB is writable (touch _migrations)
    db.prepare("SELECT 1").get();

    const duration = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      db: "connected",
      projects: row.c,
      response_ms: duration,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "disconnected",
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
