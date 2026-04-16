# Freshcrate DB Transition Plan

Goal: decouple SQLite runtime state from git so deploys are code-only and DB state lives on persistent storage.

## What changed already

1) DB path is now configurable
- New env var: `FRESHCRATE_DB_PATH`
- Default path: `./data/freshcrate.db`
- App + scripts now resolve DB path through helpers:
  - `lib/db-path.ts`
  - `scripts/lib/db-path.mjs`

2) DB directory auto-creation
- App and scripts call `ensureDbDir()` before opening SQLite.

3) DB removed from git tracking
- `freshcrate.db` removed from index (`git rm --cached freshcrate.db`).

4) Ignore rules updated
- `.gitignore` now ignores:
  - `*.db`
  - `*.db-shm`
  - `*.db-wal`
  - `/data/`

5) Docs and env template updated
- `.env.example` includes `FRESHCRATE_DB_PATH`
- README/AGENTS/CONTRIBUTING updated to `data/freshcrate.db` model.

## Transition steps (production)

1) Provision persistent storage
- Attach a persistent volume in Railway.
- Pick DB path on that volume, e.g. `/data/freshcrate.db`.

2) Set environment variable
- In Railway service env vars:
  - `FRESHCRATE_DB_PATH=/data/freshcrate.db`

3) Deploy code-only change
- Push current branch after review.
- Do not commit any `.db` files.

4) Run migrations against persistent DB
- After deploy, run:
  - `npm run migrate`
- This creates DB file if missing and applies schema.

5) Seed or repopulate data (first cutover only)
- Choose one:
  - Baseline sample seed (automatic on first app start), or
  - Full ingest:
    - `node scripts/populate.mjs --clear`
    - `node scripts/topic-watch.mjs`
    - `node scripts/backfill.mjs`
    - `node scripts/enrich.mjs`
    - `node scripts/verify.mjs`

6) Verify health
- `GET /api/metrics` should show non-zero DB size and table counts.
- App pages and search should return expected data.

## Local development instructions

Default local path is now `./data/freshcrate.db`.

Optional override:
- `export FRESHCRATE_DB_PATH=/absolute/path/to/freshcrate.db`

Common commands:
- `npm run migrate`
- `npm run dev`
- `npm test`

## CI/CD and workflow changes

- Deploy pipeline should not stage DB files.
- Keep deploy commits code/config only.
- If data refresh is needed, run scripts against runtime DB, not via git commit.

## Rollback plan

If migration/cutover fails:
1) Keep app code at previous known-good commit.
2) Point `FRESHCRATE_DB_PATH` to last known-good DB snapshot.
3) Re-run `npm run migrate` only if schema mismatch requires it.
4) Restore from volume snapshot if DB corruption occurs.

## Risks and mitigations

Risk: DB path misconfigured
- Mitigation: assert `FRESHCRATE_DB_PATH` in production env and check `/api/metrics`.

Risk: ephemeral storage used by mistake
- Mitigation: mount persistent volume and ensure DB path points to mount.

Risk: accidental recommit of DB files
- Mitigation: keep `*.db` ignore rules and add pre-commit check if needed.

## Immediate follow-up checklist

- [ ] Set Railway `FRESHCRATE_DB_PATH=/data/freshcrate.db`
- [ ] Confirm persistent volume mount exists
- [ ] Deploy branch with decoupling changes
- [ ] Run `npm run migrate`
- [ ] Run initial ingest/refresh scripts
- [ ] Validate `/api/metrics` and live search/pages
