import type { ProjectWithRelease } from "@/lib/queries";

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildAtomFeed(params: {
  id: string;
  selfHref: string;
  title: string;
  subtitle: string;
  baseUrl: string;
  releases: ProjectWithRelease[];
}): string {
  const now = new Date().toISOString();

  const entries = params.releases
    .map((r) => {
      const projectLink = `${params.baseUrl}/projects/${encodeURIComponent(r.name)}`;
      const updated = r.release_date ? new Date(r.release_date).toISOString() : now;
      const title = `${r.name} ${r.latest_version}`;

      return `  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(projectLink)}" />
    <id>${escapeXml(projectLink)}#${escapeXml(r.latest_version)}</id>
    <updated>${updated}</updated>
    <author><name>${escapeXml(r.author || "unknown")}</name></author>
    <category term="${escapeXml(r.category || "")}" />
    <content type="text">${escapeXml(r.latest_changes || "")}</content>
  </entry>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(params.title)}</title>
  <link href="${escapeXml(params.baseUrl)}" />
  <link rel="self" href="${escapeXml(params.selfHref)}" />
  <subtitle>${escapeXml(params.subtitle)}</subtitle>
  <id>${escapeXml(params.id)}</id>
  <updated>${now}</updated>
${entries}
</feed>`;
}
