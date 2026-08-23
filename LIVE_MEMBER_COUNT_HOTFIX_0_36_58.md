# 0.36.58 · LIVE MEMBER COUNT ROUTE HOTFIX

## Symptom
- Home displayed the real member count (for example 6).
- SPA navigation to other menus displayed `0명이 정참시와 함께합니다`.

## Root cause
- Non-home pages render `pageShell()` which calls `siteHeader()` without a preloaded member count.
- `siteHeader()` converted the missing `null` value with `Number(null)`, which becomes `0`.
- Because the livebar DOM then contained `data-member-count="0"`, the existing hydration logic believed the count was already known and skipped `/api/v3/livebar`.

## Fix
- Missing member count now stays unresolved (`…` / empty data attribute) until hydration.
- Existing `hydrateLiveCommunityBar()` then fetches `/api/v3/livebar` and replaces it with the real member count.
- Home behavior is unchanged: when the home snapshot already contains the real member count it is rendered immediately.

## Scope
- Hotfix only. No layout redesign, badge logic, celebration logic, or API behavior changes.

## Verification
- Added regression coverage for non-home unresolved count and home preloaded count.
- Full test suite: 94/94 passed.
- Syntax checks passed for touched/runtime entry modules.
