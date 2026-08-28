# JCS HISTORY DATA LAYER — Deployment Runbook

Target base: `v3.0.0-alpha6.0.36.68` + `HISTORY DATA LAYER V1`  
Package type: **changed files only**

## 1. Preconditions

Before applying the patch:

1. Start from the latest JCS V3 source that already contains the 2026-08-28 photo/admin/live-pulse/compare-axis patches.
2. Keep the existing Redis environment variables unchanged.
3. Do not create a new Redis, database, or History-specific environment variable.
4. Make a source backup or Git commit before overwrite.

## 2. Apply the patch

From the project root, extract the ZIP preserving paths and overwrite matching files.

Then delete the retired test contract listed in `DELETE_FILES.txt`:

`tests/home-live-pulse-03682.test.js`

This deletion matters only for reproducing the current 199-test suite; the test is superseded by the 0.36.83 live-pulse contract.

## 3. Expected changed runtime files

- `api/gateway.js`
- `index.html`
- `lib/v3/redis.js`
- `server/v3/lib/history-core.js`
- `server/v3/lib/history-store.js`
- `server/v3/routes/action.js`
- `server/v3/routes/admin/history.js`
- `server/v3/routes/admin/now-data.js`
- `src/app.js`
- `src/views/admin.js`

Tests and technical documents are also included in the package.

## 4. Local verification before deployment

Run from the project root:

```bash
node --test tests/history-*-20260829.test.js
npm test
```

Expected result:

- HISTORY: `51 tests / 51 pass / 0 fail`
- Full: `199 tests / 195 pass / 4 fail`

The four expected existing failures are:

- `03661 cache/version markers identify the structural cleanup build`
- `03662 version and cache markers identify the politician photo admin build`
- `deep analysis is progressively disclosed without extra javascript`
- `detail UI consumes intelligence scores instead of placeholder dashes`

Any additional failure is a deployment stop condition.

## 5. Deploy order

1. Apply changed files and deletion manifest.
2. Run HISTORY 51-test suite.
3. Run the full 199-test suite.
4. Deploy the resulting project to Vercel using the existing project/environment configuration.
5. Sign in as an administrator.
6. Open **Admin → HISTORY**.
7. Confirm:
   - access = `INTERNAL_ADMIN`
   - versions = `JCS_NOW_V1 / JCS_HISTORY_PIPELINE_V1 / JCS_DERIVED_V1`
   - roster = 542
8. Publish the next normal NOW snapshot once. Confirm the HISTORY snapshot counter increases.
9. Only after the normal publish check succeeds, execute **Legacy History Backfill** from the HISTORY admin tab.
10. Allow the admin page to continue automatically in 25-person pages until 542/542 is reached.

## 6. Backfill safety check

During Backfill:

- the same `trend.points` + `nowDataHistory.top30` publish is merged before write;
- formal Snapshot existence is batch-checked with MGET;
- formal Snapshot duplicates are skipped;
- observations use immutable deterministic keys and Redis pipeline writes.

Backfill can therefore be re-run safely; `SET NX` prevents overwriting existing immutable observations and sorted-set members are deterministic.

## 7. Post-deploy smoke check

As admin:

- HISTORY tab loads without 401/500.
- snapshot count and latest draft render.
- Backfill button is visible.
- NOW publish still completes.

As non-admin / logged out:

- `/api/v3/admin/history` must not return History data.
- public Home/NOW remains functional and does not depend on History reads.

## 8. Rollback

If deployment introduces an unexpected runtime regression:

1. Roll back application code to the immediately preceding deployment.
2. Do **not** delete existing `jcv3:history:v1:*` keys during a code rollback.
3. The data is append-only/immutable and can remain dormant while the application is rolled back.
4. Re-deploy the History patch after correcting the application issue.

## 9. Integrity check

Verify the downloaded ZIP against the SHA-256 value in:

`JCV3_HISTORY_DATA_LAYER_FINAL_PATCH_20260829_SHA256.txt`

Only deploy the package when the computed hash matches exactly.
