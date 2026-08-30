JCV3 PLAN A FINAL INTEGRATED PATCH - 2026-08-31

BASE:
- JCV3_JCS_AGGRESSIVE_ENGINE_INFOREGHINI_FINAL_INTEGRATED_20260830
- plus JCV3_CLEAN_REBUILD_R2_FINAL_INTEGRATED_20260831 changes

THIS PATCH ADDS/FIXES:
1) NOW publish payload compaction before Redis MSET.
   - Full collected/current data is used for calculations, person public entries, HISTORY V2 and JCS snapshots.
   - Only the redundant stored copy inside nowDataCurrent is compacted.
   - Long duplicate news URLs/descriptions are not duplicated into nowDataCurrent.
   - Actual serialized Redis MSET request size is measured.
   - Target: <= 9,500,000 bytes.
   - Redis transport/storage implementation is NOT changed.
2) NOW RANK main path.
   - /api/v3/home now exposes published NOW top30 + signals.
   - 10 people per page, 3 pages when 30 are available.
   - previous/next arrows are wired locally in app.js.
   - automatic rotation every 4 seconds; no hover/focus pause.
   - cache revision bumped.
3) Refresh finalize non-blocking Intelligence failure persists preview META and closes progress at verify/warnings.

IMPORTANT:
- No legacy failed storage chunk/rootfix code is included.
- lib/v3/redis.js is not included or modified.
