import { getLatestReleases } from "@/lib/queries";
import { buildAtomFeed } from "@/lib/feed-atom";

export function GET() {
  const baseUrl = "https://freshcrate.ai";
  const releases = getLatestReleases(50, 0);

  const feed = buildAtomFeed({
    id: `${baseUrl}/feed.xml`,
    selfHref: `${baseUrl}/feed.xml`,
    title: "freshcrate",
    subtitle: "Latest crate releases tracked by freshcrate",
    baseUrl,
    releases,
  });

  return new Response(feed, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
