import { NextRequest, NextResponse } from "next/server";
import { searchProjects } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20"), 100);
  const offset = Math.max(parseInt(request.nextUrl.searchParams.get("offset") || "0"), 0);

  const allResults = searchProjects(q);
  const paginated = allResults.slice(offset, offset + limit);

  return NextResponse.json({
    query: q,
    projects: paginated,
    count: paginated.length,
    total: allResults.length,
    limit,
    offset,
  });
}
