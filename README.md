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

## MCP Server

freshcrate ships as an MCP (Model Context Protocol) server so any MCP-compatible
agent can discover, search, and publish packages natively.

### Quick Start

```bash
# Run the MCP server (stdio transport)
npm run mcp
```

### Configure Your Agent

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "freshcrate": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/path/to/freshcrate"
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "freshcrate": {
      "command": "npx",
      "args": ["tsx", "mcp/server.ts"],
      "cwd": "/path/to/freshcrate"
    }
  }
}
```

### Available Tools

| Tool | Description |
|---|---|
| `search_packages` | Search by name, description, or tags (FTS5 ranked) |
| `get_package` | Get package details + full release history |
| `list_categories` | List all categories with counts |
| `browse_category` | List packages in a category |
| `get_latest_releases` | Latest releases feed (paginated) |
| `submit_package` | Submit a new package |
| `enrich_repo` | Auto-fill package data from a GitHub URL |
| `get_stats` | Directory statistics |

## REST API

| Endpoint | Method | Description |
|---|---|---|
| `/api/projects` | GET | List packages (supports `limit`, `offset`) |
| `/api/projects` | POST | Submit a new package |
| `/api/projects/[name]` | GET | Get a single package by name |
| `/api/search?q=` | GET | Search packages (FTS5) |
| `/api/categories` | GET | List categories with counts |
| `/api/enrich` | POST | Agent enrichment — send `{ url }`, get pre-filled package data |
| `/api/research` | GET | Latest papers + trending models |
| `/feed.xml` | GET | Atom feed of latest releases |

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
    feed.xml/route.ts     # Atom RSS feed
    sitemap.ts            # Dynamic sitemap
    not-found.tsx         # Custom 404 page
    components/
      research-feed.tsx   # Live research sidebar (client component)
    api/
      projects/route.ts   # Package list + submit
      projects/[name]/    # Single package endpoint
      search/route.ts     # Search endpoint
      categories/route.ts # Category listing
      enrich/route.ts     # GitHub repo enrichment agent
      research/route.ts   # arXiv + HuggingFace feed
  lib/
    db.ts                 # SQLite init, seed, singleton
    queries.ts            # All database queries (JSDoc'd)
    categories.ts         # Shared category rules + constants
    migrate.ts            # SQL migration runner
  mcp/
    server.ts             # MCP server (8 tools, 2 resources)
  migrations/
    001_initial_schema.sql
    002_fts5_search.sql
  scripts/
    populate.mjs          # Bulk GitHub import pipeline with OAuth
    migrate.mjs           # Standalone migration CLI
  tests/
    queries.test.ts       # Query layer tests (31 tests)
    categories.test.ts    # Category logic tests
    setup.ts              # Test helpers (in-memory SQLite)
  freshcrate.db           # SQLite database (auto-created)
```

## Development

```bash
npm install          # install deps
npm run dev          # start dev server (localhost:3000)
npm test             # run test suite (31 tests)
npm run migrate      # apply database migrations
npm run mcp          # start MCP server (stdio)
npm run build        # production build
npm run lint         # eslint
```

## License

MIT
