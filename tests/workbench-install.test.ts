import { describe, it, expect } from "vitest";
import {
  buildAgentEditionCommands,
  getAgentEditionPresetCards,
  getHostedAgentEditionInstallScript,
} from "@/lib/workbench-install";

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

  it("builds bundle-aware hosted and local install commands", () => {
    const commands = buildAgentEditionCommands({ bundle: "research-node", mode: "light-desktop" });
    expect(commands.hosted).toContain("/api/install/agent-edition");
    expect(commands.hosted).toContain("--bundle research-node");
    expect(commands.hosted).toContain("--mode light-desktop");
    expect(commands.local).toBe("bash scripts/bootstrap-agent-edition.sh --bundle research-node --mode light-desktop");
    expect(commands.verify).toBe("bash scripts/verify-agent-edition.sh --bundle research-node --mode light-desktop");
  });

  it("falls back to safe defaults for unsupported query values", () => {
    const commands = buildAgentEditionCommands({ bundle: "made-up-bundle", mode: "weird" as never });
    expect(commands.hosted).toContain("--bundle solo-builder-core");
    expect(commands.hosted).toContain("--mode headless");
    expect(commands.local).toBe("bash scripts/bootstrap-agent-edition.sh --bundle solo-builder-core --mode headless");
  });

  it("returns preset cards with stable bundle/mode deep links", () => {
    const presets = getAgentEditionPresetCards();
    expect(presets.length).toBeGreaterThanOrEqual(4);
    expect(presets.some((preset) => preset.href.includes("bundle=automation-node"))).toBe(true);
    expect(presets.some((preset) => preset.href.includes("mode=headless"))).toBe(true);
    expect(presets.every((preset) => preset.summary.length > 0)).toBe(true);
  });
});
