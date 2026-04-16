import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..", "..");
const DEFAULT_DB_PATH = path.join(PROJECT_ROOT, "data", "freshcrate.db");

export function getDbPath() {
  return process.env.FRESHCRATE_DB_PATH || DEFAULT_DB_PATH;
}

export function ensureDbDir() {
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
}
