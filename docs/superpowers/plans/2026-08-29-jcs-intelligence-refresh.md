# JCS Intelligence Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public external-evidence collection to the existing admin refresh and save every completed-refresh 542-person JCS Political Intelligence judgment as an immutable compressed snapshot before optional public publish.

**Architecture:** Extend the existing admin NOW route only. A draft evidence bundle is collected after NAVER batches; finalize derives all-person Political Intelligence using the refreshed rows plus existing person trend data and writes one compressed immutable snapshot. Public publish remains a separate operator action and only retries snapshot capture if needed; admin HISTORY/person reads prefer the newest frozen refresh snapshot, falling back to deterministic live derivation for legacy data.

**Tech Stack:** Node.js 22, Vercel serverless routes, Upstash Redis REST, browser ES modules, Node `zlib`, Node test runner.

**Spec:** `docs/superpowers/specs/2026-08-29-jcs-intelligence-refresh-design.md`

## Global Constraints
- No new external API key or environment variable.
- No paid search/poll API integration.
- Public NOW/detail contracts listed in the spec remain byte-identical.
- External fetch failures are non-blocking and recorded.
- `JCS EST.` and source evidence remain explicitly distinct.
- New immutable snapshots never overwrite older judgments.
- Redis command/storage amplification must stay low: one compressed intelligence snapshot per completed refresh.

---

### Task 1: External Evidence Collector

**Files:**
- Create: `server/v3/lib/external-evidence-collector.js`
- Test: `tests/political-intelligence-refresh-20260829.test.js`

**Interfaces:**
- Produces: `collectExternalEvidence({people, sourceIds, fetchImpl, now}) -> {version,collectedAt,records,sources,warnings,matchedPeople}`
- Produces parser helpers through `_internals` for deterministic tests.

- [x] Write failing parser/matching tests for Gallup and NESDC representative HTML.
- [x] Run the focused test and verify RED.
- [x] Implement bounded fetch, HTML decoding, allowlisted sources, exact-name/party matching, dedupe and non-blocking warnings.
- [x] Run focused tests and verify GREEN.

### Task 2: Immutable Political Intelligence Snapshot Store

**Files:**
- Create: `server/v3/lib/political-intelligence-store.js`
- Modify: `server/v3/data/political-intelligence-evidence.js`
- Test: `tests/political-intelligence-refresh-20260829.test.js`

**Interfaces:**
- Produces: `recordPoliticalIntelligenceSnapshotV1({current,legacyHistory,personViews,evidenceBundle})`
- Produces: `readPoliticalIntelligenceSnapshotPersonV1(draftId, personId)`
- Produces: `readLatestPoliticalIntelligenceSnapshotPersonV1(personId)`
- Evidence function accepts dynamic bundle without changing existing static evidence behavior.

- [x] Write failing tests for immutable `SET NX`, gzip round-trip, all-person derivation, dynamic evidence merge, and no retrospective evidence leakage.
- [x] Verify RED.
- [x] Implement snapshot encoding/indexing and trend-to-history derivation without per-person Redis reads.
- [x] Verify GREEN and compressed-size guard.

### Task 3: Integrate Refresh Finalize and Publish

**Files:**
- Modify: `server/v3/routes/admin/now-data.js`
- Modify: `src/views/admin.js`
- Modify: `server/v3/lib/now-temp-cleanup.js`
- Test: `tests/political-intelligence-refresh-20260829.test.js`

**Interfaces:**
- New existing-route action: `collect-external-evidence` (not a new endpoint).
- `runNowDataRefresh()` calls that action after 542 NAVER batches and before finalize.
- `finalize` loads the draft evidence, derives all 542 JCS Intelligence values, and writes the immutable refresh snapshot before the operator publishes.
- `publish` keeps public NOW behavior unchanged and retries JCS snapshot capture only if the refresh-time snapshot was not created.

- [x] Write failing route/UI/temp-cleanup contract tests.
- [x] Verify RED.
- [x] Implement the new action, progress copy, refresh-finalize snapshot hook, publish fallback, warnings, and temp cleanup.
- [x] Verify GREEN.

### Task 4: Make Admin Detail Read the Frozen Judgment

**Files:**
- Modify: `server/v3/lib/history-v2-store.js`
- Test: `tests/political-intelligence-refresh-20260829.test.js`

**Interfaces:**
- `readPoliticalIntelligenceV2(personId, personHistory)` checks the newest immutable JCS refresh snapshot first, then the current published draft snapshot, then legacy live derivation.
- Existing live calculation remains fallback only.

- [x] Write failing test for newest-snapshot-first read and legacy fallback.
- [x] Verify RED.
- [x] Implement newest-snapshot-first read with dependency injection for tests.
- [x] Verify GREEN.

### Task 5: Full Regression and Patch Packaging

**Files:**
- Create: `JCS_INTELLIGENCE_REFRESH_HISTORY_20260829.md`
- Create patch ZIP from changed files only.

- [x] Run focused Political Intelligence + HISTORY + storage + main performance suites.
- [x] Run full `npm test` and confirm only the known four baseline failures remain.
- [x] Byte-compare protected public serving contracts against the approved baseline.
- [x] Apply the exact ZIP to a fresh baseline copy and repeat focused + full verification.
- [x] Generate SHA-256 and final verification report.
