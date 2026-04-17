import { MetadataRoute } from "next";
import { getLatestReleases, getCategories, getAuthors, getTags } from "@/lib/queries";
import { getAllCrates } from "@/lib/learn-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://freshcrate.ai";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/browse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/submit`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/orchestra`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/legislation`, changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/api`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/learn`, changeFrequency: "monthly", priority: 0.7 },
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

  // Author pages
  const authorPages: MetadataRoute.Sitemap = getAuthors().map((a) => ({
    url: `${baseUrl}/author/${encodeURIComponent(a.author)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Tag pages
  const tagPages: MetadataRoute.Sitemap = getTags().map((t) => ({
    url: `${baseUrl}/tag/${encodeURIComponent(t.tag)}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...projectPages, ...categoryPages, ...cratePages, ...authorPages, ...tagPages];
}
