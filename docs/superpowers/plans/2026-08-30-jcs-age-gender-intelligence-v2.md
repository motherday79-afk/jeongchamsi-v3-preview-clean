# JCS Age & Gender Intelligence Engine V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an administrator-only, versioned six-age × gender political-intelligence engine with explicit confidence, immutable V2 snapshots, full-roster coverage states, and zero regression to public NOW/detail performance.

**Architecture:** V2 is isolated from V1.2. A pure cohort core consumes a compact local baseline asset plus existing JCS current/HISTORY/evidence signals, returns 12 age×gender cells, and derives age/gender aggregates and summaries. A separate Redis V2 snapshot store writes only during admin refresh finalize; admin detail prefers frozen V2 and falls back to V1.2 when V2 is unavailable. Official election/population source files are ingested only by offline tooling and are never fetched on page render.

**Tech Stack:** Node.js 22 CommonJS server modules, browser ES modules, Redis helper already present in `lib/v3/redis`, Node built-in `node:test`, JSON baseline assets, existing JCS admin UI/CSS.

**Spec:** `docs/superpowers/specs/2026-08-30-jcs-age-gender-intelligence-v2-design.md`

## Global Constraints

- Public Home/NOW/person detail protected paths remain byte-identical.
- Missing inputs never become `0` or `-50`.
- V1/V1.1/V1.2 snapshots remain immutable and readable.
- New Redis prefix is `jcv3:intelligence:v2` and store version is `JCS_POLITICAL_INTELLIGENCE_SNAPSHOT_V2`.
- Engine version is `JCS_AGE_GENDER_INTELLIGENCE_V2`.
- No runtime external API or browser SDK dependency is added.
- V2 is computed only at admin refresh finalize and admin detail reads a frozen V2 snapshot first.
- Every roster member must have explicit `DIRECT_CANDIDATE`, `PARTY_PROXY`, `REGIONAL_PARTY_PROXY`, or `LIMITED` baseline state.
- A V2 value below confidence threshold renders `SIGNAL CONFIDENCE LIMITED` and `JCS HISTORY 정상 유지`.
- The admin evidence UI keeps institution names abstracted; no `SOURCE DETAILS` disclosure is added.

---

### Task 1: Baseline asset contract and 542-person coverage registry

**Files:**
- Create: `server/v3/lib/age-gender-baseline-v2.js`
- Create: `server/v3/data/age-gender-baseline-v2.json`
- Create: `server/v3/data/age-gender-baseline-v2-manifest.json`
- Create: `tests/age-gender-baseline-v2.test.js`

**Interfaces:**
- Produces: `getAgeGenderBaselineV2(personId)`, `getAgeGenderBaselineManifestV2()`, `COHORT_KEYS`, `BASELINE_VERSION`.
- Baseline person record: `{personId, baselineKind, baselineQuality, populationWeights[12], cohortAffinity[12], sourceState, limitedReasons[]}`.

- [ ] **Step 1: Write failing tests** asserting fixed 12-cell order, 542 unique roster IDs, explicit baseline kind for every person, finite normalized population weights where provided, and null-safe affinity arrays.
- [ ] **Step 2: Run** `node --test tests/age-gender-baseline-v2.test.js` and verify failure because the module/assets do not exist.
- [ ] **Step 3: Implement** the baseline reader plus deterministic bootstrap registry generated from the current 542-person roster. Bootstrap records are explicitly `LIMITED` unless trusted normalized source values are present; they never invent demographic affinity.
- [ ] **Step 4: Run** the focused test and verify pass.
- [ ] **Step 5: Save a source-package checkpoint** by hashing the three created baseline files into the manifest; this source package has no `.git` metadata, so no commit command is executed.

### Task 2: Offline official-file importer and crosswalk contract

**Files:**
- Create: `server/v3/tools/build-age-gender-baseline-v2.js`
- Create: `server/v3/data/age-gender-crosswalk-v2.json`
- Create: `tests/age-gender-baseline-import-v2.test.js`

**Interfaces:**
- Consumes: local election CSV/XLSX-normalized CSV paths and local population CSV path supplied on command line; no network fetch.
- Produces: normalized baseline/manifest JSON with unresolved mappings listed explicitly.
- Export testable helpers: `parseCsv`, `aggregatePopulationRow`, `resolveRosterPerson`, `buildManifest`.

