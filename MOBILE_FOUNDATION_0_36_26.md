# alpha6.0.36.26 — MOBILE FOUNDATION

## Goal
- Desktop >=1025px remains visually unchanged.
- Phones, Fold cover/unfolded, iPhone, Galaxy/Ultra, tablet and rotation respond to available CSS viewport width.
- Main page never keeps the desktop main+310px rail at mobile widths.
- No forced 1280px desktop viewport on touch devices.
- Vertical reading/scrolling is the default; no page-level horizontal scrolling.

## Root fixes
- Added `css/mobile-foundation.css` as the final stylesheet so later desktop product CSS can no longer override earlier responsive rules.
- Removed legacy `jcv3:view-mode=desktop` viewport override and PC/mobile footer switch.
- At <=1024px the home `product-content-grid` is forced to one column and `.side-column` becomes static.
- Mobile personal area is login + the actual representative/showcase badge card before main content.
- Recent people, keywords, NEWS and rising politicians remain as auxiliary cards after the main content.

## Fluid ranges
- <=1024: collapsed vertical shell; Fold unfolded/tablet can gain internal columns where space exists.
- <=700: phone-first spacing and single-column auxiliary rail.
- <=430: compact phones/Fold cover; CTAs and dense controls reflow.
- <=320: emergency narrow mode; only components that cannot remain two-column collapse to one.

## QA invariants
- `core/user.js`, `core/repository.js`, router and auth singleton imports are unchanged.
- Navigation/back-forward scroll behavior is unchanged.
- Desktop content order and desktop styling source files are unchanged.
