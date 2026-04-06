import { NextRequest, NextResponse } from "next/server";
import { getProjectByName } from "@/lib/queries";
import { getDependencies, getDependencyAudit, scanDependencies } from "@/lib/deps";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";

/**
 * GET /api/projects/[name]/deps — get cached dependencies + license audit
 * POST /api/projects/[name]/deps — trigger a fresh scan
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const project = getProjectByName(name);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const deps = getDependencies(project.id);
  const audit = getDependencyAudit(project.id);

  return NextResponse.json({ deps, audit });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  // Auth check
  if (hasApiKeys()) {
    const token = extractBearerToken(request.headers.get("authorization"));
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const auth = validateApiKey(token);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: auth.error.includes("Rate") ? 429 : 401 });
    }
  }

  const { name } = await params;
  const project = getProjectByName(name);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (!project.repo_url?.includes("github.com")) {
    return NextResponse.json({ error: "Only GitHub repos supported for dependency scanning" }, { status: 400 });
  }

  // Parse owner/repo from URL
  const match = project.repo_url.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (!match) {
    return NextResponse.json({ error: "Could not parse GitHub repo URL" }, { status: 400 });
  }

  const [, owner, repo] = match;
  const token = process.env.GITHUB_TOKEN || undefined;

  try {
    const result = await scanDependencies(project.id, owner, repo.replace(/\.git$/, ""), token);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
