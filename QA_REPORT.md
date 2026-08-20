# QA REPORT — v3.0.0-alpha5.1

## Layout lock
- HOME `css/app.css` SHA256 = `920100f57c2ed74ed5b389b053473aa689aa2bbb8de7c23b699957a1cf69366b`: PASS
- Final alpha3.1 layout/font CSS byte-identical: PASS
- `!important` count: 0

## Routing / pages
- HOME top service menu → independent routes (`/now`, `/column`, `/community`, etc.): PASS
- NOW Rank 1–15 preview slots rendered: 15 / 15 PASS
- NOW slot → common politician detail route: PASS
- Common detail core sections: 기본정보 / 임기·선거정보 / 경력 / 활동 / 공약·정책 / 정참시 데이터 / 최근 뉴스·이슈 / 관련 콘텐츠: PASS
- Assembly slots: 300 / 300 PASS
- Metropolitan leader slots: 16 / 16 PASS
- Basic leader slots: 227 / 227 PASS
- Assembly slot #300 → detail route: PASS

## Member flow
- Main login entry → `/login`: structurally connected PASS
- Preview member login `user / jcv3-user!`: PASS
- Browser member registration: PASS
- My page session state: PASS
- Politician favorite: PASS
- Recent politician recording: PASS
- Post like state: PASS
- Comment activity record: PASS
- Academy application state: PASS
- Server demo-user signed HttpOnly cookie issue: PASS

## Admin / board flow
- `/admin` SPA route configured: PASS
- `api/v3/admin/session.js` exists and default credential signed cookie test: PASS
- Preview admin `admin / jcv3-2026!`: PASS
- COLUMN create → repository save → public list → detail: PASS
- COLUMN cover image persistence into public detail: PASS
- COMMUNITY / NEWS shared board engine: PASS
- Global comment action + public detail render: PASS
- Poll and Academy admin engine retained: PASS

## Runtime/code checks
- All JavaScript `node --check`: PASS
- `vercel.json` JSON parse: PASS
- v2 runtime reference scan (`jjdd:`, `jcv2`, `public_snapshot`, `/api/rank/home`) in `src/api/lib`: 0
- Political real-person records: 0 intentionally
- Person provider: `UNDECIDED`
- Photo provider: `UNDECIDED`
- NOW Rank engine: `UNDECIDED`

## Notes
Automated integration tests render the real v3 view modules with browser-storage/API fallbacks and verify counts, routes, member state, admin authentication handlers, content creation, cover image persistence and comments. The accepted HOME CSS is not modified by this build.
