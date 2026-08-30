JCV3 PLAN A PERSON PAYLOAD 9.5MB FINAL HOTFIX - 2026-08-31

APPLY ON TOP OF:
- JCV3_PLAN_A_PAYLOAD_9_5MB_NOWRANK30_FINAL_INTEGRATED_20260831

ROOT CAUSE FIXED:
- Main NOW publish payload was already compacted under 9.5MB.
- The separate writePersonEntries() path still sent 40-person MSET payloads without size fitting.
- Those person-public writes could independently exceed Upstash's 10MB request ceiling.

CHANGE:
- Every existing 40-person MSET chunk is measured before msetJSON().
- If over 9,500,000 bytes, only redundant row payload is compacted.
- Required person detail data is preserved: identity/rank/search counts/news counts, 12 recent news titles+links+sources+times, analysis, whyNow, related, rank history and trend.
- Raw news descriptions/provider payload/debug/search raw response are not stored in the person-public copy.
- Redis transport implementation and chunk size are unchanged.
- Publish response exposes personPublishPayload stats for live verification.

NOT CHANGED:
- NOW RANK frontend/home path.
- JCS calculations / AGE-GENDER / Intelligence calculation inputs.
- HISTORY source calculation flow.
- lib/v3/redis.js.
