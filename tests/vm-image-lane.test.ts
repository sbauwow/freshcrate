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
    expect(workflow).toContain("freshcrate-solo-builder-core-stable.qcow2.zip");
  });

  it("ships cloud-init seed files for the vm qcow2 lane", () => {
    const template = fs.readFileSync(path.join(process.cwd(), "images", "vm-qcow2-headless.pkr.hcl"), "utf8");
    expect(template).toContain('cd_label         = "cidata"');
    expect(template).toContain('images/cloud-init/vm-qcow2-headless/user-data');
    expect(fs.existsSync(path.join(process.cwd(), "images", "cloud-init", "vm-qcow2-headless", "meta-data"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "images", "cloud-init", "vm-qcow2-headless", "user-data"))).toBe(true);
  });

  it("uses Ubuntu 24.04-safe Python package names for bootstrap bundles", () => {
    const common = fs.readFileSync(path.join(process.cwd(), "scripts", "lib", "bootstrap-common.sh"), "utf8");
    expect(common).toContain("python3 python3-venv python3-pip");
    expect(common).not.toContain("python3.11");
  });

  it("keeps verification aligned with bootstrap for python, uv, and optional docker", () => {
    const verify = fs.readFileSync(path.join(process.cwd(), "scripts", "verify-agent-edition.sh"), "utf8");
    const bootstrap = fs.readFileSync(path.join(process.cwd(), "scripts", "bootstrap-agent-edition.sh"), "utf8");
    expect(verify).toContain('command available: python3');
    expect(verify).not.toContain('python3.11');
    expect(verify).toContain('docker optional for current bootstrap image lane');
    expect(bootstrap).toContain('/usr/local/bin/uv');
  });

  it("packages vm artifacts by probing actual disk images, not just filename extensions", () => {
    const packaging = fs.readFileSync(path.join(process.cwd(), "scripts", "package-agent-edition-image.sh"), "utf8");
    expect(packaging).toContain('qemu-img info');
    expect(packaging).toContain('find "$OUTPUT_DIR" -type f -print0');
  });

  it("exposes package.json commands for the vm image lane", () => {
    const packageJson = fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    expect(packageJson).toContain("image:package");
    expect(packageJson).toContain("image:build:vm");
  });
});
