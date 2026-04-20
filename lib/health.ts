import { getDb } from "./db";

export const HEALTH_RUBRIC = [
  {
    name: "release_recency",
    weight: 0.25,
    label: "Release recency",
    explain: "100 if released within 30 days, linear decay to 0 at 2 years.",
  },
  {
    name: "activity",
    weight: 0.2,
    label: "Repo activity",
    explain: "100 if the source repo was pushed within the last year, else 20.",
  },
  {
    name: "license_clarity",
    weight: 0.2,
    label: "License clarity",
    explain: "30 pts for a declared SPDX license, 40 for a license file, 30 for SPDX/file match.",
  },
  {
    name: "popularity",
    weight: 0.1,
    label: "Popularity",
    explain: "Log10(stars) × 25, clamped to [0, 100]. 100 stars ≈ 50, 10k+ ≈ 100.",
  },
] as const;

export interface HealthFactor {
  name: string;
  weight: number;
  score: number;
  present: boolean;
  detail: string;
  label: string;
  explain: string;
}

export interface HealthResult {
  score: number;
  factors: HealthFactor[];
  computed_at: string;
}

export function getHealthStatus(projectId: number): HealthResult | null {
  const db = getDb();
  const row = db
    .prepare("SELECT health_json FROM projects WHERE id = ?")
    .get(projectId) as { health_json: string } | undefined;

  if (!row || !row.health_json || row.health_json === "{}") return null;
  try {
    return JSON.parse(row.health_json) as HealthResult;
  } catch {
    return null;
  }
}
