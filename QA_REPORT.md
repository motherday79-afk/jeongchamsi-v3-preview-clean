# 정참시 v3 alpha6.0.2 QA REPORT

## 이번 수정
- Vercel 저수준 routes 기반 API 라우팅 폐기.
- 공식 higher-level rewrites 구조로 교체.
- `/api/v3/:path*` → `/api/gateway?path=:path*`.
- SPA `/login`, `/join`, `/mypage`, `/admin` 등은 catch-all → `/index.html`.
- `.vercelignore`는 옛 `api/v3/**`만 제외하며 `api/gateway.js`는 절대 제외하지 않음.
- Gateway는 lazy module loading. 업로드 의존성 문제가 인증 API를 같이 죽이지 않음.

## 인증 통합 테스트
Mock Redis REST를 사용해 실제 Gateway/Users/Auth 코드를 호출:
- 회원가입 POST `/api/v3/user/register` → 201 PASS
- 회원가입 즉시 session cookie 발급 → PASS
- GET `/api/v3/user/session` → authenticated true PASS
- DELETE session → PASS
- 기존 계정 POST login → 200 PASS
- 없는 API → 404 `API_ROUTE_NOT_FOUND` PASS

## 배포 구조
- Vercel Serverless Function: 1개 (`api/gateway.js`)
- Hobby 12개 제한 아래.
- `api/v3/**` 옛 파일은 배포 제외.

## Layout Lock
- app.css SHA256: `920100f57c2ed74ed5b389b053473aa689aa2bbb8de7c23b699957a1cf69366b`
- PC / Mobile / Fold 메인 레이아웃과 폰트 변경 없음.

## 주의
회원/게시글 서버 Source of Truth 원칙 때문에 Redis REST 환경변수가 없으면 회원가입/로그인은 정상적으로 저장될 수 없습니다. 이 경우 UI에 저장소 미연결 메시지가 표시됩니다. localStorage 회원 fallback은 사용하지 않습니다.
