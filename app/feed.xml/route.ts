import { getLatestReleases } from "@/lib/queries";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function GET() {
  const releases = getLatestReleases(50, 0);
  const now = new Date().toISOString();
  const baseUrl = "https://freshcrate.ai";

  const entries = releases
    .map((r) => {
      const title = `${r.name} ${r.latest_version}`;
      const link = `${baseUrl}/projects/${encodeURIComponent(r.name)}`;
      const updated = r.release_date
        ? new Date(r.release_date).toISOString()
        : now;

      return `  <entry>
    <title>${escapeXml(title)}</title>
    <link href="${escapeXml(link)}" />
    <id>${escapeXml(link)}#${escapeXml(r.latest_version)}</id>
    <updated>${updated}</updated>
    <author><name>${escapeXml(r.author || "unknown")}</name></author>
    <category term="${escapeXml(r.category || "")}" />
    <content type="text">${escapeXml(r.latest_changes || "")}</content>
  </entry>`;
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>freshcrate</title>
  <link href="${baseUrl}" />
  <link rel="self" href="${baseUrl}/feed.xml" />
  <subtitle>Latest crate releases tracked by freshcrate</subtitle>
  <id>${baseUrl}/feed.xml</id>
  <updated>${now}</updated>
${entries}
</feed>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
