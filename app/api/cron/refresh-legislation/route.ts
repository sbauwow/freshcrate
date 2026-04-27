import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { refreshLegislation } from "@/lib/refresh-legislation";

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
  const dryRun = url.searchParams.get("dry") === "1";
  const sourcesParam = url.searchParams.get("sources");
  const sources = sourcesParam
    ? (sourcesParam.split(",") as Array<"uk-parliament" | "us-congress" | "us-federal-register" | "eu-eur-lex">)
    : undefined;

  try {
    const result = await refreshLegislation(getDb(), { dryRun, sources });
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
