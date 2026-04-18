import { NextRequest, NextResponse } from "next/server";
import {
  getOrchestraBrief,
  getOrchestraFilterOptions,
  getOrchestraPatterns,
  getOrchestraPlaybook,
  type OrchestraStage,
} from "@/lib/orchestra";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();

  const themeParam = request.nextUrl.searchParams.get("theme") || undefined;
  const stageParam = request.nextUrl.searchParams.get("stage") || undefined;
  const qParam = request.nextUrl.searchParams.get("q")?.trim() || undefined;

  const options = getOrchestraFilterOptions();
  const theme = themeParam && options.themes.includes(themeParam) ? themeParam : undefined;
  const stage =
    stageParam && options.stages.includes(stageParam as OrchestraStage)
      ? (stageParam as OrchestraStage)
      : undefined;

  const patterns = getOrchestraPatterns({ theme, stage, q: qParam });
  const brief = getOrchestraBrief();
  const playbook = getOrchestraPlaybook({ theme, stage, q: qParam });

  logRequest(request, 200, start);
  return NextResponse.json({
    filters: { theme, stage, q: qParam },
    options,
    brief,
    playbook,
    patterns,
  });
}