- [ ] **Step 1: Write failing importer tests** with small Korean CSV fixtures covering election rows, 1-year/5-year age aggregation, male/female cells, exact candidate/jurisdiction match, curated override, and unresolved output.
- [ ] **Step 2: Run** `node --test tests/age-gender-baseline-import-v2.test.js` and verify failure.
- [ ] **Step 3: Implement** dependency-free CSV parsing, deterministic cohort aggregation, roster/crosswalk matching, SHA-256 source hashing, and manifest coverage counters. The tool refuses ambiguous mappings instead of guessing.
- [ ] **Step 4: Run** focused importer tests and verify pass.
- [ ] **Step 5: Run** the importer in `--registry-only` mode to refresh the shipped 542-person explicit coverage asset without fabricating official source values.

### Task 3: Pure 12-cell cohort movement engine

**Files:**
- Create: `server/v3/lib/age-gender-cohort-core.js`
- Create: `server/v3/lib/political-intelligence-v2.js`
- Create: `tests/political-intelligence-age-gender-v2.test.js`

**Interfaces:**
- `deriveAgeGenderCohortsV2({person, baseline, view, history, evidence, previous}) -> {cells, age, gender, summary, validity, components}`.
- `derivePoliticalIntelligenceV2({v1, view, history, evidence, baseline, previousV2, asOf}) -> V2 intelligence object`.

- [ ] **Step 1: Write failing tests** for null preservation, confidence gating, deterministic output, 12-cell order, confidence-weighted age/gender renormalization, ordinary ±5 movement cap, aligned-signal ±10 cap, anchor ±15 cap, event-fingerprint deduplication, and proxy-vs-direct confidence difference.
- [ ] **Step 2: Run** the focused V2 model test and verify failure.
- [ ] **Step 3: Implement** fixed versioned coefficients, conservative issue×cohort priors, previous-state smoothing, component decomposition, and summary derivation. Baseline `LIMITED` can contribute identity/coverage metadata but cannot by itself create a valid demographic number.
- [ ] **Step 4: Run** focused tests and verify pass.
- [ ] **Step 5: Add** a compatibility wrapper that carries existing V1.2 diagnosis/media/risk/strategic solution while replacing demographic output only when V2 cohort validity is justified.

### Task 4: Immutable V2 snapshot store with storage budget gate

**Files:**
- Create: `server/v3/lib/political-intelligence-v2-store.js`
- Create: `tests/political-intelligence-v2-store-20260830.test.js`

**Interfaces:**
- Produces: `recordPoliticalIntelligenceSnapshotV2`, `readPoliticalIntelligenceSnapshotV2`, `readPoliticalIntelligenceSnapshotPersonV2`, `readLatestPoliticalIntelligenceSnapshotPersonV2`.
- Compact snapshot uses fixed cohort arrays and `jcv3:intelligence:v2:*` keys.

- [ ] **Step 1: Write failing tests** for prefix isolation, encode/decode, NX immutability, 542-person synthetic snapshot round-trip, warm-runtime latest snapshot caching, and compressed budget with >=20% headroom.
- [ ] **Step 2: Run** the focused store test and verify failure.
- [ ] **Step 3: Implement** gzip snapshot encoding, fixed-order compact cohort arrays, source-fingerprint references, immutable index, and a hard compressed-size gate.
- [ ] **Step 4: Run** focused tests and verify pass.
- [ ] **Step 5: Record** actual synthetic compressed-size result in the internal model card.

### Task 5: Refresh-finalize V2 derivation without public-path changes

**Files:**
- Modify: `server/v3/routes/admin/now-data.js`
- Create: `tests/political-intelligence-v2-refresh-20260830.test.js`

**Interfaces:**
- Consumes: existing preview/finalize current snapshot, trended person views, HISTORY context, external evidence bundle, local V2 baseline.
- Produces: `ageGenderV2Snapshot` metadata in admin refresh status only.

- [ ] **Step 1: Write failing refresh tests** asserting V1 snapshot still writes, V2 write is attempted after current/HISTORY/evidence preparation, external collection remains fail-open, and public publish remains manually controlled.
- [ ] **Step 2: Run** focused refresh tests and verify failure.
- [ ] **Step 3: Add** V2 snapshot recording to finalize/publish admin-only paths without touching public NOW route/files.
- [ ] **Step 4: Run** focused refresh tests and verify pass.
- [ ] **Step 5: Verify** V2 failure is reported in admin metadata but does not destroy the existing NOW preview/current data.

### Task 6: Admin HISTORY reader V2 preference with V1.2 fallback

**Files:**
- Modify: `server/v3/lib/history-v2-store.js`
- Modify: `server/v3/routes/admin/history.js` only if response shape needs explicit model metadata.
- Create: `tests/political-intelligence-v2-history-reader-20260830.test.js`

