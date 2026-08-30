# JCS Admin Multi-Compare + 정보르기니 Design

## Goal
Keep the existing public 1:1 compare experience unchanged, while automatically switching admins to a richer 2–5 person Intelligence comparison and adding a reusable instant-load layer that prefetches likely next-route code and data before click.

## Architecture
`/compare` remains the single entry point. `renderCompare()` reads the current session: non-admin users render the existing two-person public compare; admins render a 2–5 person Intelligence compare. Admin comparison reads a new batched `GET /api/v3/admin/history?view=compare&personIds=...` endpoint, protected by the existing `requireAdmin()` boundary.

A browser-only `compare-data.js` module owns promise/data caches for NOW person data and batched admin compare data. A separate `instant-prefetch.js` module warms route modules and likely data on pointer hover, pointer down, focus, touch/pointer interaction, and compare-picker changes. Navigation still uses the existing router; prefetch never changes the visible route.

## Public compare
- Keep current 1:1 UI and metric sections.
- Keep `a` and `b` URL parameters for compatibility.
- Do not expose admin-only History, cohort, confidence, evidence, or strategic fields.

## Admin compare
- Same `/compare` route, automatic admin mode.
- Accept 2–5 unique politicians.
- Canonical admin URL uses repeated `p` params: `/compare?p=A&p=B&p=C`.
- Also accepts legacy `a`/`b` as initial compatibility input.
- One batched admin request returns all selected politicians' compact History + Political Intelligence.
- Show: overview/ranking cards, core Intelligence, AGE, GENDER, AGE×GENDER, History deltas, media/support/risk summary, and selected-person navigation.
- Multi-person metrics are ranked on one shared table/axis so 3–5 person comparisons remain readable; do not duplicate the 1:1 relative-axis UI five times.

## Instant-load / 정보르기니
- Warm route modules before navigation.
- Pre-resolve the target SPA view HTML into a short-lived in-memory promise cache on navigation intent, so click can reuse already prepared view output.
- Cache in-flight and completed NOW-person reads for a short TTL.
- Cache batched admin compare reads for a short TTL.
- Hover/focus/pointer-down on navigation triggers route/data warmup.
- Changing a compare picker warms that politician immediately.
- Admin compare warms the batched selection as soon as two valid IDs are known.
- Caches are session-memory only; server authorization remains authoritative.

## Security
- Public users cannot request admin compare data successfully because the server batch endpoint remains behind `requireAdmin()`.
- UI role checks are presentation only and never replace server authorization.
- Maximum batch size is five IDs and duplicates are removed.

## Compatibility
- Existing public compare query shape remains valid.
- Existing single-person admin history endpoints remain valid.
- Existing detail-page admin Intelligence hydration remains valid.
- No changes to AGE/GENDER calculation or HISTORY storage semantics.

## Verification
- Static/browser-source tests for public/admin branch, 2–5 picker handling, and prefetch hooks.
- Server-source tests for `requireAdmin`, max-five validation, dedupe, and batched read path.
- Syntax checks for every changed JS file.
- Existing focused Intelligence/HISTORY UI tests remain green where all unchanged dependencies are present.
