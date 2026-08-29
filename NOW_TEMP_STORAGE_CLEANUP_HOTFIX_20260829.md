# JCS NOW Temporary Storage Cleanup Hotfix

Purpose: recover Redis capacity without deleting HISTORY or current/public politician data.

## Safe cleanup scope
Only these temporary NOW workspace domains are scanned/deleted:
- `nowDataBatch:*`
- `nowDataBatchStatus:*`
- `nowDataDraftRanked:*`

The cleanup never targets:
- `nowDataCurrent`
- `nowDataHistory`
- `nowDataPublicHome`
- `nowDataPublicAdmin`
- `nowDataPublicCategory:*`
- `nowDataPersonPublic:*`
- `jcv3:history:v1:*`
- `jcv3:history:v2:*`

## Runtime behavior
1. Before a new NOW refresh draft is created, stale temporary NOW workspace keys are removed.
2. After a successful publish and HISTORY V2 capture attempt, the finished draft's batch/status/ranked workspace keys are removed.
3. Existing HISTORY V1/V2 records are preserved.
4. Existing 542-person current/public data is preserved.

No new DB or environment variable is required.
