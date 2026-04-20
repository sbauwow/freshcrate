#!/usr/bin/env bash
# Run the post-deploy pipeline for the new differentiator features:
# migrations, canonical-key backfill, health scoring, MCP detection.
# npm/PyPI import + dedup merge are gated behind --with-dedup because
# they ingest new rows and merge aggressively.
#
# Usage:
#   bash scripts/run-railway-differentiators.sh              # safe, idempotent
#   bash scripts/run-railway-differentiators.sh --with-dedup # also imports + merges

set -euo pipefail

WITH_DEDUP=0
for arg in "$@"; do
  case "$arg" in
    --with-dedup) WITH_DEDUP=1 ;;
    *) echo "unknown arg: $arg"; exit 1 ;;
  esac
done

if ! command -v railway >/dev/null 2>&1; then
  echo "railway CLI not found"
  exit 1
fi

echo "== Railway auth check =="
railway status >/dev/null

echo "[1/4] migrate"
railway ssh npm run migrate

echo "[2/4] backfill canonical keys"
railway ssh npm run backfill-canonical

echo "[3/4] compute health scores"
railway ssh npm run score

echo "[4/4] detect MCP compatibility"
railway ssh npm run detect-mcp

if [[ "$WITH_DEDUP" -eq 1 ]]; then
  echo ""
  echo "== Dedup phase (destructive) =="
  read -p "Import from npm + PyPI and merge duplicates? [y/N] " ans
  if [[ "$ans" != "y" && "$ans" != "Y" ]]; then
    echo "Skipping dedup phase."
  else
    echo "[dedup 1/3] import npm"
    railway ssh npm run import-npm

    echo "[dedup 2/3] import pypi"
    railway ssh npm run import-pypi

    echo "[dedup 3/3] merge duplicates"
    railway ssh npm run backfill-canonical
    railway ssh npm run merge-duplicates:apply
  fi
fi

echo ""
echo "== Done =="
echo "Sanity checks:"
echo "  railway ssh sqlite3 /data/freshcrate.db 'select count(*) as scored from projects where health_score is not null;'"
echo "  railway ssh sqlite3 /data/freshcrate.db 'select count(*) as mcp from projects where mcp_json != \"{}\";'"
echo "  railway ssh sqlite3 /data/freshcrate.db 'select source_type, count(*) from projects group by source_type;'"
