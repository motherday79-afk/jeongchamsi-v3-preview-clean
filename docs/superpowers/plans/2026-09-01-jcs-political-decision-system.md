# JCS Political Decision System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only political decision system that turns existing JCS Political Intelligence + HISTORY into cause trace, risks/opportunities, priority actions, action logs, measured post-action changes, and long-term case intelligence.

**Architecture:** Preserve HISTORY V2 and Political Intelligence snapshots as the source of truth. Add deterministic decision derivation on read, compact case/action persistence only for managed politicians, server-derived baselines, read-time outcome evaluation, and an admin-only WAR ROOM that sits above the existing detailed intelligence report. NOW publish remains independent from the decision system.

**Tech Stack:** Vanilla browser ES modules, Node.js CommonJS Vercel routes, Redis command wrapper, node:test/assert contract tests, existing JCS HISTORY V2 and Political Intelligence V1.

**Spec:** `docs/superpowers/specs/2026-09-01-jcs-political-decision-system-design.md`

## Global Constraints

- Executive UI must not expose numeric `분석 신뢰도 N%` or `CONF N%`; use `분석 근거 강함 / 충분 / 보강 중` and cohort `유효 신호 / 보강 중 / 판독 대기`.
- Copy stays concise, professional, and decisive; no explanatory filler such as “확인할 수 있습니다”.
- Facts, JCS analysis, and strategy recommendations must remain distinguishable.
- Never claim a single action caused a metric change; say `대응 이후 ... 변화`.
- Decision storage must not duplicate 542-person bulk snapshots.
- Decision failures must never block NOW finalize/publish.
- WAR ROOM body text >=14px, support text >=13px, status labels >=12px, key metrics >=22px.
- Position Map structure already approved on 2026-08-31 must remain intact.

---

### Task 1: Decision Intelligence Engine

**Files:**
- Create: `server/v3/lib/decision-intelligence-v1.js`
- Test: `tests/decision-intelligence-v1-20260901.test.js`

**Interfaces:**
- Consumes: `{ politicalIntelligence, history, currentRow, competitorRows, rangeDays, asOf }`
- Produces: `deriveDecisionIntelligenceV1(input)` returning `{version,evidenceState,currentState,causeTrace,risks,opportunities,priorities}`.

- [ ] Write tests that verify evidence labels, cause ordering, max 3 priorities, and required priority fields.
- [ ] Run `node --test tests/decision-intelligence-v1-20260901.test.js` and confirm RED.
- [ ] Implement deterministic helpers: `deriveEvidenceState`, `deriveCauseTrace`, `deriveRisks`, `deriveOpportunities`, `derivePriorities`, `deriveDecisionIntelligenceV1`.
- [ ] Run the unit test and confirm GREEN.
- [ ] Commit `feat: add decision intelligence engine`.

### Task 2: Case and Action Store

**Files:**
- Create: `server/v3/lib/decision-case-store.js`
- Test: `tests/decision-case-store-20260901.test.js`

**Interfaces:**
- Consumes Redis-compatible `{command,pipeline}` overrides and server-derived snapshot/baseline objects.
- Produces `createDecisionCaseStore(overrides)` with `createCase`, `closeCase`, `listCases`, `addAction`, `updateActionNote`, `listActions`.

- [ ] Write tests for compact case references, server-derived action baseline, ordering, duplicate rejection, and rollback-safe index writes.
- [ ] Run test and confirm RED.
- [ ] Implement append-only compact persistence under `jcv3:decision:v1:*` keys.
- [ ] Run test and confirm GREEN.
- [ ] Commit `feat: add decision case and action store`.

### Task 3: Outcome Evaluator and Pattern Summary

**Files:**
- Create: `server/v3/lib/decision-outcome-v1.js`
- Test: `tests/decision-outcome-v1-20260901.test.js`

**Interfaces:**
- Consumes `{ action, observations, evaluatedAt }`.
- Produces `evaluateDecisionOutcomeV1()` and `deriveCasePatternsV1()`.

- [ ] Write tests that baseline-before rows are ignored, no follow-up => WAITING, measured deltas are correct, and patterns need >=3 comparable cases.
- [ ] Run test and confirm RED.
- [ ] Implement 72h/7d/14d-aware outcome selection plus cautious headline text.
- [ ] Run test and confirm GREEN.
- [ ] Commit `feat: measure decision outcomes`.

