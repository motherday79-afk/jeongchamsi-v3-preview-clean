# JCS AGE & GENDER INTELLIGENCE ENGINE V2 — 2026-08-30

## Scope

Administrator-only Political Intelligence V2 foundation.

- Six age cohorts: 18–29 / 30–39 / 40–49 / 50–59 / 60–69 / 70+
- Gender aggregates: MALE / FEMALE
- 6 × 2 age-by-gender matrix
- Per-cell value, confidence, evidence count and validity state
- Cohort summaries only when time-correct evidence exists
- V2 immutable snapshot store under `jcv3:intelligence:v2:*`
- V2-first admin HISTORY read with V1.2 compatibility fallback
- Admin refresh finalize hook; public NOW publication remains manually controlled
- Local-only official election/population baseline importer; no runtime external API added
- 542/542 explicit baseline registry and release gate
- Local-only backtest harness and model card

## Data integrity

The shipped registry covers all 542 politicians but trusted official election + age×gender population baseline files have not been ingested into the production baseline asset in this release. The shipped state is therefore `BASELINE_INGESTION_REQUIRED` and V2 is not allowed to fabricate demographic values or overwrite useful V1.2 demographic output.

Missing or weak signals remain `SIGNAL CONFIDENCE LIMITED` while JCS HISTORY remains intact.

## Deployment

Apply this patch after `JCV3_JCS_SIGNAL_CONFIDENCE_CONTENT_SHARE_PATCH_20260830.zip`, overwrite matching files, then deploy to Vercel. No new environment variable or database is required.

## Protected public/current paths

This patch does not modify:

- `api/gateway.js`
- `server/v3/routes/now-data.js`
- `server/v3/lib/now-public-signals.js`
- `server/v3/lib/now-public-snapshot.js`
- `src/core/repository.js`
- `src/views/home.js`
