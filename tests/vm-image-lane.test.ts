import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("vm qcow2 image lane", () => {
  it("ships a github workflow to build and upload the vm qcow2 artifact", () => {
    const workflowPath = path.join(process.cwd(), ".github", "workflows", "build-agent-edition-vm-image.yml");
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("vm-qcow2-headless");
    expect(workflow).toContain("package-agent-edition-image.sh");
    expect(workflow).toContain("upload-artifact");
  });

  it("exposes package.json commands for the vm image lane", () => {
    const packageJson = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain("image:package");
    expect(packageJson).toContain("image:build:vm");
  });
});
