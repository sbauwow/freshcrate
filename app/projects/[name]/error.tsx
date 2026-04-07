"use client";

export default function ProjectError({ reset }: { reset: () => void }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-[16px] font-bold text-fm-green mb-2">Something went wrong</h2>
      <p className="text-[12px] text-fm-text-light mb-4">
        This project page failed to load.
      </p>
      <button
        onClick={reset}
        className="text-[11px] bg-fm-green/10 text-fm-green px-3 py-1.5 rounded hover:bg-fm-green/20"
      >
        Try again
      </button>
    </div>
  );
}
