# alpha6.0.36.24 — Badge Showcase + Hero Admin + NOW Append

- NOW Rank `50명 더 불러오기` no longer routes or rerenders. It appends only new politician cards in-place and replaces the current history URL without moving scroll.
- Sidebar `내 참여 · 배지` is now exactly four badge slots: representative badge + three user-curated showcase badges. Empty slots remain empty until selected.
- My Page badge collection can select/unselect up to three sidebar showcase badges. The representative badge cannot be duplicated in showcase. Admin users can select from the full badge catalog.
- Brand data adds `hero.productHeadline`; the current product hero reads this field. Admin `메인 타이틀` panel now exposes the actual first-screen hero copy prominently.
- Hero PARTNERS copy removes the trailing period.
- Authentication singleton imports remain unversioned.
