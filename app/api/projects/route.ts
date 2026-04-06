import { NextRequest, NextResponse } from "next/server";
import { getLatestReleases, getProjectByName, submitProject } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";
import { hasApiKeys, extractBearerToken, validateApiKey } from "@/lib/auth";
import { fireNewPackageEvent } from "@/lib/webhooks";

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
  const projects = getLatestReleases(Math.min(limit, 100), Math.max(offset, 0));
  return NextResponse.json({ projects, count: projects.length });
}

export async function POST(request: NextRequest) {
  try {
    // Auth check: if API keys exist, require one
    if (hasApiKeys()) {
      const token = extractBearerToken(request.headers.get("authorization"));
      if (!token) {
        return NextResponse.json(
          { error: "Authentication required. Include: Authorization: Bearer <api_key>" },
          { status: 401 }
        );
      }
      const auth = validateApiKey(token);
      if (!auth.valid) {
        const status = auth.error.includes("Rate limit") ? 429 : 401;
        return NextResponse.json({ error: auth.error }, { status });
      }
    }

    const data = await request.json();

    // Required fields
    if (!data.name || !data.short_desc || !data.version || !data.author || !data.category) {
      return NextResponse.json(
        { error: "Missing required fields: name, short_desc, version, author, category" },
        { status: 400 }
      );
    }

    // Name validation
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(data.name)) {
      return NextResponse.json(
        { error: "Invalid package name. Use lowercase alphanumeric, dots, hyphens, underscores." },
        { status: 400 }
      );
    }

    if (data.name.length > 100) {
      return NextResponse.json(
        { error: "Package name must be 100 characters or fewer." },
        { status: 400 }
      );
    }

    // Length limits
    if (data.short_desc.length > 200) {
      return NextResponse.json(
        { error: "Short description must be 200 characters or fewer." },
        { status: 400 }
      );
    }

    if (data.description && data.description.length > 5000) {
      return NextResponse.json(
        { error: "Description must be 5000 characters or fewer." },
        { status: 400 }
      );
    }

    if (data.changes && data.changes.length > 2000) {
      return NextResponse.json(
        { error: "Changes must be 2000 characters or fewer." },
        { status: 400 }
      );
    }

    // Category validation
    if (!CATEGORIES.includes(data.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Tags validation
    if (data.tags && (!Array.isArray(data.tags) || data.tags.length > 10)) {
      return NextResponse.json(
        { error: "Tags must be an array of 10 or fewer strings." },
        { status: 400 }
      );
    }

    // Duplicate check
    const existing = getProjectByName(data.name);
    if (existing) {
      return NextResponse.json(
        { error: `Package "${data.name}" already exists.` },
        { status: 409 }
      );
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

    // Fire webhook notification (fire and forget — don't await)
    fireNewPackageEvent({
      id: projectId,
      name: data.name,
      short_desc: data.short_desc,
      category: data.category,
      author: data.author,
      version: data.version,
    });

    return NextResponse.json({ id: projectId, name: data.name }, { status: 201 });
  } catch (err) {
    const message = (err as Error).message;
    // SQLite unique constraint violation
    if (message.includes("UNIQUE constraint")) {
      return NextResponse.json({ error: "Package name already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
