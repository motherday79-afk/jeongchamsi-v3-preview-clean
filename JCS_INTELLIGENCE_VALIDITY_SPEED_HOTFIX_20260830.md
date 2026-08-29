# JCS Intelligence Validity + Detail Performance Hotfix (2026-08-30)

## Scope

This hotfix addresses two issues without changing the protected public NOW/current supply paths.

### 1. Missing input must not become -50
- Missing/null/empty Political Intelligence inputs are treated as missing, not numeric zero.
- Fewer than 3 of the 6 core intelligence inputs => `INSUFFICIENT_DATA`.
- Age momentum, core attrition/inflow, media momentum, resilience, and attention/support gap are not fabricated while insufficient.
- Optional missing values in an otherwise valid analysis use neutral handling rather than an artificial -50.
- Legacy null HISTORY values are ignored in volatility/recovery calculations.
- Current Political Intelligence version: `JCS_POLITICAL_INTELLIGENCE_V1_2`.
- Older immutable V1_1 snapshots remain preserved but are not reused as the current answer.

### 2. Admin politician detail first-paint performance
- Politician detail no longer waits for HISTORY/Political Intelligence before the main detail DOM is committed.
- Admin-only Intelligence/HISTORY hydrates asynchronously after first paint.
- `view=detail` admin HISTORY requests bypass the full 542-person overview/roster path.
- Current NOW payload is not loaded if a compatible latest frozen Intelligence snapshot can answer the request.
- Latest immutable Intelligence snapshot decompression is reused in warm server runtime while draftId is unchanged.

## Protected paths checked
The hotfix does not modify:
- `api/gateway.js`
- `server/v3/routes/now-data.js`
- `server/v3/lib/now-public-signals.js`
- `server/v3/lib/now-public-snapshot.js`
- `src/core/repository.js`
- `src/views/home.js`
- `server/v3/routes/admin/now-data.js`
- `server/v3/lib/external-evidence-collector.js`

## Deployment
Apply this patch over the current Strategic Solution build and redeploy. No new DB, API key, or environment variable is required.

After deployment, run one admin full-data refresh when convenient to freeze the first V1_2 Political Intelligence snapshot. Until then, admin detail can live-derive the V1_2 current answer instead of reusing the old V1_1 snapshot.
