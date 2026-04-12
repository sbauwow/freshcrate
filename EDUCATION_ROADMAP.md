# EDUCATION_ROADMAP.md — Mini Crates Build-Out Plan

Last updated: 2026-04-11

This roadmap tracks `/learn` and mini-crates evolution.

---

## Shipped Baseline

Already live:
- 10 crates across 3 tracks (Starter, Builder, Architect)
- `/learn` hub + `/learn/[slug]` lesson pages
- localStorage progress tracking and completion toggles
- prev/next crate navigation
- static generation via `generateStaticParams()`
- age-neutral language pass

Also already shipped (previously marked incorrectly in older roadmap drafts):
- Sitemap coverage for `/learn` and `/learn/[slug]`
- OG/social image routes:
  - `app/learn/opengraph-image.tsx`
  - `app/learn/[slug]/opengraph-image.tsx`

---

## NOW

1) Content quality gate
- Full fact-check pass across all 10 crates
- Link integrity pass for external resources
- Tone consistency pass

2) Engagement core
- End-of-crate quizzes (3–5 questions each)
- Data-backed glossary page with deep links to lessons

3) Visual comprehension uplift
- Initial diagram set:
  - Neural network layers
  - Transformer attention
  - ReAct loop

---

## NEXT

1) Bonus crates 11–15 (advanced topics)
2) Curated “Go deeper” reading lists per crate
3) Search/filter controls on `/learn` once content volume grows

---

## LATER

1) Embedded code playgrounds (higher effort)
2) Build-along project crates integrated with real freshcrate packages
3) Progress sync across devices (optional auth/export-import model)
4) Completion certificates

---

## Execution Mapping

Issue-level scope and acceptance criteria are tracked in:
- `NEXT_PHASES_ISSUES.md`
- GitHub issues #12, #13, #14 (Sprint 4)
