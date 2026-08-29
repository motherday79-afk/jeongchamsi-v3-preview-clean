# JCS POLITICAL INTELLIGENCE · ADMIN PATCH

Date: 2026-08-29  
Scope: INTERNAL_ADMIN politician detail intelligence

## What this patch adds

- `JCS INTELLIGENT DATA COLLECTION IN PROGRESS` for the admin NOW refresh progress label.
- Administrator-only `JCS POLITICAL INTELLIGENCE` on politician detail pages.
- 2030 / 4050 / 60+ support momentum on the existing -50 / 0 / +50 visual language.
- Core-support attrition and new-support inflow estimates.
- Support-quality segmentation: CORE / ACTIVE / SOFT / FLOATING.
- NEWS / YOUTUBE / SNS / COMMUNITY propagation estimates, persistence, burst and breadth.
- Issue Impact Map, Risk & Opportunity, Political Resilience, Attention → Support Gap and Competitor Flow.
- `JCS EST.` + confidence + observed-history context on inferred values.
- `EVIDENCE BASE` separating JCS internal evidence from curated external public evidence.

## Data rule

This release does not add another runtime API. Existing NOW/search/news/HISTORY remains the always-available base.

When an outside institution has useful public evidence, that evidence can be researched and curated into `server/v3/data/political-intelligence-evidence.js` with source attribution. Each evidence row has both `observedAt` and `ingestedAt`; an old JCS analysis cannot be rewritten by evidence that JCS only discovered later.

External facts are evidence. The resulting support/media/risk values are JCS-derived estimates and are shown as `JCS EST.` rather than as measured polling values.

The first registry example is `assembly-023` and demonstrates the structure with source-attributed public age-breakdown evidence. Politicians without curated external evidence still receive JCS analysis from current and HISTORY signals; confidence is lower and no outside source is fabricated.

## HISTORY philosophy

Political Intelligence V1 is versioned and deterministic. Its inputs are the already preserved current/HISTORY observations plus time-bounded evidence. Future calculation changes should use a new Political Intelligence version rather than silently rewriting V1 logic.

## Public protection

The Political Intelligence block is rendered only for authenticated administrators. Public/non-admin politician detail remains on the existing public information path.

The following serving contracts are intentionally not modified by this patch:

- `api/gateway.js`
- `server/v3/routes/now-data.js`
- `server/v3/lib/now-public-signals.js`
- `server/v3/lib/now-public-snapshot.js`
- `src/core/repository.js`

## Deployment

1. Back up or commit the currently working web project.
2. Extract the patch ZIP at the project root and overwrite matching files.
3. Deploy normally to Vercel.
4. No new database, environment variable, API key or backfill is required.
5. Sign in as administrator and open any politician detail page to see the new intelligence block.

Public users should see the same detail page they saw before this patch.
