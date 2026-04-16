import { buildAtomFeed } from "@/lib/feed-atom";
import { getLatestVerifiedReleases } from "@/lib/queries";

export function GET() {
  const baseUrl = "https://freshcrate.ai";
  const releases = getLatestVerifiedReleases(50, 0);

  const feed = buildAtomFeed({
    id: `${baseUrl}/feed/verified.xml`,
    selfHref: `${baseUrl}/feed/verified.xml`,
    title: "freshcrate — verified",
    subtitle: "Latest releases from verified projects",
    baseUrl,
    releases,
  });

  return new Response(feed, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
