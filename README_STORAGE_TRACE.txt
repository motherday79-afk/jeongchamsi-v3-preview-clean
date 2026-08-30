JCV3 STORAGE TRACE DIAGNOSTIC HOTFIX

Purpose:
- Diagnostic only. No payload trimming, Redis chunking, or storage behavior changes.
- Logs every SET/MSET-class Redis write request with command, exact JSON request bytes, and key names.
- On a storage failure, appends JCS_STORAGE_TRACE to the propagated error detail so the admin popup identifies the failing request.

Expected failure example:
[JCS_STORAGE_TRACE command=MSET bytes=10513988 keys=jcv3:content:v4:...]

Apply on top of:
JCV3_PLAN_A_PERSON_PAYLOAD_9_5MB_FINAL_HOTFIX_20260831