### Task 4: Admin Decision API

**Files:**
- Create: `server/v3/routes/admin/decision.js`
- Modify: `api/gateway.js`
- Test: `tests/decision-admin-route-20260901.test.js`

**Interfaces:**
- GET `/api/v3/admin/decision?personId=<id>&range=30`
- POST actions: `case-create`, `case-close`, `action-add`, `action-note-update`.

- [ ] Write route/security tests for admin requirement, server-derived metrics/baseline, unknown action 400, and public inaccessibility.
- [ ] Run test and confirm RED.
- [ ] Implement the route using `readPersonHistoryV2`, `readPoliticalIntelligenceV2`, current NOW data, the decision engine, store, and outcome evaluator.
- [ ] Add literal `admin/decision` loader to the gateway.
- [ ] Run test and confirm GREEN.
- [ ] Commit `feat: add admin decision api`.

### Task 5: Client Repository and Admin Event Wiring

**Files:**
- Create: `src/core/decision-repository.js`
- Modify: `src/app.js`
- Test: `tests/decision-client-contract-20260901.test.js`

**Interfaces:**
- `getAdminDecisionPerson(id,range)`
- `createAdminDecisionCase(id,note)`
- `closeAdminDecisionCase(caseId)`
- `addAdminDecisionAction(payload)`
- `updateAdminDecisionActionNote(actionId,note)`

- [ ] Write client contract tests for endpoint path, methods, credentials, and action data attributes.
- [ ] Run test and confirm RED.
- [ ] Implement repository and delegated form/button handling; successful writes rerender/reload the admin intelligence slot rather than public content.
- [ ] Run test and confirm GREEN.
- [ ] Commit `feat: wire decision admin actions`.

### Task 6: Political WAR ROOM

**Files:**
- Modify: `src/views/people.js`
- Modify: `css/pages.css`
- Test: `tests/decision-war-room-ui-20260901.test.js`

**Interfaces:**
- Admin detail loader fetches HISTORY and Decision in parallel.
- Existing detailed intelligence remains below WAR ROOM.

- [ ] Write UI tests for WAR ROOM, Cause Trace, risk/opportunity, priorities, Action Log, outcomes, CASE HISTORY, evidence labels, and typography floors.
- [ ] Run test and confirm RED.
- [ ] Add `adminPoliticalWarRoom()` and focused render helpers.
- [ ] Replace executive numeric confidence display with evidence-state labels; replace cohort percent confidence labels with status labels.
- [ ] Keep existing deep report under WAR ROOM.
- [ ] Run UI test and existing readability/clarity tests; confirm GREEN.
- [ ] Commit `feat: add political war room`.

### Task 7: Comparative Decision Brief

**Files:**
- Modify: `src/views/features.js`
- Test: `tests/decision-compare-ui-20260901.test.js`

**Interfaces:**
- Admin compare fetches Decision data for selected 2–5 politicians and merges it with the existing fast compare response.

- [ ] Write test requiring `COMPARATIVE DECISION BRIEF`, competitive cause trace, per-person current position / biggest advantage / biggest risk / top priority, and unchanged Position Map markers.
- [ ] Run test and confirm RED.
- [ ] Implement compare decision fetch and rendering below executive summary, above deeper comparison blocks.
- [ ] Preserve existing Position Map implementation and coordinates.
- [ ] Run test and existing compare/readability tests; confirm GREEN.
- [ ] Commit `feat: add comparative decision brief`.

### Task 8: Full Verification and Patch Packaging

**Files:**
- Create: `JCS_POLITICAL_DECISION_SYSTEM_VERIFICATION_20260901.txt`
- Create final patch ZIP outside the repo.

- [ ] Run all new decision tests.
- [ ] Run approved clarity/readability/premium tests.
- [ ] Run syntax checks on all changed JS files.
- [ ] Scan UI for forbidden executive numeric confidence strings and CSS below typography floors in new components.
- [ ] Run any available baseline regression suite and record pre-existing failures separately from new failures.
- [ ] Verify `unzip -t` on final ZIP.
- [ ] Commit verification record.
