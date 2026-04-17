import { describe, it, expect } from "vitest";
import { getHostedAgentEditionInstallScript } from "@/lib/workbench-install";

describe("workbench hosted install script", () => {
  it("returns a single-file install script suitable for curl | bash", () => {
    const script = getHostedAgentEditionInstallScript();
    expect(script.startsWith("#!/usr/bin/env bash")).toBe(true);
    expect(script).toContain("parse_common_args");
    expect(script).toContain("Agent Edition v0 supports Ubuntu 24.04 only");
    expect(script).toContain("freshcrate-agent-edition");
    expect(script).not.toContain('source "${SCRIPT_DIR}/lib/bootstrap-common.sh"');
    expect(script).toContain('bash scripts/verify-agent-edition.sh --bundle ${BUNDLE}');
  });
});
