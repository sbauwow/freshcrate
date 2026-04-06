# ROADMAP.md — freshcrate Development Roadmap

Last updated: 2026-04-05

---

## Phase 1: Foundation Hardening

### 1.1 Extract Shared Category Rules
**Status:** DONE
**Deliverable:** `lib/categories.ts` — single source of truth for categories,
category rules, and licenses. Used by enrich API, submit page, and populate script.

### 1.2 Database Migrations
**Status:** DONE
**Deliverable:** Simple SQL migration runner in `lib/migrate.ts`. Numbered `.sql`
files in `migrations/`. Tracked in `_migrations` table. CLI: `npm run migrate`.
- `001_initial_schema.sql` — projects, releases, tags tables
- `002_fts5_search.sql` — FTS5 virtual table with sync triggers

### 1.3 Test Suite
**Status:** DONE
**Deliverable:** Vitest with 31 tests across 2 files. In-memory SQLite for
isolation. Covers all `lib/queries.ts` functions + `lib/categories.ts`.
Run: `npm test`

### 1.4 API Authentication
**Status:** DONE
**Deliverable:** SHA-256 hashed API keys in SQLite (`api_keys` table, migration 003).
Write endpoints require `Authorization: Bearer <key>` when any keys exist.
Graceful degradation: fresh installs with no keys allow open access.
Daily rate limiting per key. CLI: `npm run apikeys` (create/list/revoke).
18 tests covering key lifecycle, rate limits, revocation.

---

## Phase 2: Search & Discovery

### 2.1 FTS5 Full-Text Search
**Status:** DONE
**Deliverable:** SQLite FTS5 virtual table (`projects_fts`) with triggers
for INSERT/UPDATE/DELETE sync. `searchProjects()` uses FTS5 with BM25 ranking,
falls back to LIKE if FTS unavailable. Tag search via LIKE UNION.

### 2.2 Package Detail Enrichment
**Status:** Not started
**Priority:** Medium
**Effort:** Medium

Extend project pages with:
- README rendering (fetch from GitHub, cache in DB)
- Star count / fork count (stored, refreshed periodically)
- Dependency graph (parse package.json / pyproject.toml)
- Similar packages (based on tags/category overlap)

### 2.3 RSS/Atom Feed
**Status:** DONE
**Deliverable:** `/feed.xml` — Atom feed of latest 50 releases with title,
link, author, category, and changes content.

### 2.4 Webhooks for New Packages
**Status:** Not started
**Priority:** Low
**Effort:** Medium

When a new package is submitted or a release is published, fire webhooks
to registered URLs. Enables agent-to-agent notification.

---

## Phase 2.5: Good First Issues (DONE)

- [x] JSDoc comments on all exported functions in `lib/queries.ts`
- [x] Input validation on `POST /api/projects` (max lengths, category validation, duplicate check)
- [x] `/api/projects/[name]` endpoint (GET single project with releases)
- [x] UNIQUE constraint on project names
- [x] Add `updated_at` tracking when a new release is added (migration 004, trigger)
- [x] Add pagination to search results (`limit` + `offset` params, `total` in response)

---

## Phase 3: Agent-Native Features

### 3.1 MCP Server Interface
**Status:** DONE
**Deliverable:** `mcp/server.ts` — full MCP server with 8 tools and 2 resources.
Run: `npm run mcp` (stdio transport). Config docs in README for Claude Desktop,
Cursor, and other MCP clients.

**Tools:** search_packages, get_package, list_categories, browse_category,
get_latest_releases, submit_package, enrich_repo, get_stats.
**Resources:** freshcrate://categories, freshcrate://stats.

### 3.2 Package Verification & Trust
**Status:** Not started
**Priority:** Medium
**Effort:** Large

Agent-submitted packages need trust signals:
- **Verified badge** — repo exists, description matches, license confirmed
- **Security scan** — basic static analysis (no malware, no credential harvesting)
- **Community ratings** — upvote/downvote (authenticated)
- **Agent attestation** — which agent submitted it, from which org

### 3.3 Automated Package Monitoring
**Status:** DONE
**Deliverable:** `scripts/monitor.mjs` — checks all packages with GitHub repos
for new releases/tags. Creates release entries, detects abandoned/archived repos.
Run: `npm run monitor` (or `npm run monitor:dry` for dry run).
Designed for cron: `0 6 * * * cd /path/to/freshcrate && npm run monitor`

### 3.4 Package Comparison
**Status:** Not started
**Priority:** Low
**Effort:** Medium

Side-by-side comparison of packages:
- `/compare?a=langchain&b=llamaindex`
- Stars, releases, license, last update, tags overlap
- Useful for agents evaluating tool choices

---

## Phase 4: Scale & Polish

### 4.1 Migrate to PostgreSQL (Optional)
**Status:** Not started
**Priority:** Low
**Effort:** Large

SQLite handles the expected load (thousands of packages, moderate traffic).
Only migrate if write contention becomes measurable.

### 4.2 Admin Dashboard
**Status:** Not started
**Priority:** Low
**Effort:** Medium

- Package moderation (approve/reject/flag)
- Analytics (popular searches, submission rate, category distribution)
- User/API key management
- Bulk operations (recategorize, merge duplicates)

### 4.3 Multi-Source Import
**Status:** Not started
**Priority:** Low
**Effort:** Large

Extend the populate pipeline beyond GitHub:
- PyPI (Python packages with agent/AI tags)
- npm (Node packages with agent/mcp tags)
- crates.io (Rust packages)
- Hugging Face Spaces

### 4.4 Static Export Option
**Status:** Not started
**Priority:** Low
**Effort:** Small

Support `next export` for static site generation.

---

## Next Up

**High-value Phase 2:** Package detail enrichment (2.2), webhooks (2.4)
**Phase 3:** Package verification & trust (3.2), package comparison (3.4)
**Phase 4:** Admin dashboard (4.2), multi-source import (4.3)
