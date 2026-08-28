# JCS HISTORY V2 — Deployment Runbook

This package is designed for the **currently working JCS V3 source after the gateway-restore hotfix**.

## User deployment — only these steps

1. Back up the current project or make a source commit.
2. Extract `JCV3_HISTORY_V2_SEARCH_DAILY_FINAL_PATCH_20260829.zip` at the project root and overwrite matching files.
3. Deploy normally to Vercel using the existing environment configuration.

There is **no file to delete**, **no new database**, and **no new environment variable**.

## First operation after deployment

1. Sign in as administrator.
2. Open **Admin → HISTORY**.
3. Click **현재 542명 기준점 보존** once.
4. Confirm `CURRENT BASELINE` becomes `SAVED` and the immutable snapshot count is at least 1.
5. Use the HISTORY search box (name / party / region) to find one National Assembly member, one metropolitan mayor/governor, and one basic local-government head. There is no visible 542-person select list.
6. Confirm the current moment is labeled `FULL SNAPSHOT` and the six core indicators/rank/search-news evidence are visible where data exists.

The capture button does **not** refresh external data. It freezes the already-serving current dataset.

## Legacy Backfill — optional, after the FULL baseline check

After the current FULL snapshot is confirmed, run **Legacy History Backfill** from Admin → HISTORY if you want to migrate recoverable older trend/top30 material.

Legacy rows are shown as `LEGACY PARTIAL`. Fields that were not historically stored remain blank/unknown and are never manufactured as zero.

## What not to do first

- Do not run a 542-person NOW refresh merely to initialize HISTORY.
- Do not delete Redis keys.
- Do not delete any test file.
- Do not create another Redis instance.

## Rollback

If the deployment shows an unexpected UI regression, roll application code back to the preceding deployment. Leave `jcv3:history:v2:*` keys in place; the V2 data is append-only and can remain dormant while code is rolled back.

## Multiple refreshes per day

Multiple publishes on the same day are intentionally preserved as separate immutable observations. For an approximately 3-hour cadence, complete the normal NOW flow through **Publish** each time you want that moment frozen in HISTORY.

- 7-day analysis uses the intraday observations directly.
- 30/90/365/all analysis keeps every raw observation but normalizes trend statistics to one Asia/Seoul Daily Summary per day.
- Daily Summary displays observation count and representative daily statistics, so frequent event-day refreshes do not overweight long-term analysis.
