import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("iso image lane", () => {
  it("ships a github workflow to build, upload, and release the ISO artifact", () => {
    const workflowPath = path.join(process.cwd(), ".github", "workflows", "build-agent-edition-iso-image.yml");
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("iso-autoinstall-headless");
    expect(workflow).toContain("build-agent-edition-iso.sh");
    expect(workflow).toContain("upload-artifact");
    expect(workflow).toContain("gh release create");
    expect(workflow).toContain("agent-edition-iso-latest");
    expect(workflow).toContain("freshcrate-solo-builder-core-stable.iso");
  });

  it("ships cloud-init/autoinstall seed files for the ISO lane", () => {
    expect(fs.existsSync(path.join(process.cwd(), "images", "cloud-init", "iso-autoinstall-headless", "meta-data"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "images", "cloud-init", "iso-autoinstall-headless", "user-data"))).toBe(true);
  });

  it("ships an ISO build script that remasters Ubuntu live-server media with autoinstall nocloud data", () => {
    const script = fs.readFileSync(path.join(process.cwd(), "scripts", "build-agent-edition-iso.sh"), "utf8");
    expect(script).toContain("ubuntu-24.04-live-server-amd64.iso");
    expect(script).toContain("nocloud");
    expect(script).toContain("xorriso");
    expect(script).toContain("freshcrate-solo-builder-core-stable.iso");
  });

  it("exposes package.json commands for the ISO image lane", () => {
    const packageJson = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain("image:build:iso");
  });
});
