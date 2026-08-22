# JCV3 alpha6.0.35.2 — Route Entry / Back Restore Hotfix

## Behavior
- Forward navigation (menu, board, detail, service): always opens at page top (0,0).
- Back/forward browser navigation: restores the exact saved scroll position of that history entry.
- Smooth scrolling remains disabled; restoration is instantaneous.
- NOW Rank load-more and generic data-route/data-go navigation use the same rule.

## Files changed
- index.html (cache-busting version only)
- src/core/router.js
- src/app.js

## Design / data
- No design changes.
- No API/data/repository changes.
