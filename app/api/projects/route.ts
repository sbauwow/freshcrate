import { NextRequest, NextResponse } from "next/server";
import { getLatestReleases, getProjectByName, submitProject } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";
import { fireNewPackageEvent } from "@/lib/webhooks";
import { logRequest } from "@/lib/request-log";
import { log } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const start = Date.now();
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
  const projects = getLatestReleases(Math.min(limit, 100), Math.max(offset, 0));
  const res = NextResponse.json({ projects, count: projects.length });
  logRequest(request, 200, start);
  return res;
}

export async function POST(request: NextRequest) {
  const start = Date.now();
  let keyPrefix: string | undefined;

  try {
    // Auth check: if API keys exist, require one
    if (hasApiKeys()) {
      const token = extractBearerToken(request.headers.get("authorization"));
      if (!token) {
        const res = NextResponse.json(
          { error: "Authentication required. Include: Authorization: Bearer <api_key>" },
          { status: 401 }
        );
        logRequest(request, 401, start);
        return res;
      }
      const auth = validateApiKey(token);
      if (!auth.valid) {
        const status = auth.error.includes("Rate limit") ? 429 : 401;
        const res = NextResponse.json({ error: auth.error }, { status });
        logRequest(request, status, start);
        return res;
      }
      keyPrefix = auth.key.key_prefix;
    }

    const data = await request.json();

    // Required fields
    if (!data.name || !data.short_desc || !data.version || !data.author || !data.category) {
      const res = NextResponse.json(
        { error: "Missing required fields: name, short_desc, version, author, category" },
        { status: 400 }
      );
      logRequest(request, 400, start, keyPrefix);
      return res;
    }

    // Name validation
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(data.name)) {
      const res = NextResponse.json(
        { error: "Invalid package name. Use lowercase alphanumeric, dots, hyphens, underscores." },
        { status: 400 }
      );
      logRequest(request, 400, start, keyPrefix);
      return res;
    }

    if (data.name.length > 100) {
      const res = NextResponse.json({ error: "Package name must be 100 characters or fewer." }, { status: 400 });
      logRequest(request, 400, start, keyPrefix);
      return res;
    }

    if (data.short_desc.length > 200) {
      const res = NextResponse.json({ error: "Short description must be 200 characters or fewer." }, { status: 400 });
      logRequest(request, 400, start, keyPrefix);
      return res;
    }

    // Category validation
    if (!CATEGORIES.includes(data.category)) {
      const res = NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(", ")}` },
        { status: 400 }
      );
      logRequest(request, 400, start, keyPrefix);
      return res;
    }

    // Tags validation
    if (data.tags && (!Array.isArray(data.tags) || data.tags.length > 10)) {
      const res = NextResponse.json({ error: "Tags must be an array of 10 or fewer strings." }, { status: 400 });
      logRequest(request, 400, start, keyPrefix);
      return res;
    }

    // Duplicate check
    const existing = getProjectByName(data.name);
    if (existing) {
      const res = NextResponse.json({ error: `Package "${data.name}" already exists.` }, { status: 409 });
      logRequest(request, 409, start, keyPrefix);
      return res;
    }

    const projectId = submitProject({
      name: data.name,
      short_desc: data.short_desc.slice(0, 200),
      description: (data.description || "").slice(0, 5000),
      homepage_url: (data.homepage_url || "").slice(0, 500),
      repo_url: (data.repo_url || "").slice(0, 500),
      license: data.license || "MIT",
      category: data.category,
      author: data.author.slice(0, 100),
      version: data.version.slice(0, 50),
      changes: (data.changes || "").slice(0, 2000),
      tags: (data.tags || []).slice(0, 10),
    });

    log.info("package_submitted", { id: projectId, name: data.name, category: data.category, api_key: keyPrefix });

    // Fire webhook (fire and forget)
    fireNewPackageEvent({
      id: projectId,
      name: data.name,
      short_desc: data.short_desc,
      category: data.category,
      author: data.author,
      version: data.version,
    }).catch(() => {});

    const res = NextResponse.json({ id: projectId, name: data.name }, { status: 201 });
    logRequest(request, 201, start, keyPrefix);
    return res;
  } catch (err) {
    const message = (err as Error).message;
    log.error("submit_error", { error: message });
    if (message.includes("UNIQUE constraint")) {
      const res = NextResponse.json({ error: "Package name already exists." }, { status: 409 });
      logRequest(request, 409, start, keyPrefix);
      return res;
    }
    const res = NextResponse.json({ error: message }, { status: 500 });
    logRequest(request, 500, start, keyPrefix);
    return res;
  }
}
