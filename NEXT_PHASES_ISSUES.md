# NEXT_PHASES_ISSUES.md — Freshcrate Execution Backlog

Last updated: 2026-04-11

This is the execution queue for the next phases after Phases 1–3 completion.
Keep ROADMAP.md as strategic context; use this file to ship.

---

## Sprint 1 (Weeks 1–2) — Re-baseline + Already Shipped Distribution

### FC-101: Re-baseline roadmap and education roadmap
Priority: P0
Status: Shipped

Scope:
- Update ROADMAP.md status to match shipped reality.
- Update EDUCATION_ROADMAP.md to mark shipped items complete (sitemap + OG routes).
- Move speculative items to a separate backlog section.

Acceptance criteria:
- ROADMAP.md has explicit sections: Now / Next / Later.
- No “Not started” item remains for features already present in code.
- One source of truth for execution priority.

Outcome:
- Strategic docs re-baselined to reflect shipped freshcrate state.

---

### FC-102: Author landing pages (`/author/[name]`)
Priority: P0
Status: Shipped

Scope:
- New SSR route for maintainer/author profile page.
- Show packages by author, release recency, categories, total stars.
- Add internal links from package cards and project pages.

Acceptance criteria:
- Route works for authors with 1+ projects.
- Author links appear on homepage/search/project pages.
- Author pages included in sitemap.

Outcome:
- Implemented and live.

---

### FC-103: Tag landing pages (`/tag/[tag]`)
Priority: P0
Status: Shipped

Scope:
- New SSR route for tag hub page.
- Show latest releases + top projects for that tag.
- Add links from tag chips to tag pages.

Acceptance criteria:
- Tag pages render for all known tags.
- Tag pages are indexable and in sitemap.
- Search-to-tag clickthrough events visible in request_log.

Outcome:
- Implemented and live.

---

### FC-104: Feed expansion (`/feed/[category].xml` + verified feed)
Priority: P1
Status: Shipped

Scope:
- Add category-specific Atom feeds.
- Add `verified` feed for newly verified projects.

Acceptance criteria:
- `/feed/ai-agents.xml` style feeds resolve.
- `/feed/verified.xml` resolves.
- Feeds pass basic Atom validation and include canonical links.

Outcome:
- Implemented via `/feed/[slug]` + `/feed/verified.xml`.

---

## Sprint 2 (Weeks 2–4) — Multi-source Import MVP

### FC-201: npm importer MVP
Priority: P0
Status: Shipped

Scope:
- Add ingestion script for npm packages using keyword/topic heuristics.
- Normalize into existing project schema with provenance.

Acceptance criteria:
- Imports at least 500 candidate npm packages in dry run.
- Dedupes against existing GitHub-imported records.
- Adds source metadata (`source_type=npm`).

Outcome:
- Implemented and committed.

---

### FC-202: PyPI importer MVP
Priority: P0
Status: Shipped

Scope:
- Add ingestion script for PyPI packages using AI/agent/RAG/MCP signals.
- Pull homepage/repo URLs when available.

Acceptance criteria:
- Imports at least 500 candidate PyPI packages in dry run.
- Dedupes by canonical repo/homepage.
- Adds source metadata (`source_type=pypi`).

Outcome:
- Implemented and committed.

---

### FC-203: Cross-source identity + dedupe
Priority: P0
Status: Shipped

Scope:
- Introduce canonical identity model (repo URL + normalized package slug + homepage).
- Add migration/indexes to enforce dedupe.

Acceptance criteria:
- Duplicate rate under 3% after npm+PyPI import.
- Duplicate merge script available for existing DB rows.
- No regressions in MCP/REST package fetch endpoints.

Outcome:
- Canonical key migration + duplicate merge tooling shipped.

---

### FC-204: Provenance UI + API exposure
Priority: P1
Status: Shipped

Scope:
- Surface source provenance on project pages and API payloads.
- Show confidence and import timestamp.

Acceptance criteria:
- Project page displays source badges (GitHub/npm/PyPI).
- `/api/projects` and `/api/projects/[name]` include provenance fields.

Outcome:
- Provenance now exposed in UI and API payloads.

---

## Sprint 3 (Weeks 4–6) — Ranking + Trust

### FC-301: Ranking v2 for search and browse
Priority: P0
Status: Next Up

Scope:
- Composite ranking formula using verification score, recency, stars/forks velocity, release cadence.
- Keep deterministic fallback ordering.

Acceptance criteria:
- Ranking strategy behind a config flag for rollback.
- Query-level tests for ranking determinism.
- Documented scoring weights in repo docs.

---

### FC-302: “Why this rank?” explainability
Priority: P1

Scope:
- Add rank breakdown on result cards/project page.
- Minimal UI string, no heavy visual overhead.

Acceptance criteria:
- Top ranking factors visible per package.
- Explanation available in API for agent consumption.

---

### FC-303: Trust badges refresh
Priority: P1

Scope:
- Add badges: maintained, fast-moving, dormant, verified.
- Badge logic derived from existing metadata.

Acceptance criteria:
- Badge criteria documented and tested.
- Badge distribution visible in stats endpoint.

---

## Sprint 4 (Weeks 6–8) — Learn Engagement

### FC-401: End-of-crate quizzes
Priority: P0

Scope:
- 3–5 MCQs per crate with scoring and explanations.
- Persist quiz completion with existing local progress store.

Acceptance criteria:
- Quizzes available on all 10 crates.
- Score + answer explanations render reliably.
- Completion state survives page reload.

---

### FC-402: Glossary page (`/learn/glossary` data-backed)
Priority: P1
Status: Shipped

Scope:
- Build glossary from structured terms in `learn-content`.
- Link terms back to source crates.

Acceptance criteria:
- Glossary has alphabetical index + deep links.
- Sitemap includes glossary route (already present) with valid content.

Outcome:
- Implemented and live.

---

### FC-403: Core concept diagrams (3 initial)
Priority: P1

Scope:
- Add diagrams for NN layers, transformer attention, ReAct loop.
- Use lightweight SVG (no heavy runtime dependency).

Acceptance criteria:
- Diagrams render on target crates with responsive layout.
- Lighthouse perf impact negligible.

---

## Sprint 5 (Weeks 8–10) — Operator Control Plane

### FC-501: Minimal admin dashboard
Priority: P1

Scope:
- Add secured admin surface for package flags, relabeling, and duplicate merge queue.
- Include request/error health snapshots.

Acceptance criteria:
- Auth required for admin routes.
- Core moderation actions complete without direct DB edits.

---

### FC-502: API key + webhook observability panel
Priority: P2

Scope:
- Show API key usage trends, webhook failure streaks, and retry outcomes.

Acceptance criteria:
- Dashboard displays last 7/30-day activity.
- Alerts for dead webhooks (>=10 failures) visible.

---

## Execution Notes

- Keep tickets small and independently shippable.
- Every ticket must include: migration impact, API impact, MCP impact, and rollback plan.
- After each sprint: run full build + tests + data-pipeline sanity pass.

## Suggested order to start now

1. FC-101 (docs re-baseline)
2. FC-102 (author pages)
3. FC-103 (tag pages)
4. FC-201 (npm importer MVP)
5. FC-203 (dedupe foundation)
