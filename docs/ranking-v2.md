# Ranking v2

freshcrate ranking v2 is the composite browse/search ranking model for package discovery.

## Rollback flag

- Enabled by default
- Disable with:
  - `FRESHCRATE_RANKING_V2=0`
  - or `FRESHCRATE_RANKING_V2=false`
  - or `FRESHCRATE_RANKING_V2=off`

## Where it applies

- search results via `searchProjects()`
- browse results via `getLatestReleases(..., { sort: "rank" })`
- category browse uses the same ranking model when ranking is selected

Non-ranking sorts (`newest`, `oldest`, `stars`, `name`) remain deterministic SQL orderings.

## Score components

Total score:
- `verifiedComponent + recencyComponent + adoptionComponent + cadenceComponent + queryComponent`

### 1. Verification / trust

Formula:
- verified badge bonus: `+18` if `project.verified`
- verification score bonus: `clamp(verification.score / 6, 0, 16)`

Interpretation:
- strongly favors verified and high-confidence packages
- max contribution: `34`

### 2. Recency

Formula:
- `clamp(24 - releaseDays / 14, -12, 24)`

Interpretation:
- recent releases get a strong boost
- very stale releases can go negative
- max contribution: `24`

### 3. Adoption / velocity

Formula:
- `adoptionVelocity = (stars + forks * 2) / createdDays`
- `clamp(log1p(stars) * 4 + log1p(forks) * 2 + log1p(adoptionVelocity * 30) * 4, 0, 28)`

Interpretation:
- rewards projects with real traction
- rewards fork activity and faster growth relative to age
- max contribution: `28`

### 4. Release cadence

Formula:
- `clamp(releaseCount * 2.5 + (releaseDays <= 30 ? 4 : 0), 0, 16)`

Interpretation:
- favors packages that release repeatedly
- gives an extra bump for releases in the last 30 days
- max contribution: `16`

### 5. Query relevance

Formula:
- token hit count across name, short description, long description, and tags
- `clamp(queryHits * 3, 0, 12)`

Interpretation:
- ensures trusted/popular packages still need to match the query
- max contribution: `12`

## Tie-breakers

When total score ties:
1. verified first
2. stars descending
3. latest release date descending
4. name ascending

## Product intent

Ranking v2 is meant to surface:
- trusted packages
- recently maintained packages
- packages with real adoption
- packages with sustained release activity
- packages that still match the user query

It is not meant to replace explicit user-selected sort modes.
