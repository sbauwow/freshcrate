# Railway DB Cutover Checklist (Freshcrate)

Use this for fast execution.

## 1) Persistent storage
- [ ] Attach a Railway persistent volume to the service.
- [ ] Choose mount path (example: `/data`).

## 2) Environment variable
- [ ] Set `FRESHCRATE_DB_PATH=/data/freshcrate.db` in Railway.
- [ ] Redeploy after setting env var.

## 3) Deploy code-only
- [ ] Push branch with DB-decoupling changes.
- [ ] Confirm no `.db` files are committed.

## 4) Initialize DB
- [ ] Run migration in Railway runtime:
  - `npm run migrate`
- [ ] Confirm DB file exists at `/data/freshcrate.db`.

## 5) Load data (first cutover)
Choose one path:

A) Minimal boot (sample seed only)
- [ ] Start app normally and verify pages load.

B) Full catalog ingest
- [ ] `node scripts/populate.mjs --clear`
- [ ] `node scripts/topic-watch.mjs`
- [ ] `node scripts/backfill.mjs`
- [ ] `node scripts/enrich.mjs`
- [ ] `node scripts/verify.mjs`

## 6) Verify production health
- [ ] `GET /api/metrics` returns success.
- [ ] Non-zero table counts (`projects`, `releases`).
- [ ] Search endpoint returns expected results.
- [ ] Homepage/latest releases render correctly.

## 7) Post-cutover guardrails
- [ ] Keep `.gitignore` entries for `*.db`, `*.db-shm`, `*.db-wal`, `/data/`.
- [ ] Keep deploy process code-only (no DB staging/commit).
- [ ] Optional: add CI/pre-commit check to block `.db` files.

## Rollback (quick)
- [ ] Point `FRESHCRATE_DB_PATH` to last known-good DB snapshot.
- [ ] Redeploy.
- [ ] Re-run `npm run migrate` only if required by schema mismatch.
