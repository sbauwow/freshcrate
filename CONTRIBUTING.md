# CONTRIBUTING.md — How to Contribute to freshcrate

## For AI Agents

This project is designed to be agent-friendly. If you're an AI coding agent
(Claude Code, Codex, Copilot, OpenCode, etc.), read AGENTS.md first for
project orientation, then follow the workflow below.

## For Humans

Standard open-source contribution flow. Fork, branch, PR.

---

## Development Setup

```bash
git clone https://github.com/<owner>/freshcrate.git
cd freshcrate
npm install
npm run dev
```

The app starts at http://localhost:3000 with a seeded SQLite database.
No external services needed for basic development.

For the GitHub enrichment flow (`/submit` and `/api/enrich`), set:
```bash
export GITHUB_TOKEN=ghp_your_token_here
```

For the populate pipeline, see `scripts/populate.mjs --help`.

## Branch Strategy

- `main` — stable, deployable
- `feature/<name>` — new features
- `fix/<name>` — bug fixes
- `agent/<name>` — agent-authored changes (for provenance tracking)

Use descriptive branch names: `feature/fts5-search`, `fix/category-sync`,
`agent/add-pagination`.

## Commit Style

Conventional commits preferred:

```
feat: add FTS5 full-text search
fix: sync category rules between enrich and populate
refactor: extract shared category rules to lib/categories.ts
docs: update API documentation for new endpoints
test: add vitest suite for lib/queries
chore: update dependencies
```

Keep commits atomic — one logical change per commit.

## Code Style

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **Tailwind CSS 4** — inline classes, use existing `fm-*` theme tokens
- **No component library** — keep it simple, vanilla React + Tailwind
- **Synchronous DB** — better-sqlite3 is sync by design, don't wrap in async
- **Server components by default** — only use `"use client"` when needed (interactivity)
- **Named exports for queries** — all DB functions go in `lib/queries.ts`
- **ESLint** — run `npm run lint` before committing

## Adding Features

### New API Endpoint

1. Create `app/api/<endpoint>/route.ts`
2. Export the HTTP method handlers (`GET`, `POST`, etc.)
3. Validate inputs, return proper status codes
4. Add to the API docs page (`app/api/page.tsx`)
5. Update the README API table

### New Page

1. Create `app/<path>/page.tsx`
2. Follow existing styling patterns (check `app/page.tsx` for reference)
3. Server component unless you need client interactivity
4. Add navigation link in `app/layout.tsx` if top-level

### Schema Changes

1. Update `initDb()` in `lib/db.ts`
2. Add/update queries in `lib/queries.ts` with proper TypeScript types
3. Delete `data/freshcrate.db` locally to test clean creation
4. If `scripts/populate.mjs` touches the changed tables, update it too
5. Document the migration path for existing databases

### New Category

Must update ALL of these:
- `CATEGORY_RULES` in `app/api/enrich/route.ts`
- `CATEGORY_RULES` in `scripts/populate.mjs`
- `CATEGORIES` array in `app/submit/page.tsx`

This is a known duplication issue — see ROADMAP.md for the planned fix.

## Testing (WIP)

No test suite exists yet. When contributing tests:

- **Framework:** Vitest (preferred) or Jest
- **DB tests:** Use `Database(":memory:")` for isolation
- **API tests:** Call route handlers directly (Next.js allows this)
- **E2E:** Playwright if needed, but prioritize unit/integration first

Minimum test expectations for new features:
- API endpoints: test happy path + validation errors
- Query functions: test with sample data
- Schema changes: test migration from empty + from previous state

## Pull Request Checklist

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] New API endpoints documented in `app/api/page.tsx`
- [ ] README.md updated if public interface changed
- [ ] AGENTS.md updated if project structure/patterns changed
- [ ] Category rules kept in sync across all locations
- [ ] No hardcoded credentials or tokens

## Agent-Specific Guidelines

### Autonomous Work

Agents should feel empowered to:
- Fix bugs without asking permission
- Refactor duplicated code (e.g., category rules)
- Add missing error handling
- Improve TypeScript types
- Add JSDoc comments to exported functions

### Before Large Changes

For significant changes (new tables, new pages, architectural shifts),
create a GitHub issue first describing:
- What you want to change
- Why (problem statement)
- How (proposed approach)
- What breaks (migration/compatibility impact)

### Subagent-Friendly Structure

The codebase is structured for parallel agent work:
- **API routes are independent** — different agents can work on different endpoints
- **Pages are independent** — UI changes don't conflict across pages
- **Queries are centralized** — `lib/queries.ts` is the only DB access layer
- **No global state** — each request gets its own DB connection

### Context Windows

If you're working with limited context:
- `lib/queries.ts` + `lib/db.ts` give you the full data model
- Any single `app/api/*/route.ts` is self-contained
- `package.json` tells you all dependencies
- `AGENTS.md` is your orientation doc

## Architecture Principles

1. **No unnecessary abstractions** — SQLite is the database, not an ORM
2. **Server-first rendering** — use SSR unless client interactivity is required
3. **Agent-consumable API** — every feature should have an API endpoint
4. **Flat is better than nested** — minimal directory nesting
5. **Explicit over implicit** — no magic, no auto-generated code at runtime
6. **Retro aesthetic** — the freshmeat.net vibe is intentional, not accidental
