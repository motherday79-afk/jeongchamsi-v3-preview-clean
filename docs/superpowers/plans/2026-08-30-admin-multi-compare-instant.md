# JCS Admin Multi-Compare + 정보르기니 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build role-aware `/compare`, admin 2–5 person Intelligence comparison, and reusable pre-click route/data prefetching.

**Architecture:** Preserve the public 1:1 route while branching inside `renderCompare()` by session role. Add a protected batched admin HISTORY/Political Intelligence read and a browser cache/prefetch layer used by compare and global route interactions.

**Tech Stack:** Vanilla ES modules, Node/Vercel route handlers, node:test, existing JCS repositories and router.

**Spec:** `docs/superpowers/specs/2026-08-30-admin-multi-compare-instant-design.md`

## Global Constraints
- Public compare remains 1:1 and backward compatible with `a`/`b`.
- Admin compare accepts 2–5 unique politicians and uses admin-only server data.
- Admin data remains protected by `requireAdmin()`.
- Prefetch is opportunistic and must never block navigation.
- No AGE/GENDER calculation changes.

---

### Task 1: Batched admin compare reader
**Files:**
- Modify: `server/v3/routes/admin/history.js`
- Modify: `src/core/history-repository.js`
- Test: `tests/admin-multi-compare-instant-20260830.test.js`

- [ ] Write failing assertions for `view=compare`, `personIds`, max-five validation, dedupe, and repository export.
- [ ] Run focused test and confirm RED.
- [ ] Implement server batch read and browser repository function.
- [ ] Run focused test and confirm GREEN.

### Task 2: Role-aware 2–5 person compare UI
**Files:**
- Modify: `src/views/features.js`
- Modify: `src/app.js`
- Modify: `css/pages.css`
- Test: `tests/admin-multi-compare-instant-20260830.test.js`

- [ ] Add failing assertions for admin branch, repeated `p` params, 2–5 picker markup, and admin Intelligence sections.
- [ ] Run focused test and confirm RED.
- [ ] Implement admin renderer while preserving public renderer.
- [ ] Implement admin compare form submission with 2–5 unique IDs.
- [ ] Add responsive multi-person styles.
- [ ] Run focused test and confirm GREEN.

### Task 3: 정보르기니 prefetch/cache layer
**Files:**
- Create: `src/core/compare-data.js`
- Create: `src/core/instant-prefetch.js`
- Modify: `src/views/features.js`
- Modify: `src/app.js`
- Modify: `index.html`
- Test: `tests/admin-multi-compare-instant-20260830.test.js`

- [ ] Add failing assertions for promise cache, route warmup, pointer/focus prefetch, and picker warmup.
- [ ] Run focused test and confirm RED.
- [ ] Implement short-TTL in-memory caches and route/data warmup.
- [ ] Wire prefetch listeners without blocking click navigation.
- [ ] Bump cache-bust marker.
- [ ] Run focused test and confirm GREEN.

### Task 4: Verification and packaging
**Files:**
- Create: `JCV3_ADMIN_MULTI_COMPARE_INFOREGHINI_FINAL_VERIFICATION_20260830.txt`
- Create patch ZIP with changed files only.

- [ ] Run `node --check` for all changed JS files.
- [ ] Run focused tests.
- [ ] Run available related static Intelligence/HISTORY UI tests.
- [ ] Record exact results and limitations.
- [ ] Package changed files, spec, plan, and verification report.
