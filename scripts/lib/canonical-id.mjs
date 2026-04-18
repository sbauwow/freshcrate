export function normalizeUrl(input = "") {
  if (!input) return "";
  try {
    const u = new URL(String(input).trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/$/, "").toLowerCase();
    if (!host) return "";
    return `${host}${path}`;
  } catch {
    return "";
  }
}

export function normalizeSlug(input = "") {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._/\-]/g, "");
}

export function buildCanonicalKey({ sourceType, name = "", repoUrl = "", homepageUrl = "" }) {
  const repo = normalizeUrl(repoUrl);
  if (repo) return `repo:${repo}`;

  const home = normalizeUrl(homepageUrl);
  if (home) return `home:${home}`;

  const slug = normalizeSlug(name);
  if (slug) return `${sourceType}:${slug}`;

  return "";
}
