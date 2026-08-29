# JCS Political Intelligence Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add an administrator-only JCS Political Intelligence console to politician detail using existing NOW/HISTORY signals plus source-attributed curated external evidence, without changing public serving paths.

**Architecture:** Add a pure versioned Political Intelligence V1 derivation module and a curated external evidence registry. Extend the existing admin HISTORY person response with the derived intelligence object, and render it only inside the existing admin branch of politician detail. Preserve the existing HISTORY panel beneath the new intelligence console.

**Tech Stack:** Node.js 22, CommonJS server modules, vanilla ES modules/browser HTML templates, CSS, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-29-jcs-political-intelligence-admin-design.md`

## Global Constraints
- No new external API runtime integration.
- No new database or environment variable.
- Public/non-admin politician detail remains unchanged apart from shared static assets/cache marker.
- `api/gateway.js`, `server/v3/routes/now-data.js`, `server/v3/lib/now-public-signals.js`, `server/v3/lib/now-public-snapshot.js`, and `src/core/repository.js` remain byte-identical.
- External facts and `JCS EST.` values stay visibly separated.

---

### Task 1: Lock contracts with failing tests
**Files:**
- Create: `tests/political-intelligence-admin-20260829.test.js`

- [x] Test exact JCS collection progress copy.
- [x] Test external evidence registry metadata and as-of filtering.
- [x] Test deterministic -50..+50 demographic/media outputs, support dynamics and confidence.
- [x] Test existing admin HISTORY route returns `politicalIntelligence` for a person request.
- [x] Test politician detail contains all approved English labels with concise Korean descriptions in the admin-only branch.
- [x] Test protected public files remain untouched.
- [x] Run the new test and verify RED for missing feature.

### Task 2: Build versioned evidence and derivation layer
**Files:**
- Create: `server/v3/data/political-intelligence-evidence.js`
- Create: `server/v3/lib/political-intelligence-v1.js`

- [x] Implement source-attributed, as-of filtered evidence lookup.
- [x] Implement deterministic headline/event classification and bounded axes.
- [x] Derive demographic movement, core attrition/inflow, support quality, media propagation, issue impacts, risk/opportunity, resilience, attention-support gap, competitor flow and confidence.
- [x] Run focused tests and verify GREEN for pure derivation behavior.

### Task 3: Extend existing admin HISTORY person response
**Files:**
- Modify: `server/v3/lib/history-v2-store.js`
- Modify: `server/v3/routes/admin/history.js`

- [x] Add a `readPoliticalIntelligenceV2(personId, personHistory)` store function using current NOW + existing HISTORY + curated evidence.
- [x] Return `politicalIntelligence` only for authenticated admin person requests.
- [x] Do not add a route or public handler.
- [x] Run focused tests and verify GREEN.

### Task 4: Render admin-only intelligence console
**Files:**
- Modify: `src/views/people.js`
- Modify: `css/pages.css`

- [x] Add centered -50..0..+50 JCS estimate axes and compact metric cards.
- [x] Add English section names with concise Korean meaning.
- [x] Display evidence basis, confidence, observed days and JCS EST. labeling.
- [x] Keep existing HISTORY Intelligence below the new console.
- [x] Ensure the console is emitted only when `isAdmin` is true.
- [x] Run focused UI tests and verify GREEN.

### Task 5: Refresh copy and cache markers
**Files:**
- Modify: `src/views/admin.js`
- Modify: `src/app.js`
- Modify: `index.html`

- [x] Replace Naver progress text with `JCS INTELLIGENT DATA COLLECTION IN PROGRESS`.
- [x] Bump only changed browser module/cache tags.
- [x] Verify no public API contract changes.

### Task 6: Regression and package verification
**Files:**
- Create: `JCS_POLITICAL_INTELLIGENCE_ADMIN_20260829.md`

- [x] Run focused Political Intelligence tests.
- [x] Run all HISTORY/storage/performance tests.
- [x] Run the full project test suite and confirm only the known four baseline failures remain.
- [x] Run JS syntax checks.
- [x] Compare protected files byte-for-byte against baseline.
- [x] Build a patch ZIP containing changed/new files only.
- [x] Apply that ZIP to a fresh reconstructed current baseline and rerun verification.
