"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "freshcrate:mini-crates:completed";

function getCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveCompleted(set: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/**
 * Hook: returns [completedSet, toggleSlug, resetAll]
 */
export function useCrateProgress() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    setCompleted(getCompleted());
  }, []);

  const toggle = useCallback((slug: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      saveCompleted(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    const empty = new Set<string>();
    saveCompleted(empty);
    setCompleted(empty);
  }, []);

  return { completed, toggle, resetAll } as const;
}

/**
 * Progress bar for the /learn index page.
 * Renders the colored bar segments + count.
 */
export function ProgressBar({
  slugs,
}: {
  slugs: { slug: string; number: number; title: string; difficulty: string }[];
}) {
  const { completed, toggle } = useCrateProgress();
  const count = slugs.filter((s) => completed.has(s.slug)).length;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold text-fm-text">Your Progress</h3>
        <span className="text-[9px] text-fm-text-light font-mono">
          {count} / {slugs.length} completed
        </span>
      </div>
      <div className="flex gap-1">
        {slugs.map((crate) => {
          const done = completed.has(crate.slug);
          return (
            <button
              key={crate.slug}
              onClick={() => toggle(crate.slug)}
              className={`flex-1 h-3 rounded-sm border transition-colors cursor-pointer ${
                done
                  ? crate.difficulty === "starter"
                    ? "bg-green-400 border-green-500"
                    : crate.difficulty === "builder"
                      ? "bg-blue-400 border-blue-500"
                      : "bg-purple-400 border-purple-500"
                  : "border-fm-border/50 bg-white/60 hover:bg-fm-green/30"
              }`}
              title={`Crate ${crate.number}: ${crate.title}${done ? " ✓" : ""}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] text-fm-text-light">🌱 Starter</span>
        <span className="text-[8px] text-fm-text-light">🔧 Builder</span>
        <span className="text-[8px] text-fm-text-light">🏗️ Architect</span>
      </div>
    </>
  );
}

/**
 * "Mark as completed" toggle button for individual crate pages.
 */
export function CrateCompleteToggle({ slug }: { slug: string }) {
  const { completed, toggle } = useCrateProgress();
  const done = completed.has(slug);

  return (
    <button
      onClick={() => toggle(slug)}
      className={`text-[12px] font-mono px-3 py-1.5 rounded border transition-colors cursor-pointer ${
        done
          ? "bg-fm-green text-white border-fm-green hover:bg-fm-green/80"
          : "bg-white text-fm-text border-fm-border hover:border-fm-green hover:text-fm-green"
      }`}
    >
      {done ? "✓ Completed" : "Mark as completed"}
    </button>
  );
}
