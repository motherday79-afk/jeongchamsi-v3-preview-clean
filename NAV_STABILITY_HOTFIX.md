# Navigation Stability Hotfix · alpha6.0.35.1

- Removed global smooth scrolling during route changes.
- Set browser history scroll restoration to manual.
- Each SPA history entry stores its exact scroll X/Y position.
- Internal route navigation preserves the current viewport position.
- Browser Back/Forward restores the saved viewport instantly, without animated travel.
- Route DOM swaps temporarily disable browser scroll anchoring.
- Existing design, data, APIs, views, and business logic are unchanged.