**Interfaces:**
- Admin result exposes `politicalIntelligence` whose version is V2 when a compatible frozen V2 person exists, otherwise compatible V1.2.

- [ ] **Step 1: Write failing tests** proving V2 frozen snapshot wins, no large `nowDataCurrent` read occurs when V2 exists, V1.2 fallback still works, and one-person detail does not build 542-person overview.
- [ ] **Step 2: Run** focused reader tests and verify failure.
- [ ] **Step 3: Implement** V2-first compatibility read while preserving existing async admin-detail path.
- [ ] **Step 4: Run** focused tests and verify pass.
- [ ] **Step 5: Re-run** `tests/political-intelligence-validity-performance-20260830.test.js` to prove the prior speed fix remains intact.

### Task 7: Administrator six-age, gender, and 6×2 matrix UI

**Files:**
- Modify: `src/views/people.js`
- Modify: `css/pages.css`
- Create: `tests/political-intelligence-v2-admin-ui-20260830.test.js`

**Interfaces:**
- V2 UI consumes `pi.cohorts.age`, `pi.cohorts.gender`, `pi.cohorts.cells`, `pi.cohorts.summary`, and per-cell confidence/evidence metadata.
- V1.2 fallback keeps legacy demographic display and never projects legacy 2030/4050/60+ into fake V2 cells.

- [ ] **Step 1: Write failing UI tests** for six age rows, MALE/FEMALE block, six-row×two-column matrix, five summary cards, `SUPPORT MOMENTUM · JCS EST.`, limited-signal copy, admin-only visibility, and absence of source-institution disclosure.
- [ ] **Step 2: Run** focused UI tests and verify failure.
- [ ] **Step 3: Implement** V2 rendering helpers and responsive matrix CSS; do not add new startup network requests or SDKs.
- [ ] **Step 4: Run** focused UI tests and verify pass.
- [ ] **Step 5: Re-run** the async-first-paint performance test.

### Task 8: Backtest/model-card/coverage artifacts and release gate

**Files:**
- Create: `server/v3/tools/backtest-age-gender-v2.js`
- Create: `docs/JCS_AGE_GENDER_INTELLIGENCE_V2_MODEL_CARD.md`
- Create: `docs/JCS_AGE_GENDER_INTELLIGENCE_V2_COVERAGE.json`
- Create: `tests/political-intelligence-v2-release-gate-20260830.test.js`

**Interfaces:**
- Backtest tool reads local historical fixture/anchor files only; it emits direction accuracy, MAE, confidence calibration, coverage, and extreme-error rate when holdout data is present.
- Release gate always emits roster coverage; it marks model-card validation status `BASELINE_INGESTION_REQUIRED` when trusted official baseline data is not present rather than claiming accuracy metrics that were not measured.

- [ ] **Step 1: Write failing release-gate tests** for 542 coverage, no silent person loss, explicit unresolved list, honest validation status, and no fabricated metric values when holdout datasets are absent.
- [ ] **Step 2: Run** focused release-gate tests and verify failure.
- [ ] **Step 3: Implement** local-only backtest harness, coverage artifact generator, and model-card generation.
- [ ] **Step 4: Run** the tools on the shipped source package and verify all 542 people have explicit baseline state.
- [ ] **Step 5: Run** focused tests and verify pass.

### Task 9: Full regression, protected-file audit, and patch packaging

**Files:**
- Create: `JCS_AGE_GENDER_INTELLIGENCE_V2_20260830.md`
- Package changed/created files only into a ZIP patch.

**Interfaces:**
- Produces a deployable patch against the current signal-confidence/content-share baseline.

- [ ] **Step 1: Run** all new V2-focused tests plus existing political-intelligence/history/performance tests.
- [ ] **Step 2: Run** `npm test` and record total/pass/fail with exact known-baseline failures.
- [ ] **Step 3: SHA-256 compare** `api/gateway.js`, `server/v3/routes/now-data.js`, `server/v3/lib/now-public-signals.js`, `server/v3/lib/now-public-snapshot.js`, `src/core/repository.js`, and `src/views/home.js` against the pre-V2 baseline; all must be byte-identical.
- [ ] **Step 4: Build** a changed-files-only ZIP, apply it to a fresh copy of the pre-V2 baseline, and repeat focused + full regression tests.
- [ ] **Step 5: Generate** SHA-256 and final verification report. Do not claim official-baseline validation metrics unless official source files and holdout data were actually ingested.
