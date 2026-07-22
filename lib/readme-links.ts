/**
 * Resolve relative links inside rendered README HTML.
 *
 * READMEs arrive with repo-relative hrefs/srcs ("docs/setup.md",
 * "./BENCHMARK.md", "/CONTRIBUTING.md"). Rendered under /projects/<name> those
 * resolve against OUR origin and turn into phantom /projects/<...> paths that
 * crawlers then hammer and humans dead-end on. Every relative link must be
 * re-anchored somewhere that is not our origin:
 *
 *   - GitHub repo  → github.com blob URLs (hrefs) / raw.githubusercontent (imgs)
 *   - GitLab repo  → gitlab.com /-/blob (hrefs) / /-/raw (imgs)
 *   - any other repo_url, else homepage_url → resolved against that origin
 *   - nothing usable → the link is made inert (dropped to a data-attr / empty
 *     src) so it can never resolve to our origin
 *
 * Absolute URLs, protocol-relative URLs, and in-page #anchors always pass
 * through untouched.
 */

const GITHUB_RE = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)/i;
const GITLAB_RE = /^https?:\/\/(?:www\.)?gitlab\.com\/([^#?]+?)(?:\.git)?\/?$/i;
const ATTR_RE = /\b(href|src)=(["'])([^"']*)\2/gi;
const PASS_THROUGH_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

interface Bases {
  href: string; // base for anchor links
  src: string; // base for images
}

/** Compute where relative links should be re-anchored, or null if nowhere. */
function computeBases(repoUrl: string | null | undefined, homepageUrl?: string | null): Bases | null {
  const repo = (repoUrl || "").trim();

  const gh = repo.match(GITHUB_RE);
  if (gh) {
    const owner = gh[1];
    const name = gh[2].replace(/\.git$/, "");
    return {
      href: `https://github.com/${owner}/${name}/blob/HEAD/`,
      src: `https://raw.githubusercontent.com/${owner}/${name}/HEAD/`,
    };
  }

  const gl = repo.match(GITLAB_RE);
  if (gl) {
    const proj = gl[1].replace(/\/$/, "");
    return {
      href: `https://gitlab.com/${proj}/-/blob/HEAD/`,
      src: `https://gitlab.com/${proj}/-/raw/HEAD/`,
    };
  }

  // Any other repo host (Gitea, Codeberg, SourceHut, self-hosted, npm-only
  // homepage...) — re-anchor against the URL's own origin. Not always a valid
  // deep link, but it keeps the crawl off our origin, which is the point.
  for (const candidate of [repo, (homepageUrl || "").trim()]) {
    if (!candidate) continue;
    try {
      const u = new URL(candidate);
      if (u.protocol !== "http:" && u.protocol !== "https:") continue;
      const base = candidate.endsWith("/") ? candidate : candidate + "/";
      return { href: base, src: base };
    } catch {
      // not a usable absolute URL — try the next candidate
    }
  }

  return null;
}

export function resolveReadmeLinks(
  html: string,
  repoUrl: string | null | undefined,
  homepageUrl?: string | null,
): string {
  if (!html) return "";

  const bases = computeBases(repoUrl, homepageUrl);

  return html.replace(ATTR_RE, (full, attr: string, quote: string, url: string) => {
    if (!url || PASS_THROUGH_RE.test(url)) return full;
    const isSrc = attr.toLowerCase() === "src";
    // Treat repo-absolute ("/CONTRIBUTING.md") as repo-root-relative.
    const rel = url.replace(/^\.\//, "").replace(/^\//, "");
    if (!rel) return full;

    if (!bases) {
      // Nowhere safe to point it. Make it inert so it never hits our origin:
      // drop the href (anchor renders as text) / blank the image src.
      return `data-fc-rel=${quote}${url}${quote}`;
    }

    try {
      const resolved = new URL(rel, isSrc ? bases.src : bases.href).href;
      return `${attr}=${quote}${resolved}${quote}`;
    } catch {
      return `data-fc-rel=${quote}${url}${quote}`;
    }
  });
}
