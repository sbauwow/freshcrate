import { computeHealth, scoreReleaseRecency, scoreLicenseClarity, scorePopularity } from "../scripts/lib/health.mjs";
import { describe, it, expect } from "vitest";

describe("scoreReleaseRecency", () => {
  it("returns 100 for a release inside the fresh window", () => {
    const iso = new Date(Date.now() - 5 * 86_400_000).toISOString();
    expect(scoreReleaseRecency(iso).score).toBe(100);
  });

  it("returns 0 for a release older than the stale window", () => {
    const iso = new Date(Date.now() - 1000 * 86_400_000).toISOString();
    expect(scoreReleaseRecency(iso).score).toBe(0);
  });

  it("reports absent when there is no release", () => {
    const r = scoreReleaseRecency(null);
    expect(r.present).toBe(false);
    expect(r.score).toBe(0);
  });
});

describe("scoreLicenseClarity", () => {
  it("awards full points for declared + file + match", () => {
    const checks = [
      { check: "has_license", passed: true, detail: "" },
      { check: "license_matches", passed: true, detail: "" },
    ];
    expect(scoreLicenseClarity(checks, "MIT").score).toBe(100);
  });

  it("returns absent when no verification has run", () => {
    expect(scoreLicenseClarity(null, "MIT").present).toBe(false);
    expect(scoreLicenseClarity([], "MIT").present).toBe(false);
  });
});

describe("scorePopularity", () => {
  it("log-scales stars", () => {
    expect(scorePopularity(10).score).toBe(25);
    expect(scorePopularity(100).score).toBe(50);
    expect(scorePopularity(1000).score).toBe(75);
    expect(scorePopularity(10_000).score).toBe(100);
  });

  it("clamps at 100 for very large star counts", () => {
    expect(scorePopularity(1_000_000).score).toBe(100);
  });
});

describe("computeHealth", () => {
  it("averages only present factors", () => {
    const iso = new Date(Date.now() - 5 * 86_400_000).toISOString();
    const result = computeHealth({
      last_release_at: iso,
      verification_checks: null,
      license: "",
      stars: null,
    });
    // Only release_recency is present — composite should equal its score.
    expect(result.score).toBe(100);
    expect(result.factors.filter((f: { present: boolean }) => f.present)).toHaveLength(1);
  });

  it("emits all four factors even when some are absent", () => {
    const result = computeHealth({
      last_release_at: null,
      verification_checks: null,
      license: null,
      stars: null,
    });
    expect(result.factors).toHaveLength(4);
  });
});
