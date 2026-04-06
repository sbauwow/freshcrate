import { NextResponse } from "next/server";
import { getFullStats } from "@/lib/queries";

export function GET() {
  const stats = getFullStats();
  return NextResponse.json(stats);
}
