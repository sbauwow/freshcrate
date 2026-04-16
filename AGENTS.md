# AGENTS.md — freshcrate Agent Guide

> For AI coding agents working on this codebase. Humans: see README.md.

## Quick Orient

freshcrate is a **freshmeat.net clone for the AI agent era** — a package directory
where agents and humans discover, search, and publish open source agent tools,
MCP servers, frameworks, and libraries.

**Stack:** Next.js 16 (App Router, Turbopack) + SQLite (better-sqlite3) + Tailwind CSS 4
**Language:** TypeScript (strict mode)
**Package manager:** npm (package-lock.json present — do NOT use yarn/pnpm)
**Node version:** 18+ (uses fetch natively)
**Database:** SQLite file at `./data/freshcrate.db` by default (auto-created on first run). Override with `FRESHCRATE_DB_PATH`.

## Project Map

```
freshcrate/
├── app/                          # Next.js App Router pages + API
│   ├── page.tsx                  # Homepage — latest releases + sidebar
│   ├── layout.tsx                # Shell — nav, search bar, footer
│   ├── browse/page.tsx           # Category browser (SSR)
│   ├── search/page.tsx           # Search results (SSR)
│   ├── submit/page.tsx           # Agent submission flow (client component)
│   ├── projects/[name]/page.tsx  # Project detail page (SSR)
│   ├── components/
│   │   └── research-feed.tsx     # Live research sidebar (client component)
│   └── api/
│       ├── page.tsx              # API docs page (static)
│       ├── projects/route.ts     # GET: list packages, POST: submit package
│       ├── search/route.ts       # GET: search packages
│       ├── categories/route.ts   # GET: list categories with counts
│       ├── enrich/route.ts       # POST: GitHub repo → pre-filled package data
│       └── research/route.ts     # GET: arXiv papers + HuggingFace trending
├── lib/
│   ├── db.ts                     # SQLite schema, init, auto-seed
│   └── queries.ts                # All database queries (typed)
├── scripts/
│   └── populate.mjs              # Bulk GitHub import pipeline with OAuth
├── data/freshcrate.db            # SQLite database (gitignored, auto-created)
├── .env.example                  # Environment variables template
└── package.json                  # Dependencies and scripts
```

## How to Run

```bash
cd freshcrate
npm install
npm run dev          # starts on http://localhost:3000
```

The database seeds automatically with 12 sample packages on first run.
No `.env` file needed for basic development — GitHub token is only needed
for the `/api/enrich` endpoint and `scripts/populate.mjs`.

## Architecture Decisions

### Data Flow
- **SSR pages** (homepage, browse, search, project detail) call `lib/queries.ts` directly
  — no API round-trip for server components.
- **Client components** (submit page, research feed) call `/api/*` routes.
- **API routes** are the public interface for external agents/scripts.

### Database
- Single SQLite file, WAL mode, foreign keys ON.
- Schema: `projects`, `releases`, `tags` (3 tables).
- `lib/db.ts` handles schema creation + seeding. Schema is idempotent (CREATE IF NOT EXISTS).
- `lib/queries.ts` exports all queries as typed functions. Add new queries here.
- No ORM — raw SQL via better-sqlite3 (synchronous API).

### Styling
- Tailwind CSS 4 with custom `fm-*` theme tokens defined in `globals.css`.
- Retro freshmeat-inspired aesthetic: small fonts (9-14px), green accents, sidebar layout.
- No component library. All UI is inline Tailwind classes.

### Categories
Category assignment uses regex-based rules (duplicated in `api/enrich/route.ts` and
`scripts/populate.mjs`). Current categories:
- AI Agents, Frameworks, MCP Servers, Developer Tools, Databases
- Security, Infrastructure, Testing, RAG & Memory, Prompt Engineering
- Libraries, Uncategorized

## Key Patterns

### Adding a New API Endpoint
1. Create `app/api/<name>/route.ts`
2. Export `GET`, `POST`, `PUT`, or `DELETE` async functions
3. Use `NextRequest`/`NextResponse` from `next/server`
4. For DB access: import from `@/lib/queries`

### Adding a New Page
1. Create `app/<path>/page.tsx`
2. Server components (default) can import `@/lib/queries` directly
3. Client components need `"use client"` directive and must use `/api/*` routes
4. Follow existing pattern: `border-b-2 border-fm-green` section headers, `text-[11px]` body text

### Adding a New Database Query
1. Add the function to `lib/queries.ts`
2. Use `getDb()` to get the database instance
3. Use `.prepare()` + `.get()` / `.all()` / `.run()` (synchronous)
4. Export a TypeScript interface for the return type

### Modifying the Schema
1. Edit `initDb()` in `lib/db.ts`
2. For dev: delete `data/freshcrate.db` and restart (auto-recreates)
3. For prod: write a migration (not yet implemented — see ROADMAP)

## Testing

**No test suite exists yet.** When adding tests:
- Prefer Vitest (aligns with Next.js ecosystem)
- API routes can be tested with direct function calls
- Database queries are synchronous — easy to unit test with in-memory SQLite
- Use `Database(":memory:")` for test isolation

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | No | GitHub API auth for `/api/enrich` and populate script |
| `FRESHCRATE_GITHUB_CLIENT_ID` | No | OAuth App client ID for populate script device flow |

## Common Tasks for Agents

### "Add a new feature to the homepage"
→ Edit `app/page.tsx` (server component, has access to all queries)

### "Add a new data source to the research feed"
→ Edit `app/api/research/route.ts` (add a fetch function, merge into response)
→ Update `app/components/research-feed.tsx` to render the new data

### "Change the database schema"
→ Edit `lib/db.ts` (schema) + `lib/queries.ts` (queries) + delete `.db` file

### "Add a new package category"
→ Update `CATEGORY_RULES` in both `app/api/enrich/route.ts` AND `scripts/populate.mjs`
→ Update `CATEGORIES` array in `app/submit/page.tsx`

### "Improve search"
→ Edit `searchProjects()` in `lib/queries.ts` (currently LIKE-based)
→ Consider FTS5 for full-text search (SQLite native)

### "Deploy to production"
→ `npm run build && npm start` (standard Next.js)
→ SQLite file must be on persistent disk (not serverless/ephemeral)
→ Domain is freshcrate.ai (referenced in API docs page)

## Gotchas

1. **Category rules are duplicated** in `api/enrich/route.ts` and `scripts/populate.mjs`.
   Keep them in sync or extract to a shared module.

2. **No auth on write endpoints.** `POST /api/projects` is wide open.
   Fine for development, needs auth before public deployment.

3. **SQLite is single-writer.** WAL mode helps reads, but concurrent writes
   will serialize. Fine for moderate traffic, not for high-write workloads.

4. **The `app/api/page.tsx` is a page inside the api directory.**
   This works because Next.js App Router distinguishes `page.tsx` from `route.ts`.
   Don't add a `route.ts` to `app/api/` — it will conflict.

5. **populate.mjs duplicates the schema** from `lib/db.ts`. It runs standalone
   (not through Next.js), so it can't import TypeScript modules directly.

6. **No migrations system.** Schema changes require deleting the DB in development.
   Production deployments need manual migration scripts.
