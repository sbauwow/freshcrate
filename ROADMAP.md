# ROADMAP.md — freshcrate Strategic Roadmap

Last updated: 2026-04-11

This file is strategic direction.
Execution tickets live in `NEXT_PHASES_ISSUES.md` and GitHub issues.

---

## Current State

Phases 1–3 are complete:
- Foundation hardening (migrations, tests, auth)
- Search and discovery baseline (FTS5, enrich, feed, webhooks)
- Agent-native features (MCP server, verification, monitoring, compare)

Core product is in production at `www.freshcrate.ai`.

---

## NOW (active execution window)

These are active priorities for the next 6–10 weeks:

1) Distribution pages and crawl surface expansion
- Author pages (`/author/[name]`)
- Tag pages (`/tag/[tag]`)
- Expanded feeds (category + verified)

2) Multi-source ingestion MVP
- npm importer
- PyPI importer
- Cross-source dedupe and canonical identity
- Provenance in UI + API

3) Ranking + trust upgrades
- Ranking v2 in search/browse
- Explainable ranking factors
- Trust/lifecycle badge refresh

4) Learn engagement
- End-of-crate quizzes
- Data-backed glossary
- Core concept diagrams

5) Operator control plane
- Minimal admin dashboard
- API key + webhook observability

Source of truth for issue-level scope and acceptance criteria:
- `NEXT_PHASES_ISSUES.md`
- GitHub issues #1–#16

---

## NEXT (queued after current window)

1) Build-along learning tracks that map directly to freshcrate packages
2) Additional educational crate expansion (11–15) after quiz/diagram baseline ships
3) Advanced discovery UX improvements once content volume increases

---

## LATER (opportunistic / conditional)

1) PostgreSQL migration
- Only if measurable SQLite write contention appears

2) Static export path
- For archival/mirroring use-cases

3) Additional import ecosystems
- crates.io and Hugging Face package-space expansion after npm/PyPI stability

---

## Notes

- Keep this file short and execution-oriented.
- Do not list already-shipped features as "Not started".
- Move speculative ideas to backlog docs/issues, not this roadmap.
