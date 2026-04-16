import fs from "fs";
import path from "path";

const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "freshcrate.db");

export function getDbPath(): string {
  return process.env.FRESHCRATE_DB_PATH || DEFAULT_DB_PATH;
}

export function ensureDbDir(dbPath = getDbPath()): string {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  return dbPath;
}
