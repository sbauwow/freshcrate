#!/usr/bin/env bash
set -euo pipefail

# freshcrate Railway production DB fill
# Usage:
#   chmod +x scripts/run-railway-freshcrate-fill.sh
#   ./scripts/run-railway-freshcrate-fill.sh
#
# Prereqs:
#   1) railway CLI installed
#   2) authenticated: railway login
#   3) linked to the correct freshcrate Railway project/service
#   4) GITHUB_TOKEN set in Railway env for higher GitHub API limits

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found"
  exit 1
fi

echo "== Railway auth check =="
railway status >/dev/null

echo "== Running production DB fill against /data/freshcrate.db =="
railway run sh -lc '
  set -euo pipefail
  export FRESHCRATE_DB_PATH=/data/freshcrate.db

  echo "[1/9] migrate"
  npm run migrate

  echo "[2/9] github populate"
  node scripts/populate.mjs

  echo "[3/9] npm import"
  node scripts/import-npm.mjs

  echo "[4/9] pypi import"
  node scripts/import-pypi.mjs

  echo "[5/9] dedupe merge"
  node scripts/merge-duplicates.mjs --apply

  echo "[6/9] topic watch"
  npm run topics

  echo "[7/9] backfill + enrich"
  npm run backfill
  npm run enrich

  echo "[8/9] dependency scan"
  npm run scan-deps

  echo "[9/9] verify"
  npm run verify
'

echo "== Done =="
echo "Optional post-checks:"
echo "  railway run sh -lc 'export FRESHCRATE_DB_PATH=/data/freshcrate.db; sqlite3 /data/freshcrate.db \"select count(*) from projects;\"'"
echo "  railway logs"
