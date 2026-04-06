"use client";

import { useState } from "react";
import { CATEGORIES, LICENSES } from "@/lib/categories";

interface EnrichedData {
  name: string;
  short_desc: string;
  description: string;
  homepage_url: string;
  repo_url: string;
  license: string;
  category: string;
  author: string;
  version: string;
  changes: string;
  tags: string[];
  _meta?: {
    stars: number;
    forks: number;
    language: string;
    updated_at: string;
    release_date: string;
    open_issues: number;
  };
}

export default function SubmitPage() {
  const [step, setStep] = useState<"input" | "enriching" | "review" | "submitted">("input");
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<EnrichedData | null>(null);
  const [submittedName, setSubmittedName] = useState("");

  // Step 1: User pastes a repo URL, agent fetches + enriches
  async function handleEnrich(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStep("enriching");

    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: repoUrl }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to fetch repo info");
      }

      const enriched = await res.json();
      setData(enriched);
      setStep("review");
    } catch (err) {
      setError((err as Error).message);
      setStep("input");
    }
  }

  // Step 2: User reviews, edits, and submits
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name") as string,
      short_desc: form.get("short_desc") as string,
      description: form.get("description") as string,
      homepage_url: form.get("homepage_url") as string,
      repo_url: form.get("repo_url") as string,
      license: form.get("license") as string,
      category: form.get("category") as string,
      author: form.get("author") as string,
      version: form.get("version") as string,
      changes: form.get("changes") as string,
      tags: (form.get("tags") as string).split(",").map((t) => t.trim()).filter(Boolean),
    };

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Submission failed");
      }

      const result = await res.json();
      setSubmittedName(result.name || payload.name);
      setStep("submitted");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full px-2 py-1.5 text-[11px] border border-fm-border rounded outline-none focus:border-fm-green bg-white";
  const labelClass = "text-[11px] font-bold text-fm-text block mb-0.5";

  return (
    <div className="max-w-[700px]">
      <div className="border-b-2 border-fm-green pb-1 mb-4">
        <h2 className="text-[14px] font-bold text-fm-green">Submit a Package</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 text-[11px] px-3 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* Submitted confirmation */}
      {step === "submitted" && (
        <div className="py-8 text-center">
          <div className="text-[24px] mb-3">&#x1f4e6;</div>
          <h3 className="text-[14px] font-bold text-fm-green mb-2">Submission received!</h3>
          <p className="text-[11px] text-fm-text mb-4">
            <strong>{submittedName}</strong> has been queued for review.<br />
            We&apos;ll review it and publish it shortly.
          </p>
          <button
            onClick={() => { setStep("input"); setData(null); setError(""); setSubmittedName(""); }}
            className="text-[11px] text-fm-link hover:text-fm-link-hover underline cursor-pointer"
          >
            Submit another package
          </button>
        </div>
      )}

      {/* Step 1: Paste a repo URL */}
      {step === "input" && (
        <>
          <p className="text-[11px] text-fm-text-light mb-4">
            Paste a GitHub repo URL and we&apos;ll auto-fill everything — description, version,
            license, tags — from the repo. Review and edit before publishing.
          </p>

          <form onSubmit={handleEnrich} className="space-y-3">
            <div>
              <label className={labelClass}>GitHub Repository</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  required
                  className={inputClass}
                  placeholder="https://github.com/owner/repo  or  owner/repo"
                />
                <button
                  type="submit"
                  className="bg-fm-green text-white text-[11px] px-4 py-1.5 rounded hover:bg-fm-green-light cursor-pointer whitespace-nowrap"
                >
                  Fetch &amp; Fill
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-fm-border">
            <p className="text-[10px] text-fm-text-light mb-3">
              Or <button onClick={() => { setData(null); setStep("review"); }} className="text-fm-link hover:text-fm-link-hover underline cursor-pointer">fill in manually</button>
            </p>
          </div>
        </>
      )}

      {/* Enriching spinner */}
      {step === "enriching" && (
        <div className="py-12 text-center">
          <div className="inline-block text-[13px] text-fm-text">
            <span className="inline-block animate-spin mr-2">&#x2699;</span>
            Fetching repo metadata, releases, and tags...
          </div>
          <div className="mt-3 text-[10px] text-fm-text-light">
            Pulling from GitHub API
          </div>
        </div>
      )}

      {/* Step 2: Review enriched data */}
      {step === "review" && (
        <>
          {data?._meta && (
            <div className="bg-fm-sidebar-bg border border-fm-border rounded p-3 mb-4">
              <div className="flex items-center gap-4 text-[10px] text-fm-text-light">
                <span>&#9733; {data._meta.stars.toLocaleString()} stars</span>
                <span>&#x2442; {data._meta.forks.toLocaleString()} forks</span>
                {data._meta.language && <span>{data._meta.language}</span>}
                <span>{data._meta.open_issues} open issues</span>
                <span className="ml-auto">
                  Updated {new Date(data._meta.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          <p className="text-[11px] text-fm-text-light mb-4">
            {data ? "Review the auto-filled details below. Edit anything that needs fixing." : "Fill in your package details manually."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Package Name *</label>
                <input name="name" required className={inputClass} defaultValue={data?.name || ""} placeholder="my-agent-tool" />
              </div>
              <div>
                <label className={labelClass}>Version *</label>
                <input name="version" required className={inputClass} defaultValue={data?.version || ""} placeholder="1.0.0" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Short Description *</label>
              <input name="short_desc" required className={inputClass} defaultValue={data?.short_desc || ""} placeholder="One-line summary of your package" maxLength={200} />
            </div>

            <div>
              <label className={labelClass}>Full Description</label>
              <textarea name="description" rows={4} className={inputClass} defaultValue={data?.description || ""} placeholder="Detailed description of what this package does..." />
            </div>

            <div>
              <label className={labelClass}>Changes in this Release</label>
              <textarea name="changes" rows={2} className={inputClass} defaultValue={data?.changes || ""} placeholder="What's new in this version..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Homepage URL</label>
                <input name="homepage_url" type="url" className={inputClass} defaultValue={data?.homepage_url || ""} placeholder="https://..." />
              </div>
              <div>
                <label className={labelClass}>Repository URL</label>
                <input name="repo_url" type="url" className={inputClass} defaultValue={data?.repo_url || ""} placeholder="https://github.com/..." />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Category *</label>
                <select name="category" required className={inputClass} defaultValue={data?.category || "Uncategorized"}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>License</label>
                <select name="license" className={inputClass} defaultValue={data?.license || "MIT"}>
                  {LICENSES.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Author / Org *</label>
                <input name="author" required className={inputClass} defaultValue={data?.author || ""} placeholder="Your name or org" />
              </div>
            </div>

            <div>
              <label className={labelClass}>Tags (comma-separated)</label>
              <input name="tags" className={inputClass} defaultValue={data?.tags?.join(", ") || ""} placeholder="agent, mcp, python, tool" />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-fm-green text-white text-[11px] px-6 py-2 rounded hover:bg-fm-green-light cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Publishing..." : "Publish Package"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("input"); setData(null); setError(""); }}
                className="text-[11px] text-fm-text-light hover:text-fm-link cursor-pointer"
              >
                &larr; Start over
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
