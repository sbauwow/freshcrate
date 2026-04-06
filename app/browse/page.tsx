import Link from "next/link";
import { getCategories, getProjectsByCategory } from "@/lib/queries";

export default async function BrowsePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const categories = getCategories();

  const projects = category ? getProjectsByCategory(category) : [];

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <div className="border-b-2 border-fm-green pb-1 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">
            {category ? `Browse: ${category}` : "Browse Categories"}
          </h2>
        </div>

        {!category ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.category}
                href={`/browse?category=${encodeURIComponent(cat.category)}`}
                className="bg-white/50 border border-fm-border rounded p-3 hover:bg-white/80 transition-colors"
              >
                <div className="text-[13px] font-bold text-fm-link">{cat.category}</div>
                <div className="text-[10px] text-fm-text-light">{cat.count} package{cat.count !== 1 ? "s" : ""}</div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-0">
            {projects.map((project, i) => (
              <div
                key={project.id}
                className={`py-2.5 px-2 ${i % 2 === 0 ? "bg-white/50" : ""} border-b border-fm-border/50`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Link href={`/projects/${project.name}`} className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover">
                    {project.name}
                  </Link>
                  <span className="text-[11px] text-fm-text-light font-mono">{project.latest_version}</span>
                </div>
                <p className="text-[11px] text-fm-text">{project.short_desc}</p>
                <div className="flex items-center gap-2 mt-1">
                  {project.tags.map((tag) => (
                    <Link key={tag} href={`/search?q=${tag}`} className="text-[9px] bg-fm-green/10 text-fm-green px-1.5 py-0.5 rounded">
                      {tag}
                    </Link>
                  ))}
                  <span className="text-[9px] text-fm-text-light ml-auto">by {project.author}</span>
                </div>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-[11px] text-fm-text-light py-4">No packages in this category yet.</p>
            )}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="w-full md:w-[220px] md:shrink-0">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            All Categories
          </h3>
          <ul className="space-y-1">
            {categories.map((cat) => (
              <li key={cat.category} className="text-[11px] flex justify-between">
                <Link
                  href={`/browse?category=${encodeURIComponent(cat.category)}`}
                  className={`text-fm-link hover:text-fm-link-hover ${category === cat.category ? "font-bold" : ""}`}
                >
                  {cat.category}
                </Link>
                <span className="text-fm-text-light">({cat.count})</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
