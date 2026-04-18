import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("vm qcow2 image lane", () => {
  it("ships a github workflow to build, upload, and release the vm qcow2 artifact", () => {
    const workflowPath = path.join(process.cwd(), ".github", "workflows", "build-agent-edition-vm-image.yml");
    expect(fs.existsSync(workflowPath)).toBe(true);
    const workflow = fs.readFileSync(workflowPath, "utf8");
    expect(workflow).toContain("vm-qcow2-headless");
    expect(workflow).toContain("package-agent-edition-image.sh");
    expect(workflow).toContain("upload-artifact");
    expect(workflow).toContain("gh release create");
    expect(workflow).toContain("agent-edition-vm-qcow2-latest");
  });

  it("ships cloud-init seed files for the vm qcow2 lane", () => {
    const template = fs.readFileSync(path.join(process.cwd(), "images", "vm-qcow2-headless.pkr.hcl"), "utf8");
    expect(template).toContain('cd_label         = "cidata"');
    expect(template).toContain('images/cloud-init/vm-qcow2-headless/user-data');
    expect(fs.existsSync(path.join(process.cwd(), "images", "cloud-init", "vm-qcow2-headless", "meta-data"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "images", "cloud-init", "vm-qcow2-headless", "user-data"))).toBe(true);
  });

  it("exposes package.json commands for the vm image lane", () => {
    const packageJson = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain("image:package");
    expect(packageJson).toContain("image:build:vm");
  });
});
