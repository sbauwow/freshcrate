import { NextRequest, NextResponse } from "next/server";
import { searchProjects } from "@/lib/queries";
import { logRequest } from "@/lib/request-log";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const q = request.nextUrl.searchParams.get("q") || "";
  if (!q) {
    const res = NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
    logRequest(request, 400, start);
    return res;
  }

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get("limit") || "20"), 100);
  const offset = Math.max(parseInt(request.nextUrl.searchParams.get("offset") || "0"), 0);

  const allResults = searchProjects(q);
  const paginated = allResults.slice(offset, offset + limit);

  const res = NextResponse.json({
    query: q,
    projects: paginated,
    count: paginated.length,
    total: allResults.length,
    limit,
    offset,
  });
  logRequest(request, 200, start);
  return res;
}
