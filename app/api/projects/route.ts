import { NextRequest, NextResponse } from "next/server";
import { getLatestReleases, getProjectByName } from "@/lib/queries";
import { CATEGORIES } from "@/lib/categories";
import { sendSubmissionEmail } from "@/lib/notify";

export async function GET(request: NextRequest) {
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  const offset = parseInt(request.nextUrl.searchParams.get("offset") || "0");
  const projects = getLatestReleases(Math.min(limit, 100), Math.max(offset, 0));
  return NextResponse.json({ projects, count: projects.length });
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: "Package name must be 100 characters or fewer." }, { status: 400 });
    }
    if (data.short_desc.length > 200) {
      return NextResponse.json({ error: "Short description must be 200 characters or fewer." }, { status: 400 });
    }

    // Category validation
    if (!CATEGORIES.includes(data.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    // Duplicate check
    const existing = getProjectByName(data.name);
    if (existing) {
      return NextResponse.json({ error: `Package "${data.name}" already exists.` }, { status: 409 });
    }

    // Queue for review — email admin instead of publishing
    const submission = {
      name: data.name,
      short_desc: (data.short_desc || "").slice(0, 200),
      description: (data.description || "").slice(0, 5000),
      homepage_url: (data.homepage_url || "").slice(0, 500),
      repo_url: (data.repo_url || "").slice(0, 500),
      license: data.license || "MIT",
      category: data.category,
      author: (data.author || "").slice(0, 100),
      version: (data.version || "").slice(0, 50),
      changes: (data.changes || "").slice(0, 2000),
      tags: (data.tags || []).slice(0, 10),
    };

    await sendSubmissionEmail(submission);

    return NextResponse.json(
      { message: "Submission received! It will be reviewed and published shortly.", name: data.name },
      { status: 202 }
    );
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
