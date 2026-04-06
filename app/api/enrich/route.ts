import { NextRequest, NextResponse } from "next/server";
import { categorize } from "@/lib/categories";

/**
 * Agent enrichment endpoint.
 * Takes a GitHub repo URL or owner/repo slug, fetches metadata + latest release,
 * and returns a pre-filled package submission object.
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

function parseRepo(input: string): { owner: string; repo: string } | null {
  // Handle full URLs: https://github.com/owner/repo or github.com/owner/repo
  const urlMatch = input.match(/(?:https?:\/\/)?github\.com\/([^/\s]+)\/([^/\s#?]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2].replace(/\.git$/, "") };

  // Handle owner/repo format
  const slugMatch = input.trim().match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
  if (slugMatch) return { owner: slugMatch[1], repo: slugMatch[2] };

  return null;
}

async function ghFetch(url: string) {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "freshcrate",
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Provide a GitHub URL or owner/repo" }, { status: 400 });
    }

    const parsed = parseRepo(url);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse GitHub repo from input" }, { status: 400 });
    }

    const { owner, repo } = parsed;

    // Fetch repo metadata + latest release in parallel
    const [repoData, releaseData] = await Promise.all([
      ghFetch(`https://api.github.com/repos/${owner}/${repo}`),
      ghFetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`),
    ]);

    if (!repoData) {
      return NextResponse.json({ error: `Repository ${owner}/${repo} not found` }, { status: 404 });
    }

    // Fall back to tags if no releases
    let version = "";
    let changes = "";
    let releaseDate = repoData.pushed_at;

    if (releaseData?.tag_name) {
      version = releaseData.tag_name;
      changes = (releaseData.body || "").slice(0, 500).replace(/\r?\n/g, " ");
      releaseDate = releaseData.published_at || releaseDate;
    } else {
      const tags = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`);
      if (tags?.[0]) {
        version = tags[0].name;
      }
    }

    const topics: string[] = repoData.topics || [];
    const language = repoData.language;
    const allTags = [...topics];
    if (language && !allTags.includes(language.toLowerCase())) {
      allTags.push(language.toLowerCase());
    }

    const enriched = {
      name: repoData.name.toLowerCase(),
      short_desc: (repoData.description || "").slice(0, 200),
      description: repoData.description || "",
      homepage_url: repoData.homepage || repoData.html_url,
      repo_url: repoData.html_url,
      license: repoData.license?.spdx_id || "Unknown",
      category: categorize(repoData.name, repoData.description || "", topics),
      author: owner,
      version: version || "0.0.0",
      changes,
      tags: allTags.slice(0, 10),
      // Extra metadata for the preview
      _meta: {
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        language,
        updated_at: repoData.updated_at,
        release_date: releaseDate,
        open_issues: repoData.open_issues_count,
      },
    };

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
