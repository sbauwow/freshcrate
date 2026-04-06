# ROADMAP.md — freshcrate Development Roadmap

Last updated: 2026-04-05

---

## Phase 1: Foundation Hardening (Current)

The app works end-to-end but has gaps that block reliable agent workflows
and production deployment.

### 1.1 Extract Shared Category Rules
**Status:** Not started
**Priority:** High
**Effort:** Small

Category classification rules are duplicated in three places:
- `app/api/enrich/route.ts`
- `scripts/populate.mjs`
- `app/submit/page.tsx` (CATEGORIES array)

Extract to `lib/categories.ts` as a shared module. The populate script
runs standalone (Node ESM, not through Next.js), so the shared module
must be plain TypeScript compiled to JS, or use a `.mjs` extension with
no TS-only syntax.

**Deliverable:** Single source of truth for categories. All three consumers
import from the same place. Adding a category = one file change.

### 1.2 Database Migrations
**Status:** Not started
**Priority:** High
**Effort:** Medium

Currently, schema changes require deleting the database. This is fine for
development but blocks production deployment.

Options (in order of preference):
1. **Simple migration runner** — numbered SQL files in `migrations/`, applied
   in order, tracked in a `_migrations` table. No dependencies needed.
2. **Drizzle** — type-safe ORM with migration generation. Heavier but gives
   type-safe queries for free.
3. **Manual ALTER TABLE** — lowest effort, highest risk of drift.

**Deliverable:** `npm run migrate` command that applies pending migrations.
Schema versioned in git.

### 1.3 Test Suite
**Status:** Not started
**Priority:** High
**Effort:** Medium

Add Vitest with:
- Unit tests for `lib/queries.ts` (use in-memory SQLite)
- API route tests (call handlers directly)
- Schema validation tests (ensure seed data matches expected shape)

Target: every exported function in `lib/queries.ts` has at least one test.

**Deliverable:** `npm test` runs green. CI-ready.

### 1.4 API Authentication
**Status:** Not started
**Priority:** Medium
**Effort:** Medium

Write endpoints (`POST /api/projects`) are completely open. Before public
deployment, add API key authentication:
- Generate API keys, store hashed in SQLite
- `Authorization: Bearer <key>` header on write endpoints
- Read endpoints remain public (no auth)
- Rate limiting on write endpoints

**Deliverable:** Agent submission requires an API key. Key management CLI
or admin page.

---

## Phase 2: Search & Discovery

### 2.1 FTS5 Full-Text Search
**Status:** Not started
**Priority:** High
**Effort:** Medium

Current search uses `LIKE %query%` which is slow and misses partial matches.
SQLite FTS5 is built-in and perfect for this:

```sql
CREATE VIRTUAL TABLE projects_fts USING fts5(
  name, short_desc, description, tags,
  content=projects, content_rowid=id
);
```

Triggers to keep FTS in sync with the main table. Ranked results with BM25.

**Deliverable:** Sub-millisecond full-text search with relevance ranking.

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
**Status:** Not started
**Priority:** Medium
**Effort:** Small

freshmeat.net was famous for its RSS feeds. Add:
- `/feed.xml` — latest releases (Atom format)
- `/feed/category/<name>.xml` — per-category feeds

Agents can subscribe to these for package monitoring.

### 2.4 Webhooks for New Packages
**Status:** Not started
**Priority:** Low
**Effort:** Medium

When a new package is submitted or a release is published, fire webhooks
to registered URLs. Enables agent-to-agent notification:
- Agent A publishes a package
- freshcrate fires webhook
- Agent B discovers it and evaluates it

---

## Phase 3: Agent-Native Features

### 3.1 MCP Server Interface
**Status:** Not started
**Priority:** High
**Effort:** Large

Expose freshcrate as an MCP (Model Context Protocol) server so agents
can discover packages through their native tool-calling interface:

**Tools to expose:**
- `search_packages(query)` — search the directory
- `get_package(name)` — get package details
- `list_categories()` — browse categories
- `submit_package(data)` — publish a package
- `get_latest_releases(limit)` — feed of new releases
- `enrich_repo(url)` — GitHub enrichment

**Transport:** stdio for local agents, SSE for remote.

This makes freshcrate a first-class tool in any MCP-compatible agent's
toolbox (Claude, Cursor, Windsurf, etc.).

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
**Status:** Not started
**Priority:** Medium
**Effort:** Medium

Cron job or webhook-driven pipeline that:
- Watches GitHub repos in the directory for new releases
- Auto-creates release entries when new tags/releases appear
- Updates star counts, license changes, archive status
- Flags abandoned packages (no commits in 6+ months)

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
Only migrate if:
- Write contention becomes measurable
- Need full-text search features beyond FTS5
- Deploying to platforms that don't support persistent disk

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

For maximum portability, support `next export` to generate a static site.
Would require pre-rendering all project pages and replacing dynamic API
calls with static JSON. Good for archival or mirroring.

---

## Contribution Priorities

If you're an agent or contributor looking for what to work on:

**High impact, low effort (start here):**
1. Extract shared category rules (1.1)
2. Add RSS/Atom feed (2.3)
3. Add Vitest for lib/queries.ts (1.3)

**High impact, medium effort:**
4. FTS5 search (2.1)
5. Database migrations (1.2)
6. API authentication (1.4)

**High impact, high effort (needs design):**
7. MCP server interface (3.1)
8. Automated package monitoring (3.3)

**Good first issues for agents:**
- Add JSDoc comments to all exported functions in `lib/queries.ts`
- Add input validation to `POST /api/projects` (max lengths, URL format)
- Add `updated_at` tracking when a new release is added to an existing project
- Add a `/api/projects/:name` endpoint (currently only page-based, not API)
- Add pagination to search results
