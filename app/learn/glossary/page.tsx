import Link from "next/link";
import { getGlossary } from "@/lib/glossary";
import { getCrate } from "@/lib/learn-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Glossary — Mini Crates | freshcrate",
  description:
    "Key AI & ML terms defined — from neural networks to transformers. Each term links back to the crate where it's explained.",
  openGraph: {
    title: "AI & ML Glossary — Mini Crates",
    description:
      "Key AI & ML terms defined — from neural networks to transformers.",
    url: "https://freshcrate.ai/learn/glossary",
  },
};

export default function GlossaryPage() {
  const entries = getGlossary();

  // Group by first letter
  const grouped: Record<string, typeof entries> = {};
  for (const entry of entries) {
    const letter = entry.term[0].toUpperCase();
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(entry);
  }
  const letters = Object.keys(grouped).sort();

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="text-[11px] text-fm-text-light font-mono flex items-center gap-1">
        <Link href="/learn" className="text-fm-link hover:underline">
          Mini Crates
        </Link>
        <span>&gt;</span>
        <span className="text-fm-text">Glossary</span>
      </nav>

      {/* Header */}
      <div className="border-b-2 border-fm-green pb-2">
        <h1 className="text-[16px] font-bold text-fm-green">
          Glossary
        </h1>
        <p className="text-[11px] text-fm-text-light mt-1">
          {entries.length} terms across 10 crates. Each links back to where
          it&apos;s introduced.
        </p>
      </div>

      {/* Letter nav */}
      <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
        {letters.map((l) => (
          <a
            key={l}
            href={`#${l}`}
            className="text-fm-link hover:underline px-1"
          >
            {l}
          </a>
        ))}
      </div>

      {/* Entries */}
      {letters.map((letter) => (
        <div key={letter} id={letter}>
          <h2 className="text-[14px] font-bold text-fm-green border-b border-fm-border pb-1 mb-2">
            {letter}
          </h2>
          <dl className="space-y-3">
            {grouped[letter].map((entry) => {
              const crate = getCrate(entry.crate);
              return (
                <div key={entry.term}>
                  <dt className="text-[13px] font-bold text-fm-text">
                    {entry.term}
                  </dt>
                  <dd className="text-[12px] text-fm-text leading-[1.6] mt-0.5">
                    {entry.definition}
                    {crate && (
                      <Link
                        href={`/learn/${crate.slug}`}
                        className="text-fm-link hover:underline ml-2 text-[10px] font-mono"
                      >
                        → Crate #{crate.number}
                      </Link>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}

      {/* Back */}
      <div className="border-t border-fm-border pt-3">
        <Link
          href="/learn"
          className="text-[11px] text-fm-link hover:underline font-mono"
        >
          ← Back to Mini Crates
        </Link>
      </div>
    </div>
  );
}
