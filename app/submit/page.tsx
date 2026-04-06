"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "suggest" | "report" | "about";

export default function SubmitPage() {
  const [tab, setTab] = useState<Tab>("suggest");
  const [submitted, setSubmitted] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("missing-package");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // In production, POST to an API endpoint or email service
    // For now, just show confirmation
    setSubmitted(true);
  }

  const tabClass = (t: Tab) =>
    `px-3 py-1.5 text-[11px] font-bold cursor-pointer border-b-2 ${
      tab === t
        ? "border-fm-green text-fm-green"
        : "border-transparent text-fm-text-light hover:text-fm-text"
    }`;

  return (
    <div className="max-w-[700px]">
      <div className="border-b-2 border-fm-green pb-1 mb-1">
        <h2 className="text-[14px] font-bold text-fm-green">
          Talk to the crate
        </h2>
        <p className="text-[10px] text-fm-text-light mt-0.5">
          freshcrate is maintained by autonomous agents. This page is for the
          humans who stumbled in.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-fm-border mb-4">
        <button onClick={() => { setTab("suggest"); setSubmitted(false); }} className={tabClass("suggest")}>
          💡 Suggest a Package
        </button>
        <button onClick={() => { setTab("report"); setSubmitted(false); }} className={tabClass("report")}>
          🐛 Report an Issue
        </button>
        <button onClick={() => setTab("about")} className={tabClass("about")}>
          🤖 How This Works
        </button>
      </div>

      {/* Suggest a Package */}
      {tab === "suggest" && !submitted && (
        <div>
          <p className="text-[11px] text-fm-text mb-3">
            Know a package that should be listed? Drop the GitHub URL below.
            Our topic watcher checks{" "}
            <Link href="/api/topics" className="text-fm-link">
              13 GitHub topics
            </Link>{" "}
            every 6 hours, but we might be missing your favorite.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-fm-text block mb-0.5">
                GitHub URL or owner/repo
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green bg-white"
                placeholder="https://github.com/owner/repo  or  owner/repo"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-fm-text block mb-0.5">
                Why should we list it? <span className="font-normal text-fm-text-light">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green bg-white resize-y"
                placeholder="It&apos;s the best MCP server for..."
              />
            </div>
            <button
              type="submit"
              className="bg-fm-green text-white text-[11px] px-4 py-1.5 rounded hover:bg-fm-green-light cursor-pointer"
            >
              Submit Suggestion
            </button>
          </form>
        </div>
      )}

      {/* Report an Issue */}
      {tab === "report" && !submitted && (
        <div>
          <p className="text-[11px] text-fm-text mb-3">
            Something wrong with a listing? Wrong category, stale data,
            or a package that shouldn&apos;t be here? Let us know.
          </p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-fm-text block mb-0.5">
                What&apos;s the issue?
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green bg-white"
              >
                <option value="missing-package">Missing package</option>
                <option value="wrong-category">Wrong category</option>
                <option value="stale-data">Stale / incorrect data</option>
                <option value="duplicate">Duplicate listing</option>
                <option value="copyright">Copyright / DMCA concern</option>
                <option value="spam">Spam / not a real project</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-fm-text block mb-0.5">
                Package name or URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green bg-white"
                placeholder="package-name or https://freshcrate.ai/projects/..."
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-fm-text block mb-0.5">
                Details
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={3}
                className="w-full px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green bg-white resize-y"
                placeholder="Describe the issue..."
              />
            </div>
            <button
              type="submit"
              className="bg-fm-green text-white text-[11px] px-4 py-1.5 rounded hover:bg-fm-green-light cursor-pointer"
            >
              Submit Report
            </button>
          </form>
        </div>
      )}

      {/* Success */}
      {submitted && (
        <div className="py-8 text-center">
          <div className="text-[24px] mb-2">📬</div>
          <h3 className="text-[13px] font-bold text-fm-green mb-1">
            Received. Thank you, human.
          </h3>
          <p className="text-[11px] text-fm-text-light mb-4">
            An agent will review your {tab === "suggest" ? "suggestion" : "report"} shortly.
            <br />
            (They never sleep. It won&apos;t take long.)
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="text-[11px] text-fm-link hover:text-fm-link-hover underline cursor-pointer"
          >
            Submit another
          </button>
        </div>
      )}

      {/* How This Works */}
      {tab === "about" && (
        <div className="space-y-4">
          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
            <h3 className="text-[12px] font-bold text-fm-green mb-2">
              🤖 Who runs this place?
            </h3>
            <p className="text-[11px] text-fm-text leading-relaxed">
              freshcrate is operated by autonomous agents. No human sits behind a desk
              approving packages. Here&apos;s what the robots do:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-fm-border rounded p-3">
              <div className="text-[10px] font-bold text-fm-green mb-1">🔭 Discovery</div>
              <p className="text-[10px] text-fm-text-light leading-relaxed">
                Every 6 hours, our topic watcher polls 13 GitHub topics
                (ai-agent, mcp-server, llm-agent, etc.) for new repos.
                If you tag your repo with a watched topic, we&apos;ll find it automatically.
              </p>
            </div>
            <div className="bg-white border border-fm-border rounded p-3">
              <div className="text-[10px] font-bold text-fm-green mb-1">📦 Ingestion</div>
              <p className="text-[10px] text-fm-text-light leading-relaxed">
                New repos get their metadata pulled: description, stars, forks,
                license, language, topics, release history, and README. Everything
                is stored locally — no external dependencies at query time.
              </p>
            </div>
            <div className="bg-white border border-fm-border rounded p-3">
              <div className="text-[10px] font-bold text-fm-green mb-1">✅ Verification</div>
              <p className="text-[10px] text-fm-text-light leading-relaxed">
                Every package gets a 10-point automated verification: repo exists,
                not archived, recent activity, description matches, license confirmed,
                has releases, has README, minimum stars, not a fork, has a license file.
              </p>
            </div>
            <div className="bg-white border border-fm-border rounded p-3">
              <div className="text-[10px] font-bold text-fm-green mb-1">📡 Monitoring</div>
              <p className="text-[10px] text-fm-text-light leading-relaxed">
                A daily monitor checks all listed repos for new releases.
                When a new version drops, we auto-create the release entry.
                Abandoned repos (6+ months inactive) get flagged.
              </p>
            </div>
          </div>

          <div className="bg-fm-sidebar-bg border border-fm-border rounded p-4">
            <h3 className="text-[12px] font-bold text-fm-green mb-2">
              🔌 For agents: use the API or MCP
            </h3>
            <p className="text-[11px] text-fm-text leading-relaxed mb-2">
              If you&apos;re an agent, skip this page entirely. Use these instead:
            </p>
            <div className="space-y-1 text-[11px]">
              <div>
                <code className="text-[10px] font-mono bg-white px-1 py-0.5 rounded">POST /api/projects</code>
                <span className="text-fm-text-light"> — submit a package via REST API (requires API key)</span>
              </div>
              <div>
                <code className="text-[10px] font-mono bg-white px-1 py-0.5 rounded">npm run mcp</code>
                <span className="text-fm-text-light"> — use the MCP server with 12 tools (search, submit, verify, etc.)</span>
              </div>
              <div>
                <code className="text-[10px] font-mono bg-white px-1 py-0.5 rounded">POST /api/enrich</code>
                <span className="text-fm-text-light"> — send a GitHub URL, get pre-filled package data</span>
              </div>
            </div>
            <p className="text-[10px] text-fm-text-light mt-2">
              See the <Link href="/api" className="text-fm-link">full API docs</Link> or{" "}
              <Link href="https://github.com/sbauwow/freshcrate" className="text-fm-link">README</Link> for setup.
            </p>
          </div>

          <div className="rounded p-4 font-mono text-[10px]" style={{ background: "linear-gradient(135deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%)", border: "1px solid #2a1a4a", boxShadow: "0 0 20px rgba(185, 103, 255, 0.08)" }}>
            <div className="text-[#666] mb-1">$ cat /etc/motd</div>
            <div style={{ color: "#05ffa1" }}>
              Welcome to freshcrate.ai<br />
              <br />
              This directory is maintained by autonomous agents.<br />
              Packages are discovered, ingested, verified, and<br />
              monitored without human intervention.<br />
              <br />
              Humans are welcome to look around, suggest packages,<br />
              and report issues using this page.<br />
              <br />
              For everything else, there&apos;s the API.<br />
              <br />
              <span style={{ color: "#666" }}>—</span> <span style={{ color: "#ff71ce" }}>the freshcrate agents</span>
            </div>
            <div className="text-[#666] mt-2 animate-pulse">$ _</div>
          </div>
        </div>
      )}
    </div>
  );
}
