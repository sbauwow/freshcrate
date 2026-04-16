import { NextRequest, NextResponse } from "next/server";
import {
  getGovernanceIssues,
  getLegislation,
  getLegislationFilterOptions,
  getLegislationSummary,
  type GovernanceStatus,
} from "@/lib/legislation";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();

  const regionParam = request.nextUrl.searchParams.get("region") || undefined;
  const statusParam = request.nextUrl.searchParams.get("status") || undefined;
  const themeParam = request.nextUrl.searchParams.get("theme") || undefined;
  const qParam = request.nextUrl.searchParams.get("q")?.trim() || undefined;

  const options = getLegislationFilterOptions();
  const region = regionParam && options.regions.includes(regionParam) ? regionParam : undefined;
  const status =
    statusParam && options.statuses.includes(statusParam as GovernanceStatus)
      ? (statusParam as GovernanceStatus)
      : undefined;
  const theme = themeParam && options.themes.includes(themeParam) ? themeParam : undefined;

  const legislation = getLegislation({ region, status, theme, q: qParam });
  const issues = getGovernanceIssues(region);
  const summary = getLegislationSummary();

  logRequest(request, 200, start);
  return NextResponse.json({
    filters: { region, status, theme, q: qParam },
    options,
    summary,
    legislation,
    issues,
  });
}
