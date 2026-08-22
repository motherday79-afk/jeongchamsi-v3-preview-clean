# alpha6.0.36.6 — HOME ORDER ROOT FIX

- Removed the legacy CSS `order` override from `css/product-system.css`.
- Home section order is now controlled only by the DOM order emitted by `src/views/home.js`.
- Desired DOM order:
  1. IT'S ME
  2. 시민들의 선택
  3. 세대가 뽑은 대통령
  4. 국회의원 전국 평가제
  5. 정치인 비교분석
  6. 아카데미
  7. NOW Rank
  8. COLUMN
  9. COMMUNITY
- Bumped `product-system.css`, `app.js`, and `home.js` cache keys so an old CSS bundle cannot keep forcing the previous order.
- No layout dimensions, route behavior, data logic, or navigation restoration logic changed.
