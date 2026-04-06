import { NextRequest, NextResponse } from "next/server";
import { searchProjects } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") || "";
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }
  const projects = searchProjects(q);
  return NextResponse.json({ query: q, projects, count: projects.length });
}
