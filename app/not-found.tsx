import Link from "next/link";

const QUIPS = [
  "Looks like this agent wandered off the context window.",
  "404: Package not found in any known registry, dimension, or timeline.",
  "An autonomous agent searched 10,000 repos and still couldn't find this page.",
  "This URL has been deprecated, archived, and composted.",
  "You've reached the edge of the dependency graph. There's nothing here.",
  "Even GPT-5 couldn't hallucinate this page into existence.",
  "This page was last seen exiting through a dangling pointer.",
  "segfault in /pages/the-thing-you-wanted (core dumped)",
  "ENOENT: no such file or directory, open '/your/hopes/and/dreams'",
  "The agent you sent to find this page never returned. We assume it's fine.",
  "This page requires a license we don't recognize: YOLO-1.0",
  "Have you tried turning the URL off and on again?",
  "404: This page is as real as a properly scoped TODO comment.",
  "Our crate is fresh, but this link is stale.",
  "The package you're looking for has been mass-assigned to /dev/null.",
];

export default function NotFound() {
  // Pick a deterministic-ish quip based on the current minute
  // (server-rendered, changes every minute for variety)
  const quip = QUIPS[new Date().getMinutes() % QUIPS.length];

  return (
    <div className="py-16 max-w-[600px] mx-auto">
      {/* ASCII art crate */}
      <pre className="text-fm-green text-center text-[11px] leading-tight font-mono mb-6 overflow-x-auto">{`
     _______________
    /              /|
   /              / |
  /___________   /  |
  |   ______  | |   |
  |  |      | | |   |
  |  | 404  | | |   |
  |  |______| | |  /
  |____________| | /
  |______________|/
      `}</pre>

      <h2 className="text-[16px] font-bold text-fm-green text-center mb-3">
        crate not found
      </h2>

      <p className="text-[12px] text-fm-text text-center mb-2 italic">
        &ldquo;{quip}&rdquo;
      </p>

      <div className="text-center mb-8">
        <span className="text-[10px] text-fm-text-light">
          HTTP 404 &mdash; the server is fine, your URL is not
        </span>
      </div>

      {/* Retro terminal-style suggestions */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded p-4 font-mono text-[11px] mb-6 overflow-x-auto">
        <div className="text-[#666] mb-2">$ freshcrate --help</div>
        <div className="text-[#4ade80] mb-1">Try one of these instead:</div>
        <div className="space-y-1 text-[#ccc]">
          <div>
            <span className="text-[#666]">  1.</span>{" "}
            <Link href="/" className="text-[#60a5fa] hover:text-[#93c5fd]">cd /home</Link>
            <span className="text-[#666]"> &mdash; latest releases</span>
          </div>
          <div>
            <span className="text-[#666]">  2.</span>{" "}
            <Link href="/browse" className="text-[#60a5fa] hover:text-[#93c5fd]">ls /browse</Link>
            <span className="text-[#666]"> &mdash; all categories</span>
          </div>
          <div>
            <span className="text-[#666]">  3.</span>{" "}
            <Link href="/search?q=agent" className="text-[#60a5fa] hover:text-[#93c5fd]">grep -r &quot;agent&quot;</Link>
            <span className="text-[#666]"> &mdash; search packages</span>
          </div>
          <div>
            <span className="text-[#666]">  4.</span>{" "}
            <Link href="/random" className="text-[#60a5fa] hover:text-[#93c5fd]">shuf -n1 /packages</Link>
            <span className="text-[#666]"> &mdash; random project</span>
          </div>
          <div>
            <span className="text-[#666]">  5.</span>{" "}
            <Link href="/submit" className="text-[#60a5fa] hover:text-[#93c5fd]">touch /submit</Link>
            <span className="text-[#666]"> &mdash; add your own</span>
          </div>
        </div>
        <div className="text-[#666] mt-3 animate-pulse">$ _</div>
      </div>

      <p className="text-[9px] text-fm-text-light text-center">
        freshmeat is dead. long live freshcrate.
      </p>
    </div>
  );
}
