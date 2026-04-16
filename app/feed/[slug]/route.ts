import { buildAtomFeed } from "@/lib/feed-atom";
import { getCategories, getLatestReleases } from "@/lib/queries";

function slugifyCategory(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<Record<string, string>> }
) {
  const baseUrl = "https://freshcrate.ai";
  const routeParams = await params;
  const slug = typeof routeParams.slug === "string" ? routeParams.slug : "";

  if (!slug.endsWith(".xml")) {
    return new Response("Not found", { status: 404 });
  }

  const requestedCategory = slug.slice(0, -4).toLowerCase();
  const categories = getCategories();
  const matched = categories.find((c) => {
    const categorySlug = slugifyCategory(c.category);
    return categorySlug === requestedCategory || c.category.toLowerCase() === requestedCategory;
  });

  if (!matched) {
    return new Response("Category feed not found", { status: 404 });
  }

  const canonicalSlug = slugifyCategory(matched.category);
  const releases = getLatestReleases(50, 0, { category: matched.category });

  const feed = buildAtomFeed({
    id: `${baseUrl}/feed/${canonicalSlug}.xml`,
    selfHref: `${baseUrl}/feed/${canonicalSlug}.xml`,
    title: `freshcrate — ${matched.category}`,
    subtitle: `Latest releases in ${matched.category}`,
    baseUrl,
    releases,
  });

  return new Response(feed, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
