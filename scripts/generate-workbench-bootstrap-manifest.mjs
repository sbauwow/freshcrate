import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.join(root, "scripts", "lib", "bootstrap-common.sh");
const outputPath = path.join(root, "lib", "generated", "workbench-bootstrap-manifest.ts");

const BUNDLE_IDS = ["solo-builder-core", "research-node", "local-model-box"];

function parseShellListTokens(raw) {
  return raw
    .trim()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildManifest(text) {
  const manifest = Object.fromEntries(BUNDLE_IDS.map((bundleId) => [bundleId, { packages: [], services: [] }]));

  const packageCases = Array.from(text.matchAll(/([a-z0-9|-]+(?:\|[a-z0-9|-]+)*)\)\n\s+printf '%s\\n' ([^\n]+)\n\s+;;/g));
  for (const match of packageCases) {
    const bundleIds = match[1]?.split("|").map((item) => item.trim()).filter(Boolean) ?? [];
    const packages = parseShellListTokens(match[2] ?? "");
    for (const bundleId of bundleIds) {
      if (bundleId in manifest) manifest[bundleId].packages = packages;
    }
  }

  const servicePrintf = text.match(/bundle_services\(\) \{[\s\S]*?printf '%s\\n' ([^\n]+)\n\}/);
  const services = servicePrintf ? parseShellListTokens(servicePrintf[1] ?? "") : [];
  for (const bundleId of BUNDLE_IDS) {
    manifest[bundleId].services = services;
  }

  for (const bundleId of BUNDLE_IDS) {
    if (manifest[bundleId].packages.length === 0) {
      throw new Error(`Failed to parse packages for ${bundleId} from ${sourcePath}`);
    }
    if (manifest[bundleId].services.length === 0) {
      throw new Error(`Failed to parse services for ${bundleId} from ${sourcePath}`);
    }
  }

  return manifest;
}

const source = fs.readFileSync(sourcePath, "utf8");
const manifest = buildManifest(source);

const fileContent = `export const BOOTSTRAP_MANIFEST = ${JSON.stringify(manifest, null, 2)} as const;\n`;
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, fileContent);
console.log(`Generated ${path.relative(root, outputPath)}`);
