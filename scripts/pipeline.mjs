#!/usr/bin/env node

/**
 * freshcrate Full Data Pipeline
 *
 * Runs all steps in sequence:
 *   1. Migrate — apply pending database migrations
 *   2. Populate — search GitHub, import packages with full metadata
 *   3. Verify — run automated 10-point verification on all packages
 *
 * Usage:
 *   GITHUB_TOKEN=<token> node scripts/pipeline.mjs
 *   GITHUB_TOKEN=<token> node scripts/pipeline.mjs --clear    # wipe and rebuild
 *   GITHUB_TOKEN=<token> node scripts/pipeline.mjs --dry-run  # preview only
 */

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

  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
      env: { ...process.env },
    });
  } catch (err) {
    console.error(`\n  ❌ ${label} failed (exit code ${err.status})`);
    process.exit(1);
  }
}

console.log("🚀 freshcrate Full Data Pipeline\n");

if (!process.env.GITHUB_TOKEN) {
  console.log("  ⚠ GITHUB_TOKEN not set. Pipeline will use OAuth or cached token.\n");
}

// Step 1: Migrate
run("Database Migrations", "node scripts/migrate.mjs");

// Step 2: Populate
const populateArgs = args.replace("--dry-run", "").trim();
run("Populate from GitHub", `node scripts/populate.mjs ${populateArgs}`);

// Step 3: Verify
run("Verify Packages", `node scripts/verify.mjs ${DRY ? "--dry-run" : ""}`);

console.log(`\n${"═".repeat(60)}`);
console.log("  ✅ Pipeline complete!");
console.log(`${"═".repeat(60)}\n`);
