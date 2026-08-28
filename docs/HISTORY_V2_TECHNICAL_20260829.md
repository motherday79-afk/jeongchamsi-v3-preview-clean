# JCS HISTORY V2 — Technical Specification

Date: 2026-08-29  
Access: `INTERNAL_ADMIN`  
History pipeline: `JCS_HISTORY_PIPELINE_V2`  
Derived metrics: `JCS_DERIVED_V2`  
NOW calculation contract: `JCS_NOW_V1`

## 1. Purpose

HISTORY V2 implements the operational rule **“오늘의 분석은 사라지지 않는다.”**

The live JCS V3 NOW/detail path remains the serving source of truth. HISTORY V2 is an additive, admin-only intelligence layer that freezes what the system knew at each publish time so later algorithm changes do not rewrite the past.

## 2. Golden-baseline isolation

The following live/public files are treated as protected contracts and remain byte-identical to the verified working baseline:

- `api/gateway.js`
- `server/v3/routes/now-data.js`
- `server/v3/lib/now-public-signals.js`
- `server/v3/lib/now-public-snapshot.js`
- `src/core/repository.js`

Browser-side HISTORY calls are isolated in `src/core/history-repository.js`. The public NOW repository is not extended or replaced.

## 3. Redis namespace

V2 uses the existing Redis configuration and a separate prefix:

- snapshot: `jcv3:history:v2:snapshot:{draftId}`
- snapshot index: `jcv3:history:v2:snapshots`
- observation: `jcv3:history:v2:observation:{personId}:{publishId}`
- person observation index: `jcv3:history:v2:observations:{personId}`
- event: `jcv3:history:v2:event:{eventId}`
- event index: `jcv3:history:v2:events`

No new database and no new environment variable are required.

## 4. FULL immutable observation

A FULL observation stores the timestamped political-analysis state needed to reconstruct the analysis without rerunning a future algorithm:

- public politician identity
- global rank / category rank / category label
- NOW index / search score / news score
- all current 21 Intelligence score fields and available grades
- six core indicators: overall interest, high engagement, mass expansion, activity, issue heat, media spread
- audience position/label
- SIGNAL label and diagnosis
- media/public direction data and `whyNow`
- numeric PC/mobile/total search values
- 6h/24h/7d news counts, media-source count, latest news, compact headline evidence
- related/competitive nearby politicians at that observation time
- providers, weights, access scope, algorithm versions, coverage metadata

The immutable snapshot and observation writes use deterministic keys and `SET NX` semantics.

## 5. Current-state capture

`capture-current` reads the already-published `nowDataCurrent` and `nowDataHistory`. It does **not** call Naver APIs and does not refresh the 542-person dataset.

This creates the first HISTORY V2 FULL baseline from the data that is already serving the site. Re-running the capture is idempotent for the same draft ID.

## 6. Future publish ordering

A normal NOW publish follows this safety order:

1. write existing live/public NOW outputs;
2. write existing per-person public entries;
3. attempt V1 compatibility History capture;
4. attempt V2 History capture;
5. History failures return warnings but do not fail or roll back an already-successful NOW publish.

This ordering prevents HISTORY from becoming a dependency of the live detail page.

## 7. Legacy migration

Legacy backfill reads existing `nowDataPersonPublic:{personId}.trend.points` and `nowDataHistory` material in 25-person pages.

- duplicate publish observations are merged;
- V2 FULL snapshot existence is checked in batch;
- formal FULL moments are not duplicated as partial rows;
- missing historical fields are omitted instead of being converted to zero;
- migrated rows are explicitly labeled `LEGACY_PARTIAL`.

## 8. Derived windows

Admin reads support `7`, `30`, `90`, `365`, and `all` windows.

For available numeric observations V2 returns:

- six-core first-to-last deltas
- momentum for each core series
- volatility as the population standard deviation of consecutive available-value deltas
- global/category rank change
- latest available six-core values and ranks

Missing values remain unavailable rather than becoming fabricated zeros.

## 9. Admin intelligence surfaces

### Admin → HISTORY

- immutable snapshot status
- current 542-person baseline capture
- Legacy Backfill
- 542-person selector
- 7/30/90/365/all ranges
- six-core latest values, momentum change, volatility
- FULL vs LEGACY PARTIAL timeline
- search/news evidence
- SIGNAL / diagnosis / why-now
- stored competitor context
- political events on the same time axis

### Politician detail

Only an authenticated administrator requests HISTORY data. A compact `HISTORY INTELLIGENCE · INTERNAL_ADMIN` card is appended after the existing public analysis. A HISTORY read failure cannot alter the existing analysis block.

### Home

Only an authenticated administrator requests the compact HISTORY overview. The internal strip is omitted for ordinary users and if the HISTORY request fails.

## 10. Existing anonymous action history

The existing V1 anonymous ACTION aggregate remains active and unchanged. V2 intentionally does not duplicate those writes in this release, avoiding unnecessary changes to the working action route and preventing double-counting. No member identity or raw search text is introduced into V2.

## 11. Security

- `/api/v3/admin/history` runs server-side `requireAdmin()`.
- HISTORY is `INTERNAL_ADMIN` only.
- V2 source contains no History-specific `process.env` dependency.
- V2 observation persistence does not store user ID, email, nickname, IP, raw search query, or raw search keyword.
- public NOW modules do not import the V2 store.

## 12. Release gate

A V2 package is accepted only when:

- all V2 tests pass;
- all V1 HISTORY tests continue to pass;
- the full project suite has no failures beyond the four known pre-existing contracts;
- JavaScript syntax checks pass;
- V2 CSS adds no `!important`;
- protected golden files remain byte-identical;
- roster remains 542 = 299 assembly + 16 metropolitan + 227 basic;
- the final ZIP is reapplied to a clean golden copy and those checks are repeated.
