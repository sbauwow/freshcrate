import { NextRequest, NextResponse } from "next/server";
import {
  getWorkbenchBrief,
  getWorkbenchBundles,
  getWorkbenchFilterOptions,
  getWorkbenchInstallModes,
  getWorkbenchPlaybook,
  type WorkbenchMode,
  type WorkbenchPersona,
  type WorkbenchTarget,
} from "@/lib/workbench";
import { logRequest } from "@/lib/request-log";

export function GET(request: NextRequest) {
  const start = Date.now();

  const personaParam = request.nextUrl.searchParams.get("persona") || undefined;
  const targetParam = request.nextUrl.searchParams.get("target") || undefined;
  const modeParam = request.nextUrl.searchParams.get("mode") || undefined;
  const qParam = request.nextUrl.searchParams.get("q")?.trim() || undefined;

  const options = getWorkbenchFilterOptions();
  const persona =
    personaParam && options.personas.includes(personaParam as WorkbenchPersona)
      ? (personaParam as WorkbenchPersona)
      : undefined;
  const target =
    targetParam && options.targets.includes(targetParam as WorkbenchTarget)
      ? (targetParam as WorkbenchTarget)
      : undefined;
  const mode = modeParam && options.modes.includes(modeParam as WorkbenchMode) ? (modeParam as WorkbenchMode) : undefined;

  const bundles = getWorkbenchBundles({ persona, target, mode, q: qParam });
  const brief = getWorkbenchBrief();
  const playbook = getWorkbenchPlaybook({ persona, target, mode, q: qParam });
  const installModes = getWorkbenchInstallModes();

  logRequest(request, 200, start);
  return NextResponse.json({
    filters: { persona, target, mode, q: qParam },
    options,
    brief,
    installModes,
    playbook,
    bundles,
  });
}
