import Link from "next/link";
import { getProjectByName, getProjectReleases, getLatestReleases } from "@/lib/queries";

function CompareRow({
  label,
  valA,
  valB,
  highlight = true,
}: {
  label: string;
  valA: React.ReactNode;
  valB: React.ReactNode;
  highlight?: boolean;
}) {
  const strA = typeof valA === "string" ? valA : "";
  const strB = typeof valB === "string" ? valB : "";
  const isDiff = highlight && strA !== strB;
  return (
    <tr className={isDiff ? "bg-[#fffbe6]" : ""}>
      <td className="py-1.5 px-2 font-bold text-fm-text-light border-b border-fm-border/30 w-[140px]">
        {label}
      </td>
      <td className="py-1.5 px-2 border-b border-fm-border/30">{valA}</td>
      <td className="py-1.5 px-2 border-b border-fm-border/30">{valB}</td>
    </tr>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;

  // If both params missing or incomplete, show the selection form
  if (!a || !b) {
    const allProjects = getLatestReleases(200, 0);

    return (
      <div>
        <div className="text-[10px] text-fm-text-light mb-3">
          <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
          {" > "}
          <span className="font-bold text-fm-text">Compare Packages</span>
        </div>

        <h2 className="text-[18px] font-bold text-fm-green border-b-2 border-fm-green pb-2 mb-4">
          Compare Packages
        </h2>

        <p className="text-[11px] text-fm-text mb-4">
          Select two packages to compare side-by-side.
        </p>

        <form action="/compare" method="GET" className="bg-fm-sidebar-bg border border-fm-border rounded p-4 max-w-[500px]">
          <div className="mb-3">
            <label className="text-[11px] font-bold text-fm-text block mb-1">Package A:</label>
            <select
              name="a"
              defaultValue={a || ""}
              className="text-[11px] border border-[#999] bg-white px-2 py-1 w-full outline-none"
            >
              <option value="">-- select package --</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.latest_version})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="text-[11px] font-bold text-fm-text block mb-1">Package B:</label>
            <select
              name="b"
              defaultValue={b || ""}
              className="text-[11px] border border-[#999] bg-white px-2 py-1 w-full outline-none"
            >
              <option value="">-- select package --</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.latest_version})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="text-[11px] font-bold px-4 py-1 border border-[#999] bg-[#dddddd] text-black cursor-pointer hover:bg-[#cccccc]"
          >
            Compare
          </button>
        </form>
      </div>
    );
  }

  // Look up both projects
  const projectA = getProjectByName(a);
  const projectB = getProjectByName(b);

  if (!projectA || !projectB) {
    return (
      <div>
        <div className="text-[10px] text-fm-text-light mb-3">
          <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
          {" > "}
          <Link href="/compare" className="text-fm-link hover:text-fm-link-hover">Compare</Link>
          {" > "}
          <span className="font-bold text-fm-text">Not Found</span>
        </div>

        <h2 className="text-[18px] font-bold text-fm-green border-b-2 border-fm-green pb-2 mb-4">
          Package Not Found
        </h2>

        <p className="text-[11px] text-fm-text mb-2">
          {!projectA && <>Could not find package <strong>&quot;{a}&quot;</strong>. </>}
          {!projectB && <>Could not find package <strong>&quot;{b}&quot;</strong>. </>}
        </p>
        <Link href="/compare" className="text-[11px] text-fm-link hover:text-fm-link-hover">
          &larr; Try again
        </Link>
      </div>
    );
  }

  const releasesA = getProjectReleases(projectA.id);
  const releasesB = getProjectReleases(projectB.id);

  // Compute overlapping tags
  const tagsA = new Set(projectA.tags);
  const tagsB = new Set(projectB.tags);
  const overlapping = projectA.tags.filter((t) => tagsB.has(t));

  const linkCell = (url: string | undefined | null) =>
    url ? (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-fm-link hover:text-fm-link-hover">
        {url.replace(/^https?:\/\//, "").slice(0, 50)}{url.length > 58 ? "…" : ""}
      </a>
    ) : (
      <span className="text-fm-text-light">—</span>
    );

  const tagBadges = (tags: string[], highlights: Set<string>) =>
    tags.length > 0 ? (
      <span className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <span
            key={t}
            className={`text-[9px] px-1.5 py-0.5 rounded ${
              highlights.has(t)
                ? "bg-fm-green/20 text-fm-green font-bold"
                : "bg-fm-green/10 text-fm-green"
            }`}
          >
            {t}
          </span>
        ))}
      </span>
    ) : (
      <span className="text-fm-text-light">—</span>
    );

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-[10px] text-fm-text-light mb-3">
        <Link href="/" className="text-fm-link hover:text-fm-link-hover">Home</Link>
        {" > "}
        <Link href="/compare" className="text-fm-link hover:text-fm-link-hover">Compare</Link>
        {" > "}
        <span className="font-bold text-fm-text">{projectA.name} vs {projectB.name}</span>
      </div>

      <h2 className="text-[18px] font-bold text-fm-green border-b-2 border-fm-green pb-2 mb-4">
        {projectA.name} vs {projectB.name}
      </h2>

      {/* Comparison table */}
      <div className="overflow-x-auto">
      <table className="w-full text-[11px] text-fm-text border-collapse mb-6">
        <thead>
          <tr className="border-b-2 border-fm-green">
            <th className="py-1.5 px-2 text-left text-fm-green font-bold w-[140px]">Field</th>
            <th className="py-1.5 px-2 text-left text-fm-green font-bold">
              <Link href={`/projects/${projectA.name}`} className="text-fm-green hover:text-fm-link-hover">
                {projectA.name}
              </Link>
            </th>
            <th className="py-1.5 px-2 text-left text-fm-green font-bold">
              <Link href={`/projects/${projectB.name}`} className="text-fm-green hover:text-fm-link-hover">
                {projectB.name}
              </Link>
            </th>
          </tr>
        </thead>
        <tbody>
          <CompareRow label="Name" valA={projectA.name} valB={projectB.name} highlight={false} />
          <CompareRow
            label="Description"
            valA={projectA.short_desc}
            valB={projectB.short_desc}
            highlight={false}
          />
          <CompareRow
            label="Version"
            valA={<span className="font-mono font-bold">{projectA.latest_version}</span>}
            valB={<span className="font-mono font-bold">{projectB.latest_version}</span>}
            highlight={false}
          />
          <CompareRow label="Category" valA={projectA.category} valB={projectB.category} />
          <CompareRow label="License" valA={projectA.license} valB={projectB.license} />
          <CompareRow label="Author" valA={projectA.author} valB={projectB.author} />
          <CompareRow
            label="Releases"
            valA={String(releasesA.length)}
            valB={String(releasesB.length)}
          />
          <CompareRow
            label="Last Release"
            valA={projectA.release_date ? new Date(projectA.release_date).toLocaleDateString() : "—"}
            valB={projectB.release_date ? new Date(projectB.release_date).toLocaleDateString() : "—"}
          />
          <CompareRow
            label="Latest Urgency"
            valA={projectA.latest_urgency || "—"}
            valB={projectB.latest_urgency || "—"}
          />
          <CompareRow
            label="Homepage"
            valA={linkCell(projectA.homepage_url)}
            valB={linkCell(projectB.homepage_url)}
            highlight={false}
          />
          <CompareRow
            label="Repository"
            valA={linkCell(projectA.repo_url)}
            valB={linkCell(projectB.repo_url)}
            highlight={false}
          />
          <tr>
            <td className="py-1.5 px-2 font-bold text-fm-text-light border-b border-fm-border/30 w-[140px] align-top">
              Tags
            </td>
            <td className="py-1.5 px-2 border-b border-fm-border/30">
              {tagBadges(projectA.tags, tagsB)}
            </td>
            <td className="py-1.5 px-2 border-b border-fm-border/30">
              {tagBadges(projectB.tags, tagsA)}
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      {/* Overlapping tags */}
      {overlapping.length > 0 && (
        <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4 max-w-[500px]">
          <h3 className="text-[11px] font-bold text-fm-green mb-2">
            Shared Tags ({overlapping.length})
          </h3>
          <div className="flex flex-wrap gap-1">
            {overlapping.map((t) => (
              <Link
                key={t}
                href={`/search?q=${t}`}
                className="text-[9px] bg-fm-green/20 text-fm-green font-bold px-1.5 py-0.5 rounded hover:bg-fm-green/30"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Compare again link */}
      <div className="text-[11px] mt-4">
        <Link href="/compare" className="text-fm-link hover:text-fm-link-hover">
          &larr; Compare different packages
        </Link>
      </div>
    </div>
  );
}
