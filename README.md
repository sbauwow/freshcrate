# freshcrate

The open source package directory for AI agents. From meat to code to crate.

A [freshmeat.net](https://en.wikipedia.org/wiki/Freecode) clone rebuilt for the agent era — discover, search, and publish open source agent tools, frameworks, MCP servers, and libraries.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **SQLite** via better-sqlite3 (zero-config, file-based)
- **Tailwind CSS 4** with a retro freshmeat-inspired theme

## Getting Started

```bash
cd freshcrate
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The database seeds automatically on first run with sample packages. To populate with real packages from GitHub, run the populate pipeline (see below).

## Features

### Package Directory

- **Homepage** — latest releases feed with urgency badges, tags, and release notes
- **Browse** — filter by category (AI Agents, MCP Servers, Frameworks, Databases, Security, etc.)
- **Search** — full-text search across names, descriptions, and tags
- **Project Pages** — detail view with release history, links, and metadata

### Agent Submission Flow

Submit a package at `/submit`:

1. Paste a GitHub URL or `owner/repo`
2. The enrichment agent fetches repo metadata, latest release, license, topics from GitHub
3. Auto-categorizes based on name/description/topics
4. Review the pre-filled form, edit anything, and publish

Also supports manual submission and the REST API.

### Populate Pipeline

Bulk-import real packages from GitHub:

```bash
node scripts/populate.mjs           # auto-auth, append to DB
node scripts/populate.mjs --clear   # wipe and repopulate
node scripts/populate.mjs --login   # force re-authenticate
GITHUB_TOKEN=ghp_... node scripts/populate.mjs  # use env token
```

The pipeline:

- Searches GitHub across 14 queries (MCP servers, AI agents, vector DBs, RAG frameworks, etc.)
- Fetches latest release/tag, license, topics for each repo
- Auto-categorizes and assigns urgency based on release recency
- **OAuth Device Flow** — on first run or rate limit, opens your browser for GitHub auth. Token is cached in `.freshcrate-token` for future runs.

### Live Research Feed

The sidebar pulls live data (cached 1hr):

- **Latest Research** — papers from HuggingFace Daily Papers + arXiv cs.AI/cs.CL
- **Trending Models** — top models from HuggingFace trending API

### Sidebar Resources

Curated links for agents:

- HuggingFace (models, datasets)
- arXiv (cs.AI, cs.CL)
- MCP Spec + official server registry
- PyPI and npm agent package searches
- Papers With Code, GitHub #ai-agent
- Leaderboards: Open LLM, LM Arena, SWE-bench, Aider

## API

| Endpoint | Method | Description |
|---|---|---|
| `/api/projects` | GET | List packages (supports `limit`, `offset`) |
| `/api/projects` | POST | Submit a new package |
| `/api/search?q=` | GET | Search packages |
| `/api/categories` | GET | List categories with counts |
| `/api/enrich` | POST | Agent enrichment — send `{ url }`, get pre-filled package data |
| `/api/research` | GET | Latest papers + trending models |

## Project Structure

```
freshcrate/
  app/
    page.tsx              # Homepage — latest releases + sidebar
    layout.tsx            # Shell — nav, search bar, footer
    browse/page.tsx       # Category browser
    search/page.tsx       # Search results
    submit/page.tsx       # Agent submission flow
    projects/[name]/      # Project detail page
    components/
      research-feed.tsx   # Live research sidebar (client component)
    api/
      projects/route.ts   # Package CRUD
      search/route.ts     # Search endpoint
      categories/route.ts # Category listing
      enrich/route.ts     # GitHub repo enrichment agent
      research/route.ts   # arXiv + HuggingFace feed
  lib/
    db.ts                 # SQLite schema, init, seed
    queries.ts            # All database queries
  scripts/
    populate.mjs          # Bulk GitHub import pipeline with OAuth
  freshcrate.db           # SQLite database (auto-created)
```

## License

MIT
