# JCS AGE & GENDER INTELLIGENCE ENGINE V2 — MODEL CARD

## Release state

- Engine: `JCS_AGE_GENDER_INTELLIGENCE_V2`
- Baseline: `JCS_AGE_GENDER_BASELINE_V2`
- Validation status: **BASELINE_INGESTION_REQUIRED**
- Trusted official baseline ready: **NO**
- Explicit roster coverage: **542/542 (100%)**

## Integrity statement

The shipped source package currently contains a 542-person explicit coverage registry, but trusted official election and age×gender population source files have **not yet been ingested into the production baseline asset**. Therefore V2 demographic snapshot activation is intentionally gated and accuracy metrics are not claimed. Existing V1.2 intelligence remains the production fallback until the official-file baseline passes review.

Missing or low-confidence cohort inputs are never converted into zero, -50, or synthetic precision. They remain `SIGNAL CONFIDENCE LIMITED` while JCS HISTORY remains intact.

## Current baseline coverage

- DIRECT_CANDIDATE: 0
- PARTY_PROXY: 0
- REGIONAL_PARTY_PROXY: 0
- LIMITED: 542
- Missing roster members: 0
- Unresolved mapping rows: 0

## Offline validation metrics

- DIRECTION ACCURACY: NOT EVALUATED
- MAE: NOT EVALUATED
- CONFIDENCE CALIBRATION: NOT EVALUATED
- COVERAGE: NOT EVALUATED
- EXTREME ERROR RATE: NOT EVALUATED

These values remain NOT EVALUATED until a trusted official baseline and a time-correct holdout set are supplied locally. No accuracy figure is inferred from unit tests or synthetic fixtures.

## Activation gate

1. Ingest official election result files and official age×gender population files with the offline importer.
2. Review unresolved candidate/jurisdiction/geographic crosswalks.
3. Confirm all 542 roster members have an explicit DIRECT/PROXY/LIMITED state and no silent loss.
4. Run historical holdout backtests without future evidence leakage.
5. Review model metrics and version coefficients before setting the trusted baseline ready state.
6. Only then allow admin refresh to write immutable `jcv3:intelligence:v2:*` snapshots.
