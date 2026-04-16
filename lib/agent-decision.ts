import {
  getLatestReleases,
  getProjectByName,
  getProjectReleases,
  getProjectTags,
} from "@/lib/queries";
import { getDb } from "@/lib/db";

export type AgentRuntime = "local" | "cloud";
export type AgentRiskTolerance = "low" | "medium" | "high";

export interface AgentRecommendInput {
  task: string;
  category?: string;
  language?: string;
  runtime?: AgentRuntime;
  risk_tolerance?: AgentRiskTolerance;
  verified_only?: boolean;
  require_accountability?: boolean;
  limit?: number;
}

export interface AgentRecommendation {
  name: string;
  score: number;
  category: string;
  language: string;
  stars: number;
  verified: boolean;
  latest_version: string;
  release_date: string;
  tags: string[];
  rationale: string[];
}

export interface AgentCompareInput {
  task?: string;
  category?: string;
  language?: string;
  runtime?: AgentRuntime;
  risk_tolerance?: AgentRiskTolerance;
  verified_only?: boolean;
  require_accountability?: boolean;
}

export interface AgentComparisonResult {
  winner: string;
  score_delta: number;
  projectA: AgentRecommendation;
  projectB: AgentRecommendation;
}

export interface PreflightCheck {
  key: string;
  ok: boolean;
  value: string | number | boolean;
}

export interface AgentPreflightResult {
  project: string;
  exists: boolean;
  status: "ready" | "risky" | "missing";
  checks: PreflightCheck[];
  summary: {
    pass: number;
    fail: number;
  };
}

type Candidate = {
  name: string;
  category: string;
  language: string;
  stars: number;
  verified: boolean;
  latest_version: string;
  release_date: string;
  tags: string[];
  short_desc?: string;
  description?: string;
  license?: string;
  release_count?: number;
  verification_json?: string;
  deps_audit_json?: string;
  deps_scanned_at?: string;
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "need", "want", "tool", "tools", "agent",
]);

const LOCAL_SIGNALS = ["local", "self-hosted", "on-prem", "docker", "llama.cpp", "offline"];
const CLOUD_SIGNALS = ["cloud", "serverless", "hosted", "managed", "api", "saas"];

function extractKeywords(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[^a-z0-9+.-]+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3 && !STOPWORDS.has(x));
}

