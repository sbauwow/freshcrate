import { NextRequest, NextResponse } from "next/server";
import { logRequest } from "@/lib/request-log";
import {
  getProjectByName,
  getProjectReleases,
  getProjectTags,
} from "@/lib/queries";
import { parseProvenanceJson } from "@/lib/provenance";

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
    provenance: parseProvenanceJson(project.provenance_json),
    tags,
    releases,
  });
}
