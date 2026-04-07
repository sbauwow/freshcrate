import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCrate,
  getAllCrates,
  getDifficultyLabel,
  getDifficultyColor,
  type MiniCrate,
} from "@/lib/learn-content";
import { CrateCompleteToggle } from "@/app/components/crate-progress";

export async function generateStaticParams() {
  return getAllCrates().map((crate) => ({ slug: crate.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const crate = getCrate(slug);
  if (!crate) return { title: "Not Found | freshcrate" };
  return {
    title: `Crate #${crate.number}: ${crate.title} — Mini Crates | freshcrate`,
    description: crate.subtitle,
  };
}

function getPreviousCrate(current: MiniCrate): MiniCrate | undefined {
  const all = getAllCrates();
  const idx = all.findIndex((c) => c.slug === current.slug);
  return idx > 0 ? all[idx - 1] : undefined;
}

function getNextCrate(current: MiniCrate): MiniCrate | undefined {
  if (!current.nextCrate) return undefined;
  return getCrate(current.nextCrate);
}

export default async function CratePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const crate = getCrate(slug);
  if (!crate) notFound();

  const prev = getPreviousCrate(crate);
  const next = getNextCrate(crate);
  const prereqs = crate.prerequisites
    .map((s) => getCrate(s))
    .filter(Boolean) as MiniCrate[];

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* ── Breadcrumb ── */}
      <nav className="text-[11px] text-fm-text-light font-mono flex items-center gap-1 flex-wrap">
        <Link href="/learn" className="text-fm-link hover:underline">
          Mini Crates
        </Link>
        <span>&gt;</span>
        <span>Crate #{crate.number}</span>
        <span>&gt;</span>
        <span className="text-fm-text">{crate.title}</span>
      </nav>

      {/* ── Header ── */}
      <div className="border border-[#6f6f6f] bg-[#dddddd] rounded p-4">
        <div className="flex items-start gap-3">
          <span className="text-[32px] leading-none shrink-0">
            {crate.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-[16px] font-bold text-fm-text leading-tight">
              Crate #{crate.number}: {crate.title}
            </h1>
            <p className="text-[13px] text-fm-text-light mt-0.5 italic">
              {crate.subtitle}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-mono ${getDifficultyColor(crate.difficulty)}`}
              >
                {getDifficultyLabel(crate.difficulty)}
              </span>
              <span className="text-[10px] text-fm-text-light font-mono">
                ⏱ ~{crate.estimatedMinutes} min
              </span>
              <span className="ml-auto">
                <CrateCompleteToggle slug={crate.slug} />
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {crate.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[9px] bg-fm-green/10 text-fm-green px-1.5 py-0.5 rounded font-mono"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Prerequisites ── */}
      {prereqs.length > 0 && (
        <div className="border border-[#6f6f6f] bg-[#dddddd] rounded p-3">
          <h2 className="text-[11px] font-bold text-fm-text mb-1.5">
            📋 Prerequisites
          </h2>
          <ul className="space-y-1">
            {prereqs.map((p) => (
              <li key={p.slug} className="text-[12px]">
                <Link
                  href={`/learn/${p.slug}`}
                  className="text-fm-link hover:underline"
                >
                  {p.emoji} Crate #{p.number}: {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Content Sections ── */}
      <div className="space-y-5">
        {crate.sections.map((section, i) => (
          <div key={i}>
            <h2 className="text-[14px] font-bold text-fm-text border-b border-fm-border pb-1 mb-3">
              {section.heading}
            </h2>
            <div className="text-[13px] text-fm-text leading-[1.7] space-y-3">
              {section.body.split("\n\n").map((paragraph, j) => (
                <p key={j} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Think About It ── */}
      <div className="border border-[#6f6f6f] bg-[#dddddd] rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-3">
          🤔 Think About It
        </h2>
        <ol className="list-decimal list-inside space-y-2">
          {crate.thinkAboutIt.map((q, i) => (
            <li
              key={i}
              className="text-[13px] text-fm-text leading-[1.6] pl-1"
            >
              {q}
            </li>
          ))}
        </ol>
      </div>

      {/* ── Try This ── */}
      <div className="border border-[#6f6f6f] bg-[#dddddd] rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-text mb-3">
          🔬 Try This
        </h2>
        <ol className="list-decimal list-inside space-y-2">
          {crate.tryThis.map((activity, i) => (
            <li
              key={i}
              className="text-[13px] text-fm-text leading-[1.6] pl-1"
            >
              {activity}
            </li>
          ))}
        </ol>
      </div>

      {/* ── Fun Fact ── */}
      <div className="border-2 border-fm-green bg-fm-green/5 rounded p-4">
        <h2 className="text-[14px] font-bold text-fm-green mb-2">
          🎯 Fun Fact
        </h2>
        <p className="text-[13px] text-fm-text leading-[1.7]">
          {crate.funFact}
        </p>
      </div>

      {/* ── Previous / Next Navigation ── */}
      <div className="border-t border-fm-border pt-3 flex items-center justify-between">
        {prev ? (
          <Link
            href={`/learn/${prev.slug}`}
            className="text-[11px] text-fm-link hover:underline font-mono"
          >
            ← Crate #{prev.number}: {prev.title}
          </Link>
        ) : (
          <Link
            href="/learn"
            className="text-[11px] text-fm-link hover:underline font-mono"
          >
            ← All Crates
          </Link>
        )}
        {next ? (
          <Link
            href={`/learn/${next.slug}`}
            className="text-[11px] text-fm-link hover:underline font-mono"
          >
            Crate #{next.number}: {next.title} →
          </Link>
        ) : (
          <Link
            href="/learn"
            className="text-[11px] text-fm-link hover:underline font-mono"
          >
            All Crates →
          </Link>
        )}
      </div>
    </div>
  );
}
