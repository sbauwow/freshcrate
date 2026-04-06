import { MetadataRoute } from "next";
import { getLatestReleases, getCategories } from "@/lib/queries";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://freshcrate.club";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/browse`, changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/submit`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/api`, changeFrequency: "monthly", priority: 0.5 },
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

  return [...staticPages, ...projectPages, ...categoryPages];
}
