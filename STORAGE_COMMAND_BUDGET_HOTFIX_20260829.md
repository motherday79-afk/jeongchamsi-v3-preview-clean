# JCS NOW / HISTORY V2 Storage Command Budget Hotfix

Date: 2026-08-29

## Purpose
Reduce Redis command pressure during repeated NOW refresh/publish cycles without changing the live 542-politician data model or deleting any existing HISTORY data.

## Runtime changes
- `msetJSON()` now sends a real Redis `MSET` command instead of a `/pipeline` containing many independent `SET` commands.
- NOW batch result + batch status are stored together with one `MSET`.
- NOW finalize ranked data + draft meta are stored together with one `MSET`.
- NOW publish core live stores are grouped into one `MSET`.
- 542 per-politician public entries remain chunked for payload safety, but each chunk is now one `MSET` rather than many `SET` commands.
- New formal publish snapshots are recorded only in HISTORY V2. HISTORY V1 data remains readable and its anonymous action-signal path remains active; existing V1 history is not deleted.
- NOW refresh/publish error alerts now show the server-provided Redis/storage detail in addition to the error code.
- Batch queue errors preserve `detail`, so a storage failure during a batch is not reduced to only `STORAGE_REQUEST`.

## Expected command reduction
For a 542-person formal publish, removing duplicate V1 snapshot capture avoids roughly 1,086 Redis commands. Converting public person writes from per-key SET pipeline commands to chunked MSET removes roughly another 500+ commands per publish. Batch save operations also drop from two storage commands per batch to one.

Exact provider accounting can differ, but this patch materially lowers command pressure while preserving HISTORY V2 raw observations.

## Important
If the Redis provider has already blocked writes because an account/request/storage limit is currently exhausted, code optimization cannot retroactively lift that provider-side block. After deployment, retry once: the popup will now include the provider's actual error detail so the remaining condition can be identified directly.
