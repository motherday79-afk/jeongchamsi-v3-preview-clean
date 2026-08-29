# JCS AGE & GENDER INTELLIGENCE V2 — UI Visibility Hotfix (2026-08-30)

## Root cause
The admin detail view had V2 presentation code, but the HISTORY reader only merged a frozen V2 layer when cohort validity was `VALID_SIGNAL`. The shipped baseline registry is intentionally `LIMITED_SIGNAL / BASELINE_INGESTION_REQUIRED`, so all 542 politicians fell back to the legacy V1.2 three-band age presentation. In addition, the UI itself explicitly returned the legacy `2030 / 4050 / 60+` layout whenever `pi.version` was not V2.

## Fix
- Admin Political Intelligence demographic presentation always renders the V2 scaffold:
  - 18–29 / 30–39 / 40–49 / 50–59 / 60–69 / 70+
  - MALE / FEMALE
  - AGE × GENDER 12-cell matrix
- Missing or low-confidence cells render `SIGNAL CONFIDENCE LIMITED · JCS HISTORY 정상 유지` instead of fabricated values.
- A LIMITED frozen V2 layer is now merged with V1.2 instead of being discarded.
- The trusted-baseline release gate remains unchanged: no active V2 snapshot with fabricated cohort values is written while official baseline ingestion is incomplete.
- Added cache-bust markers for the people view and app entry so the corrected UI is fetched after deployment.

## Public/current protection
No changes to public NOW serving, gateway, public snapshot/signals, repository, or Home.
