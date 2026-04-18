import type { ProjectWithRelease } from "@/lib/queries";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function daysSince(input?: string | null): number {
  if (!input) return 9999;
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return 9999;
  return Math.max(0, (Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function parseJsonObject(raw?: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function countQueryHits(project: ProjectWithRelease, query?: string): number {
  if (!query) return 0;
  const haystacks = [
    project.name,
    project.short_desc,
    project.description,
    ...(project.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, token) => sum + (haystacks.includes(token) ? 1 : 0), 0);
}

export function isRankingV2Enabled(): boolean {
  const raw = (process.env.FRESHCRATE_RANKING_V2 || "1").toLowerCase();
  return raw !== "0" && raw !== "false" && raw !== "off";
}

export function scoreProjectRankingV2(project: ProjectWithRelease, query?: string): number {
  const verification = parseJsonObject(project.verification_json);
  const verificationScore = Number(verification.score || 0);

  const releaseDays = daysSince(project.release_date);
  const createdDays = Math.max(1, daysSince(project.created_at));
  const releaseCount = Number(project.release_count || 1);
  const stars = Number(project.stars || 0);
  const forks = Number(project.forks || 0);

  const verifiedComponent = (project.verified ? 18 : 0) + clamp(verificationScore / 6, 0, 16);
  const recencyComponent = clamp(24 - releaseDays / 14, -12, 24);
  const adoptionVelocity = (stars + forks * 2) / createdDays;
  const adoptionComponent = clamp(Math.log1p(stars) * 4 + Math.log1p(forks) * 2 + Math.log1p(adoptionVelocity * 30) * 4, 0, 28);
  const cadenceComponent = clamp(releaseCount * 2.5 + (releaseDays <= 30 ? 4 : 0), 0, 16);
  const queryComponent = clamp(countQueryHits(project, query) * 3, 0, 12);

  return verifiedComponent + recencyComponent + adoptionComponent + cadenceComponent + queryComponent;
}

export function rankProjectsV2(projects: ProjectWithRelease[], query?: string): ProjectWithRelease[] {
  return [...projects].sort((a, b) => {
    const scoreDelta = scoreProjectRankingV2(b, query) - scoreProjectRankingV2(a, query);
    if (scoreDelta !== 0) return scoreDelta;

    const verifiedDelta = Number(b.verified || 0) - Number(a.verified || 0);
    if (verifiedDelta !== 0) return verifiedDelta;

    const starsDelta = Number(b.stars || 0) - Number(a.stars || 0);
    if (starsDelta !== 0) return starsDelta;

    const releaseDelta = new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
    if (releaseDelta !== 0) return releaseDelta;

    return a.name.localeCompare(b.name);
  });
}
