import { NextRequest, NextResponse } from "next/server";
import {
  getProjectByName,
  getProjectReleases,
  getProjectTags,
} from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const project = getProjectByName(name);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const releases = getProjectReleases(project.id);
  const tags = getProjectTags(project.id);

  return NextResponse.json({
    ...project,
    tags,
    releases,
  });
}