function safeDaysSince(dateText: string | undefined): number {
  if (!dateText) return 10_000;
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return 10_000;
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function safeJson(value: string | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function countSignals(text: string, signals: string[]): number {
  let hits = 0;
  for (const signal of signals) {
    if (text.includes(signal)) hits += 1;
  }
  return hits;
}

function getActiveAccountableAgentNames(): Set<string> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT agent_name
       FROM agent_manifests
       WHERE status = 'active'
         AND revoked_at IS NULL
         AND signature_valid = 1
         AND accountability_verified = 1
         AND datetime(expires_at) > datetime('now')`
    )
    .all() as { agent_name: string }[];

  return new Set(rows.map((r) => r.agent_name));
}

function scoreRuntime(candidate: Candidate, input: AgentRecommendInput, rationale: string[]): number {
  if (!input.runtime) return 0;

  const haystack = `${candidate.name} ${candidate.short_desc ?? ""} ${candidate.description ?? ""} ${candidate.tags.join(" ")}`.toLowerCase();

  if (input.runtime === "local") {
    const localHits = countSignals(haystack, LOCAL_SIGNALS);
    const cloudHits = countSignals(haystack, CLOUD_SIGNALS);
    if (localHits > 0) rationale.push("runtime_local_match");
    if (cloudHits > 0) rationale.push("runtime_cloud_penalty");
    return localHits * 8 - cloudHits * 5;
  }

  const cloudHits = countSignals(haystack, CLOUD_SIGNALS);
  const localHits = countSignals(haystack, LOCAL_SIGNALS);
  if (cloudHits > 0) rationale.push("runtime_cloud_match");
  if (localHits > 0) rationale.push("runtime_local_penalty");
  return cloudHits * 8 - localHits * 5;
}

function scoreReliability(candidate: Candidate, rationale: string[]): number {
  let points = 0;

  const releaseCount = Math.max(0, Number(candidate.release_count ?? 0));
  if (releaseCount >= 2) {
    const releasePoints = Math.min(8, (releaseCount - 1) * 2);
    points += releasePoints;
    rationale.push("reliability_release_history");
  }

  const verification = safeJson(candidate.verification_json);
  const verifyScoreRaw = Number(verification.score ?? 0);
  if (Number.isFinite(verifyScoreRaw) && verifyScoreRaw > 0) {
    const verifyScore = Math.max(0, Math.min(1, verifyScoreRaw));
    points += verifyScore * 10;
    rationale.push("reliability_verification_score");
  }

  const checksFailed = Number(verification.checks_failed ?? 0);
  if (Number.isFinite(checksFailed) && checksFailed > 0) {
    points -= Math.min(8, checksFailed * 1.5);
    rationale.push("reliability_failed_checks_penalty");
  }

  const deps = safeJson(candidate.deps_audit_json);
  const disallowedCount = Number(deps.disallowed_count ?? 0);
  if (Number.isFinite(disallowedCount) && disallowedCount > 0) {
    points -= Math.min(10, disallowedCount * 3);
    rationale.push("reliability_disallowed_deps_penalty");
  }

  const unknownRatioRaw = Number(deps.unknown_ratio ?? 0);
  if (Number.isFinite(unknownRatioRaw) && unknownRatioRaw >= 0) {
    const unknownRatio = Math.max(0, Math.min(1, unknownRatioRaw));
    if (unknownRatio <= 0.2) {
      points += 3;
      rationale.push("reliability_dep_visibility_bonus");
    } else if (unknownRatio >= 0.6) {
      points -= 5;
      rationale.push("reliability_dep_visibility_penalty");
    }
  }

  if (candidate.deps_scanned_at && candidate.deps_scanned_at.trim()) {
    points += 2;
    rationale.push("reliability_deps_scanned");
  }

  return points;
}

function scoreRisk(candidate: Candidate, input: AgentRecommendInput, ageDays: number, rationale: string[]): number {
  const risk = input.risk_tolerance ?? "medium";

  if (risk === "low") {
    let points = 0;
    if (candidate.verified) {
      points += 10;
      rationale.push("risk_low_verified_bonus");
    } else {
      points -= 12;
      rationale.push("risk_low_unverified_penalty");
    }

    if (candidate.stars >= 50) {
      points += 6;
      rationale.push("risk_low_adoption_bonus");
    } else {
      points -= 6;
      rationale.push("risk_low_lowstars_penalty");
    }

    if (ageDays > 365) {
      points -= 6;
      rationale.push("risk_low_stale_penalty");
    }

    if (!candidate.license || !candidate.license.trim()) {
      points -= 4;
      rationale.push("risk_low_license_penalty");
    }

    return points;
  }

  if (risk === "high") {
    let points = 0;
    if (ageDays <= 90) {
      points += 5;
      rationale.push("risk_high_fresh_bonus");
    }
    if (candidate.stars < 50) {
      points += 3;
      rationale.push("risk_high_exploration_bonus");
    }
    return points;
  }

  return 0;
}

function scoreCandidate(candidate: Candidate, input: AgentRecommendInput): AgentRecommendation {
  const rationale: string[] = [];
  let score = 0;

  const keywords = extractKeywords(input.task || "");
  const haystack = `${candidate.name} ${candidate.short_desc ?? ""} ${candidate.description ?? ""} ${candidate.tags.join(" ")}`.toLowerCase();

  if (input.category && candidate.category === input.category) {
    score += 30;
    rationale.push("category_match");
  }

  if (input.language && candidate.language === input.language) {
    score += 20;
    rationale.push("language_match");
  }

  let keywordHits = 0;
  for (const kw of keywords) {
    if (haystack.includes(kw)) keywordHits += 1;
  }
  if (keywordHits > 0) {
    const points = Math.min(32, keywordHits * 8);
    score += points;
    rationale.push(`task_match:${keywordHits}`);
  }

  if (candidate.verified) {
    score += 10;
    rationale.push("verified");
  }

  const starPoints = Math.min(20, Math.log10(Math.max(1, candidate.stars) + 1) * 8);
  if (starPoints > 0) {
    score += starPoints;
    rationale.push("adoption_signal");
  }

  const ageDays = safeDaysSince(candidate.release_date);
  if (ageDays <= 90) {
    score += 8;
    rationale.push("fresh_release");
  } else if (ageDays <= 365) {
    score += 4;
    rationale.push("recent_release");
  }

  score += scoreRuntime(candidate, input, rationale);
  score += scoreReliability(candidate, rationale);
  score += scoreRisk(candidate, input, ageDays, rationale);

  return {
    name: candidate.name,
    score: Number(score.toFixed(2)),
    category: candidate.category,
    language: candidate.language || "Unknown",
    stars: candidate.stars || 0,
    verified: candidate.verified,
    latest_version: candidate.latest_version,
    release_date: candidate.release_date,
    tags: candidate.tags,
    rationale,
  };
}

function buildCandidateByName(name: string): Candidate | null {
  const project = getProjectByName(name);
  if (!project) return null;
  const raw = project as unknown as Record<string, unknown>;
  const tags = getProjectTags(project.id);
  return {
    name: project.name,
    category: project.category,
    language: project.language || "Unknown",
    stars: project.stars || 0,
    verified: Boolean(project.verified),
    latest_version: project.latest_version,
    release_date: project.release_date,
    tags,
    short_desc: project.short_desc,
    description: project.description,
    license: project.license || "",
    release_count: Number((raw.release_count ?? getProjectReleases(project.id).length) || 0),
    verification_json: typeof raw.verification_json === "string" ? raw.verification_json : undefined,
    deps_audit_json: typeof raw.deps_audit_json === "string" ? raw.deps_audit_json : undefined,
    deps_scanned_at: typeof raw.deps_scanned_at === "string" ? raw.deps_scanned_at : undefined,
  };
}

export function recommendProjectsForAgent(input: AgentRecommendInput): AgentRecommendation[] {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const rows = getLatestReleases(300, 0, {});

  const candidates = rows
    .map((row) => {
      const raw = row as unknown as Record<string, unknown>;
      return {
        name: row.name,
        category: row.category,
        language: row.language || "Unknown",
        stars: row.stars || 0,
        verified: Boolean(row.verified),
        latest_version: row.latest_version,
        release_date: row.release_date,
        tags: row.tags || [],
        short_desc: row.short_desc,
        description: row.description,
        license: row.license || "",
        release_count: Number((raw.release_count ?? 0) || 0),
        verification_json: typeof raw.verification_json === "string" ? raw.verification_json : undefined,
        deps_audit_json: typeof raw.deps_audit_json === "string" ? raw.deps_audit_json : undefined,
        deps_scanned_at: typeof raw.deps_scanned_at === "string" ? raw.deps_scanned_at : undefined,
      };
    });

  const accountableNames = input.require_accountability ? getActiveAccountableAgentNames() : null;

  const filtered = candidates.filter((candidate) => {
    if (input.verified_only && !candidate.verified) return false;
    if (accountableNames && !accountableNames.has(candidate.name)) return false;
    return true;
  });

  const scored = filtered.map((candidate) => scoreCandidate(candidate, input));

  return scored
    .sort((a, b) => b.score - a.score || b.stars - a.stars || a.name.localeCompare(b.name))
    .slice(0, limit);
}

export function compareProjectsForAgent(
  projectAName: string,
  projectBName: string,
  input: AgentCompareInput = {}
): AgentComparisonResult {
  const projectA = buildCandidateByName(projectAName);
  const projectB = buildCandidateByName(projectBName);

  if (!projectA || !projectB) {
    throw new Error("Both projects must exist for comparison.");
  }

  const context: AgentRecommendInput = {
    task: input.task ?? "",
    category: input.category,
    language: input.language,
    runtime: input.runtime,
    risk_tolerance: input.risk_tolerance,
    verified_only: input.verified_only,
    require_accountability: input.require_accountability,
    limit: 2,
  };

  const a = scoreCandidate(projectA, context);
  const b = scoreCandidate(projectB, context);

  const winner = a.score >= b.score ? a.name : b.name;
  const score_delta = Number(Math.abs(a.score - b.score).toFixed(2));

  return {
    winner,
    score_delta,
    projectA: a,
    projectB: b,
  };
}

export function preflightProjectForAgent(projectName: string): AgentPreflightResult {
  const project = getProjectByName(projectName);
  if (!project) {
    return {
      project: projectName,
      exists: false,
      status: "missing",
      checks: [],
      summary: { pass: 0, fail: 1 },
    };
  }

  const releases = getProjectReleases(project.id);
  const tags = getProjectTags(project.id);
  const daysSinceRelease = safeDaysSince(project.release_date);

  const checks: PreflightCheck[] = [
    { key: "repo_url", ok: /^https?:\/\//.test(project.repo_url || ""), value: project.repo_url || "" },
    { key: "homepage_url", ok: /^https?:\/\//.test(project.homepage_url || ""), value: project.homepage_url || "" },
    {
      key: "license",
      ok: Boolean(project.license && project.license.trim() && !["unknown", "n/a"].includes(project.license.toLowerCase())),
      value: project.license || "",
    },
    { key: "release_count", ok: releases.length > 0, value: releases.length },
    { key: "release_recency_days", ok: daysSinceRelease <= 365, value: daysSinceRelease },
    { key: "tags", ok: tags.length >= 1, value: tags.length },
    { key: "stars", ok: (project.stars || 0) >= 10, value: project.stars || 0 },
  ];

  const fail = checks.filter((c) => !c.ok).length;
  const pass = checks.length - fail;

  return {
    project: project.name,
    exists: true,
    status: fail >= 2 ? "risky" : "ready",
    checks,
    summary: { pass, fail },
  };
}

export type AgentDecisionPayload = {
  mode: "recommend" | "compare" | "preflight";
  task?: string;
  category?: string;
  language?: string;
  runtime?: AgentRuntime;
  risk_tolerance?: AgentRiskTolerance;
  verified_only?: boolean;
  require_accountability?: boolean;
  limit?: number;
  a?: string;
  b?: string;
  name?: string;
};

export function runAgentDecision(payload: AgentDecisionPayload): {
  mode: AgentDecisionPayload["mode"];
  result: AgentRecommendation[] | AgentComparisonResult | AgentPreflightResult;
} {
  if (payload.mode === "recommend") {
    if (!payload.task || !payload.task.trim()) {
      throw new Error("Missing task for recommend mode.");
    }

    return {
      mode: "recommend",
      result: recommendProjectsForAgent({
        task: payload.task,
        category: payload.category,
        language: payload.language,
        runtime: payload.runtime,
        risk_tolerance: payload.risk_tolerance,
        verified_only: payload.verified_only,
        require_accountability: payload.require_accountability,
        limit: payload.limit,
      }),
    };
  }

  if (payload.mode === "compare") {
    if (!payload.a || !payload.b) {
      throw new Error("Missing a/b for compare mode.");
    }

    return {
      mode: "compare",
      result: compareProjectsForAgent(payload.a, payload.b, {
        task: payload.task,
        category: payload.category,
        language: payload.language,
        runtime: payload.runtime,
        risk_tolerance: payload.risk_tolerance,
        verified_only: payload.verified_only,
        require_accountability: payload.require_accountability,
      }),
    };
  }

  if (payload.mode === "preflight") {
    if (!payload.name || !payload.name.trim()) {
      throw new Error("Missing name for preflight mode.");
    }

    return {
      mode: "preflight",
      result: preflightProjectForAgent(payload.name),
    };
  }

  throw new Error("Invalid decision mode.");
}
