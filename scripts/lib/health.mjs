// Pure compute: project health/trust score from signals.
// Factors are additive-weighted over present factors only — missing signals
// don't penalize, they just reduce the confidence footprint.

export const FACTORS = {
  release_recency: {
    weight: 0.25,
    label: "Release recency",
    explain: "Days since the most recent release",
  },
  activity: {
    weight: 0.2,
    label: "Repo activity",
    explain: "Recent push activity on the source repository",
  },
  license_clarity: {
    weight: 0.2,
    label: "License clarity",
    explain: "License file present and matches declared SPDX identifier",
  },
  popularity: {
    weight: 0.1,
    label: "Popularity",
    explain: "Star count on log scale (100 stars ≈ 50, 10k+ ≈ 100)",
  },
};

// Release recency: 100 if within 30d, linear decay to 0 at 730d (2y).
export function scoreReleaseRecency(lastReleaseIso) {
  if (!lastReleaseIso) {
    return { score: 0, detail: "No releases recorded", present: false };
  }
  const ageDays = (Date.now() - new Date(lastReleaseIso).getTime()) / 86_400_000;
  if (ageDays < 0) return { score: 100, detail: "Released in the future (clock skew)", present: true };
  const FRESH = 30;
  const STALE = 730;
  let score;
  if (ageDays <= FRESH) score = 100;
  else if (ageDays >= STALE) score = 0;
  else score = Math.round(100 * (1 - (ageDays - FRESH) / (STALE - FRESH)));
  return {
    score,
    detail: `${Math.round(ageDays)}d since last release`,
    present: true,
  };
}

function factor(name, result) {
  const meta = FACTORS[name];
  return {
    name,
    weight: meta.weight,
    score: result.score,
    present: result.present,
    detail: result.detail,
    label: meta.label,
    explain: meta.explain,
  };
}

export function scoreActivity(verificationChecks) {
  const check = verificationChecks?.find((c) => c.check === "recent_activity");
  if (!check) return { score: 0, detail: "No activity data", present: false };
  return {
    score: check.passed ? 100 : 20,
    detail: check.detail || (check.passed ? "Recently active" : "Stale"),
    present: true,
  };
}

export function scoreLicenseClarity(verificationChecks, declaredLicense) {
  if (!verificationChecks || verificationChecks.length === 0) {
    return { score: 0, detail: "License not checked", present: false };
  }
  const matches = verificationChecks.find((c) => c.check === "license_matches");
  const hasFile = verificationChecks.find((c) => c.check === "has_license");
  const declared = declaredLicense && declaredLicense !== "Unknown" && declaredLicense !== "";
  let points = 0;
  const notes = [];
  if (declared) { points += 30; notes.push("declared"); }
  if (hasFile?.passed) { points += 40; notes.push("file present"); }
  if (matches?.passed) { points += 30; notes.push("SPDX matches"); }
  return {
    score: points,
    detail: notes.length ? notes.join(", ") : "No license signals",
    present: true,
  };
}

// Log-scale popularity: 0 stars=0, 10=25, 100=50, 1k=75, 10k+=100.
export function scorePopularity(stars) {
  if (stars == null) return { score: 0, detail: "No star data", present: false };
  if (stars <= 0) return { score: 0, detail: "0 stars", present: true };
  const raw = Math.log10(stars) * 25;
  const score = Math.max(0, Math.min(100, Math.round(raw)));
  return { score, detail: `${stars.toLocaleString()} stars`, present: true };
}

export function computeHealth(signals) {
  const factors = [];

  factors.push(factor("release_recency", scoreReleaseRecency(signals.last_release_at)));
  factors.push(factor("activity", scoreActivity(signals.verification_checks)));
  factors.push(factor("license_clarity", scoreLicenseClarity(signals.verification_checks, signals.license)));
  factors.push(factor("popularity", scorePopularity(signals.stars)));

  const present = factors.filter((f) => f.present);
  const totalWeight = present.reduce((s, f) => s + f.weight, 0);
  const composite = totalWeight > 0
    ? Math.round(present.reduce((s, f) => s + f.score * f.weight, 0) / totalWeight)
    : 0;

  return {
    score: composite,
    factors,
    computed_at: new Date().toISOString(),
  };
}
