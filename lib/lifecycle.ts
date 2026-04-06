/**
 * Package lifecycle classification for freshcrate.
 *
 * Replaces the freshmeat Low/Medium/High/Critical urgency model with
 * a lifecycle stage that tells agents what they actually need to know:
 * is this package safe to depend on?
 *
 * Stages are computed from real signals, not vibes:
 *   - Release frequency, star count, age, fork ratio, verification
 *
 * STAGES:
 *   🌱 Seedling    — new project, early days, use at your own risk
 *   🌿 Growing     — gaining traction, active development, promising
 *   🌳 Mature      — established, reliable, safe to depend on
 *   🏛️ Flagship    — category leader, widely adopted, production-proven
 *   💤 Dormant     — no recent releases, may still work but unmaintained
 *   ⚰️ Archived    — abandoned or archived, find an alternative
 */

export type LifecycleStage =
  | "seedling"
  | "growing"
  | "mature"
  | "flagship"
  | "dormant"
  | "archived";

export interface LifecycleResult {
  stage: LifecycleStage;
  label: string;
  emoji: string;
  color: string;       // tailwind bg class
  textColor: string;   // tailwind text class
  reason: string;      // one-line explanation
  confidence: number;  // 0-100
}

const STAGE_META: Record<LifecycleStage, { label: string; emoji: string; color: string; textColor: string }> = {
  seedling:  { label: "Seedling",  emoji: "🌱", color: "bg-lime-100",    textColor: "text-lime-800" },
  growing:   { label: "Growing",   emoji: "🌿", color: "bg-emerald-100", textColor: "text-emerald-800" },
  mature:    { label: "Mature",    emoji: "🌳", color: "bg-green-100",   textColor: "text-green-800" },
  flagship:  { label: "Flagship",  emoji: "🏛️", color: "bg-blue-100",    textColor: "text-blue-800" },
  dormant:   { label: "Dormant",   emoji: "💤", color: "bg-yellow-100",  textColor: "text-yellow-800" },
  archived:  { label: "Archived",  emoji: "⚰️", color: "bg-gray-200",    textColor: "text-gray-600" },
};

/**
 * Compute lifecycle stage from package signals.
 */
export function computeLifecycle(data: {
  stars: number;
  forks: number;
  releaseCount: number;
  lastReleaseDate: string | null;
  createdAt: string | null;
  verified: boolean;
  license: string;
}): LifecycleResult {
  const now = Date.now();

  // Compute ages
  const lastReleaseDays = data.lastReleaseDate
    ? (now - new Date(data.lastReleaseDate).getTime()) / (1000 * 60 * 60 * 24)
    : 9999;

  const ageMonths = data.createdAt && data.createdAt < "2026-04-01"
    ? (now - new Date(data.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    : null;

  const hasLicense = !!data.license && data.license !== "Unknown" && data.license !== "NOASSERTION";

  // ── Archived: no release in 18+ months ──
  if (lastReleaseDays > 540) {
    return {
      ...STAGE_META.archived,
      stage: "archived",
      reason: `No releases in ${Math.round(lastReleaseDays / 30)} months`,
      confidence: 90,
    };
  }

  // ── Dormant: no release in 6-18 months ──
  if (lastReleaseDays > 180) {
    return {
      ...STAGE_META.dormant,
      stage: "dormant",
      reason: `Last release ${Math.round(lastReleaseDays / 30)} months ago`,
      confidence: 85,
    };
  }

  // ── Flagship: high stars + many releases + active ──
  if (
    data.stars >= 5000 &&
    data.releaseCount >= 10 &&
    lastReleaseDays < 90
  ) {
    return {
      ...STAGE_META.flagship,
      stage: "flagship",
      reason: `${data.stars.toLocaleString()} stars, ${data.releaseCount} releases, actively maintained`,
      confidence: 95,
    };
  }

  // ── Mature: decent stars + regular releases ──
  if (
    data.stars >= 500 &&
    data.releaseCount >= 5 &&
    lastReleaseDays < 180
  ) {
    return {
      ...STAGE_META.mature,
      stage: "mature",
      reason: `${data.stars.toLocaleString()} stars, ${data.releaseCount} releases, stable`,
      confidence: 85,
    };
  }

  // ── Growing: some traction + recent activity ──
  if (
    data.stars >= 50 &&
    data.releaseCount >= 2 &&
    lastReleaseDays < 90
  ) {
    return {
      ...STAGE_META.growing,
      stage: "growing",
      reason: `${data.stars.toLocaleString()} stars, actively developed`,
      confidence: 75,
    };
  }

  // ── Seedling: everything else that's still active ──
  if (lastReleaseDays < 180) {
    const reasons: string[] = [];
    if (data.stars < 50) reasons.push(`${data.stars} stars`);
    if (data.releaseCount < 2) reasons.push("few releases");
    if (!hasLicense) reasons.push("no license");

    return {
      ...STAGE_META.seedling,
      stage: "seedling",
      reason: reasons.length > 0 ? `Early stage: ${reasons.join(", ")}` : "New project",
      confidence: 70,
    };
  }

  // Fallback: dormant
  return {
    ...STAGE_META.dormant,
    stage: "dormant",
    reason: "Limited activity signals",
    confidence: 50,
  };
}

/**
 * Get the lifecycle badge HTML class string for inline rendering.
 */
export function lifecycleBadgeClass(stage: LifecycleStage): string {
  const meta = STAGE_META[stage];
  return `${meta.color} ${meta.textColor} px-1.5 py-0.5 rounded text-[9px] font-bold`;
}
