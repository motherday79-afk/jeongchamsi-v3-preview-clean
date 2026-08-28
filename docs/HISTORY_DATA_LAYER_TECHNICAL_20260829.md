# JCS HISTORY DATA LAYER — Technical Specification

Base application: `v3.0.0-alpha6.0.36.68`  
Patch: `HISTORY DATA LAYER V1` / cache tag `history-v1`  
Date: 2026-08-29  
Current access scope: `INTERNAL_ADMIN`

## 1. Purpose

The History layer implements the principle **“오늘의 분석은 사라지지 않는다.”**

The existing NOW pipeline remains the live serving layer. HISTORY is an internal intelligence layer that preserves the context behind each published analysis so that 2026–2027 observations can later support longitudinal analysis, 2028 election research, and future B2B intelligence products.

This release does **not** add another database or environment variable. It reuses the existing Redis REST configuration.

## 2. Version contracts

| Contract | Version |
|---|---|
| NOW calculation | `JCS_NOW_V1` |
| History pipeline | `JCS_HISTORY_PIPELINE_V1` |
| Derived metrics | `JCS_DERIVED_V1` |

Access vocabulary is fixed to:

- `PUBLIC`
- `INTERNAL_ADMIN`
- `FUTURE_B2B`

HISTORY is currently `INTERNAL_ADMIN` only.

## 3. Stored layers

### 3.1 Immutable formal Snapshot

Every successful admin NOW publish creates one immutable snapshot identified by `draftId`.

Redis key pattern:

`jcv3:history:v1:snapshot:{draftId}`

The snapshot stores:

- publish identity and timestamp
- algorithm versions
- search/news weights
- providers
- roster size
- politician public identity fields
- global rank
- calculated NOW/search/news scores
- numeric Naver Search Ads source values
- numeric news count/source values

The formal snapshot is written with Redis `SET ... NX`; an existing snapshot is never overwritten.

### 3.2 Per-politician immutable Observation

For longitudinal lookup, each published politician row is also materialized as an immutable observation and indexed by a Redis sorted set.

Key patterns:

- `jcv3:history:v1:observation:{personId}:{publishId}`
- `jcv3:history:v1:observations:{personId}`

The sorted-set score is the publish timestamp. This allows 30/90/365-day reading without repeatedly loading every 542-person snapshot.

### 3.3 Anonymous ACTION aggregate

Selected service actions are accumulated by day with `HINCRBY`. History storage receives only allowlisted dimensions such as politician ID, poll ID, option ID, age group, evaluation ID, rating, content domain, or slot ID.

It does **not** receive or persist member identity fields such as user ID, email, nickname, or IP address. Comment/post body text is not sent to History. Search query text is not stored in History.

### 3.4 Political EVENT

Admin can append an immutable political event with:

- event ID
- occurred time
- title/category
- related politician IDs
- source URL
- note
- History/derived version metadata

Events are append-only and indexed on the same time axis.

## 4. Publish flow

1. Admin completes NOW collection and preview.
2. `admin/now-data` constructs the formal `current` object.
3. `recordPublishedSnapshot(current)` runs before public NOW publication completes.
4. Snapshot is written immutably.
5. Per-politician observations are written with Redis pipeline operations.
6. Existing NOW current/public/category/person outputs are written as before.

Public Home and public NOW snapshot modules do not import the History implementation.

## 5. Legacy Backfill

Backfill is designed for safe migration of existing historical NOW material.

- Page size: **25 politicians**
- Admin UI: automatically continues page-by-page until the 542-person roster is complete
- Person trend inputs: loaded in one `MGET` per page
- Legacy source inputs:
  - `nowDataPersonPublic:{personId}.trend.points`
  - `nowDataHistory.items[].top30`
- If the same publish is present in both sources, it is merged into **one** observation before storage.
- Formal Snapshot existence for all candidate draft IDs is checked in **one batched MGET**.
- If a formal immutable Snapshot already exists for that draft, the corresponding legacy observation is excluded from Backfill.
- Remaining observations are written using deterministic keys, `SET NX`, sorted-set indexes, and Redis pipeline operations.

This prevents duplicate legacy records from distorting derived MOMENTUM and VOLATILITY.

## 6. Derived metrics V1

`JCS_DERIVED_V1` currently exposes deterministic historical metrics from chronological observations:

- `sampleSize`
- `momentum`: last observation score minus first observation score
- `volatility`: standard deviation of consecutive score deltas

The calculation version is stored with History data so a future algorithm can coexist without rewriting old data.

## 7. Security and exposure

- API gateway exposes one History route: `admin/history`.
- The route executes server-side `requireAdmin(req)`.
- Responses are `no-store`.
- History is not wired to the public Home/NOW serving path.
- No new DB service is introduced.
- No new environment variable is introduced.
- Existing Redis credentials remain the only History storage configuration.

## 8. Admin operation

Admin navigation contains a `HISTORY` tab that shows:

- immutable snapshot count
- latest snapshot draft ID
- roster total
- current access scope
- algorithm version contracts
- Backfill page size
- Backfill start/control state

Backfill begins only after explicit administrator action.

## 9. Verification status

Fresh verification on the packaged working tree:

- HISTORY tests: **51 / 51 passed**
- Full project tests: **195 / 199 passed**
- New HISTORY regression failures: **0**
- Remaining failures are the four pre-existing contracts:
  1. `0.36.61` cache/version marker
  2. `0.36.62` cache/version marker
  3. Deep Analysis progressive disclosure
  4. Politician Intelligence detail UI

Final ZIP verification and SHA-256 are recorded in the accompanying Runbook and SHA file.
