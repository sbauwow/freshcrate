import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { computeLifecycle } from "@/lib/lifecycle";
import { getProjectsByAuthor } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const author = decodeURIComponent(name);
  return {
    title: `freshcrate — ${author}`,
    description: `Projects published by ${author} on freshcrate.`,
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const author = decodeURIComponent(name);
  const projects = getProjectsByAuthor(author);

  if (projects.length === 0) {
    notFound();
  }

  const totalStars = projects.reduce((sum, p) => sum + (p.stars || 0), 0);
  const languageSet = new Set(projects.map((p) => p.language).filter(Boolean));
  const categorySet = new Set(projects.map((p) => p.category).filter(Boolean));

  return (
    <div className="flex flex-col md:flex-row gap-5">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-fm-text-light mb-3">
          <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
          {" > "}
          <span className="font-bold text-fm-text">{author}</span>
        </div>

        <div className="border-b-2 border-fm-green pb-2 mb-3">
          <h2 className="text-[14px] font-bold text-fm-green">Projects by {author}</h2>
          <p className="text-[10px] text-fm-text-light mt-1">
            {projects.length} package{projects.length !== 1 ? "s" : ""} • ⭐ {totalStars.toLocaleString()} total stars
          </p>
        </div>

        <div className="space-y-0">
          {projects.map((project, i) => {
            const lc = computeLifecycle({
              stars: project.stars ?? 0,
              forks: project.forks ?? 0,
              releaseCount: project.release_count ?? 1,
              lastReleaseDate: project.release_date,
              createdAt: project.created_at,
              verified: !!project.verified,
              license: project.license,
            });

            return (
              <div
                key={project.id}
                className={`py-2.5 px-2 ${i % 2 === 0 ? "bg-white/50" : ""} border-b border-fm-border/50`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Link
                    href={`/projects/${project.name}`}
                    className="text-[13px] font-bold text-fm-link hover:text-fm-link-hover"
                  >
                    {project.name}
                  </Link>
                  <span className="text-[11px] text-fm-text-light font-mono">{project.latest_version}</span>
                  <span className={`${lc.color} ${lc.textColor} px-1.5 py-0.5 rounded text-[9px] font-bold`} title={lc.reason}>
                    {lc.emoji} {lc.label}
                  </span>
                  {(project.stars ?? 0) > 0 && (
                    <span className="text-[9px] text-fm-text-light">⭐{project.stars.toLocaleString()}</span>
                  )}
                </div>

                <p className="text-[11px] text-fm-text">{project.short_desc}</p>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {project.tags.slice(0, 8).map((tag) => (
                    <Link
                      key={tag}
                      href={`/tag/${encodeURIComponent(tag)}`}
                      className="text-[9px] bg-[#bbddff]/50 text-fm-link px-1.5 py-0.5 rounded hover:bg-[#bbddff]"
                    >
                      {tag}
                    </Link>
                  ))}
                  <Link
                    href={`/browse?category=${encodeURIComponent(project.category)}`}
                    className="text-[9px] text-fm-link hover:text-fm-link-hover ml-auto"
                  >
                    {project.category}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="w-full md:w-[220px] md:shrink-0">
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Maintainer Snapshot
          </h3>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-fm-text-light">Packages:</span>
              <span className="font-bold">{projects.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Total stars:</span>
              <span className="font-bold">{totalStars.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Languages:</span>
              <span className="font-bold">{languageSet.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-fm-text-light">Categories:</span>
              <span className="font-bold">{categorySet.size}</span>
            </div>
          </div>
        </div>

        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3">
          <h3 className="text-[11px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            Jump
          </h3>
          <div className="text-[11px] space-y-1">
            <Link href={`/search?author=${encodeURIComponent(author)}`} className="block text-fm-link hover:text-fm-link-hover">
              View in search
            </Link>
            <Link href="/browse" className="block text-fm-link hover:text-fm-link-hover">
              Browse categories
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}
