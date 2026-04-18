# RANKING_V2.md — freshcrate Search/Browse Ranking

Last updated: 2026-04-16

This document defines Ranking v2 for freshcrate search and browse surfaces.

## Scope

Ranking v2 currently applies to:
- `searchProjects()`
- `getProjectsByCategory()`

It is designed to improve trust and freshness ordering without changing the underlying matching/filter logic.

## Rollback Flag

Ranking v2 is enabled by default.

Disable it with:

```bash
FRESHCRATE_RANKING_V2=0
```

Accepted off values:
- `0`
- `false`
- `off`

When disabled, legacy ordering remains in place:
- browse/category pages: alphabetical
- search: legacy query order from current SQL path

## Scoring Model

Composite score:

```text
score = verified + recency + adoption_velocity + release_cadence + query_match
```

### 1) Verified / trust component
Purpose:
- reward machine-verified packages
- use existing verification score when present

Formula:
- verified badge bonus: `+18` if `verified=1`
- verification score bonus: `verification_json.score / 6`, capped to `+16`

Effective range:
- `0 .. 34`

### 2) Recency component
Purpose:
- prefer actively maintained packages
- penalize stale releases

Formula:
- `24 - (days_since_latest_release / 14)`
- clamped to `-12 .. +24`

Implication:
- very recent releases score high
- long-stale packages can go negative

### 3) Adoption / velocity component
Purpose:
- reward packages with real usage signal
- normalize by project age so old repos do not win purely by age

Inputs:
- `stars`
- `forks`
- project age from `created_at`

Formula:
- velocity = `(stars + forks*2) / project_age_days`
- component = `log1p(stars)*4 + log1p(forks)*2 + log1p(velocity*30)*4`
- clamped to `0 .. 28`

### 4) Release cadence component
Purpose:
- reward projects with repeated releases and recent shipping behavior

Inputs:
- `release_count`
- latest release recency

Formula:
- `release_count * 2.5`
- plus `+4` if latest release is within 30 days
- clamped to `0 .. 16`

### 5) Query match component
Purpose:
- keep search relevance from being overwhelmed by trust/freshness signals

Formula:
- count query-token hits across:
  - `name`
  - `short_desc`
  - `description`
  - `tags`
- score = `query_token_hits * 3`
- clamped to `0 .. 12`

Note:
- this component is only meaningful on search paths where a query exists
- browse/category ranking effectively gets `0` here

## Deterministic Tie-Breakers

If composite scores tie, order by:
1. `verified DESC`
2. `stars DESC`
3. `release_date DESC`
4. `name ASC`

This keeps output stable and testable.

## Why this version

Ranking v2 is intentionally conservative:
- no schema migration required
- uses existing project metadata
- deterministic and easy to test
- reversible with one env flag

## Known limitations

Current velocity is inferred from current stars/forks over project age.
It is not true time-series velocity.

Future upgrades may add:
- historical star/fork snapshots
- dependency audit quality signals
- source-specific trust weighting
- explicit explainability payloads per result
