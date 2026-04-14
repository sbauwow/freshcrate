import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { refreshReleases } from "@/lib/refresh-releases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "500", 10);
  const concurrency = parseInt(url.searchParams.get("concurrency") || "5", 10);
  const dryRun = url.searchParams.get("dry") === "1";

  try {
    const result = await refreshReleases(getDb(), {
      limit,
      concurrency,
      token: process.env.GITHUB_TOKEN,
      dryRun,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
