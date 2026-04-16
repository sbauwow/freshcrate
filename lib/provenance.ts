export type SourceType = "github" | "npm" | "pypi" | "manual";

export interface SourceProvenance {
  source_type: SourceType | string;
  source_package_id?: string;
  source_url?: string;
  canonical_key?: string;
  confidence?: number;
  imported_at?: string;
  matched_by?: string;
  extra?: Record<string, unknown>;
}

function normalizeUrl(input?: string): string {
  if (!input) return "";
  try {
    const u = new URL(input.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/$/, "").toLowerCase();
    if (!host) return "";
    return `${host}${path}`;
  } catch {
    return "";
  }
}

function normalizeSlug(input?: string): string {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._/\-]/g, "");
}

export function buildCanonicalKey(input: {
  sourceType: string;
  name?: string;
  repoUrl?: string;
  homepageUrl?: string;
}): string {
  const repo = normalizeUrl(input.repoUrl);
  if (repo) return `repo:${repo}`;

  const homepage = normalizeUrl(input.homepageUrl);
  if (homepage) return `home:${homepage}`;

  const slug = normalizeSlug(input.name);
  if (slug) return `${input.sourceType}:${slug}`;

  return "";
}

export function parseProvenanceJson(raw?: string | null): SourceProvenance | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SourceProvenance;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
