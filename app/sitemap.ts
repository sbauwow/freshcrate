import { MetadataRoute } from "next";
import { cleanAuthor } from "@/lib/author-slug";
import { getLatestReleases, getCategories, getAuthors, getTags } from "@/lib/queries";
import { getAllCrates } from "@/lib/learn-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.freshcrate.ai";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/browse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/submit`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/agent-edition`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/orchestra`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/legislation`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/security`, changeFrequency: "hourly", priority: 0.7 },
    { url: `${baseUrl}/api`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/mcp`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/learn`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/resources`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/learn/best-mcp-servers-for-claude-code`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/learn/best-open-source-ai-agent-frameworks`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/learn/best-coding-agents`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/learn/best-browser-automation-tools-for-ai-agents`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/learn/best-rag-memory-tools-for-agents`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/learn/best-ai-agent-observability-tools`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/learn/ai-agent-stack-map`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/compare/langgraph-vs-crewai-vs-autogen`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/learn/glossary`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Project pages
  const projects = getLatestReleases(500, 0);
  const projectPages: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${baseUrl}/projects/${p.name}`,
    lastModified: p.release_date,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Category pages
  const categories = getCategories();
  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/browse?category=${encodeURIComponent(c.category)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Learn / Mini Crates pages
  const cratePages: MetadataRoute.Sitemap = getAllCrates().map((c) => ({
    url: `${baseUrl}/learn/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Author pages — dedupe on cleaned name to avoid leaking emails into URLs
  const seenAuthors = new Set<string>();
  const authorPages: MetadataRoute.Sitemap = [];
  for (const a of getAuthors()) {
    const slug = cleanAuthor(a.author);
    if (!slug || seenAuthors.has(slug)) continue;
    seenAuthors.add(slug);
    authorPages.push({
      url: `${baseUrl}/author/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    });
  }

  // Tag pages
  const tagPages: MetadataRoute.Sitemap = getTags().map((t) => ({
    url: `${baseUrl}/tag/${encodeURIComponent(t.tag)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...projectPages, ...categoryPages, ...cratePages, ...authorPages, ...tagPages];
}
