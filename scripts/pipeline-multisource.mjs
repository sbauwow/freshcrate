#!/usr/bin/env node

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2).join(" ");
const DRY = args.includes("--dry-run");

function run(label, cmd) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  STEP: ${label}`);
  console.log(`${"═".repeat(60)}\n`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: "inherit", env: { ...process.env } });
}

try {
  console.log("🚀 freshcrate Multi-source Pipeline\n");
  run("Database Migrations", "node scripts/migrate.mjs");
  run("GitHub Populate", `node scripts/populate.mjs ${args.replace("--dry-run", "").trim()}`);
  run("npm Import", `node scripts/import-npm.mjs ${DRY ? "--dry-run" : ""}`);
  run("PyPI Import", `node scripts/import-pypi.mjs ${DRY ? "--dry-run" : ""}`);
  run("Canonical Dedupe", "node scripts/merge-duplicates.mjs");
  run("Verify", `node scripts/verify.mjs ${DRY ? "--dry-run" : ""}`);
  console.log(`\n${"═".repeat(60)}`);
  console.log("  ✅ Multi-source pipeline complete");
  console.log(`${"═".repeat(60)}\n`);
} catch (err) {
  console.error("\n❌ pipeline-multisource failed", err?.message || err);
  process.exit(1);
}
