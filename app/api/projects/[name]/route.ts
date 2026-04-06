import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/request-log";
import {
  getProjectByName,
  getProjectReleases,
  getProjectTags,
} from "@/lib/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const start = Date.now();
  const { name } = await params;
  const project = getProjectByName(name);

  if (!project) {
    logRequest(request, 404, start);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const releases = getProjectReleases(project.id);
  const tags = getProjectTags(project.id);

  logRequest(request, 200, start);
  return NextResponse.json({
    ...project,
    tags,
    releases,
  });
}
