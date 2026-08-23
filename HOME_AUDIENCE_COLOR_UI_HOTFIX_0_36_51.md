# 0.36.51 · HOME / AUDIENCE / ANALYSIS COLOR UI HOTFIX

## Scope
1. IT’S ME 1–6 cards: stronger hover/focus affordance for clickable cards.
2. Academy: moved to the final main-section position, directly after Community.
3. AUDIENCE LANDSCAPE: converted the visual position bar into an explicit -50 / -25 / 0 / +25 / +50 scale, with the current value displayed on the marker.
4. Analysis color stability: score rings and analysis bars now use explicit stable tone variables instead of relying on currentColor / translucent fills.

## Non-goals
- No scoring formula change.
- No API/data structure change.
- No navigation/routing change.
- No additional network requests.

## Verification
- New UI regression tests: 4/4 passed.
- Existing analysis/layout regression tests + new UI tests: 15/15 passed.
- `node --check src/views/home.js` passed.
- `node --check src/views/people.js` passed.
