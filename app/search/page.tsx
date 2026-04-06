import Link from "next/link";
import { searchProjects } from "@/lib/queries";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const results = q ? searchProjects(q) : [];

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <div className="border-b-2 border-fm-green pb-1 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">
            {q ? `Search results for "${q}"` : "Search"}
          </h2>
        </div>

        {/* Search form */}
        <form action="/search" method="GET" className="mb-4 flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q || ""}
            placeholder="Search packages, tags, descriptions..."
            className="flex-1 px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green"
          />
          <button
            type="submit"
            className="bg-fm-green text-white text-[11px] px-4 py-1.5 rounded hover:bg-fm-green-light cursor-pointer"
          >
            Search
          </button>
        </form>

        {q && (
          <div className="text-[10px] text-fm-text-light mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </div>
        )}

        <div className="space-y-0">
          {results.map((project, i) => (
            <div
              key={project.id}
              className={`py-2.5 px-2 ${i % 2 === 0 ? "bg-white/50" : ""} border-b border-fm-border/50`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <Link href={`/projects/${project.name}`} className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover">
                  {project.name}
                </Link>
                <span className="text-[11px] text-fm-text-light font-mono">{project.latest_version}</span>
                <span className="text-[9px] text-fm-text-light">({project.category})</span>
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
        </div>

        {q && results.length === 0 && (
          <p className="text-[11px] text-fm-text-light py-4">No packages found matching &ldquo;{q}&rdquo;.</p>
        )}
      </div>
    </div>
  );
}
