# alpha6.0.35.1 · Navigation Stability Hotfix

현재 적용 디자인(alpha6.0.35)은 그대로 유지하고, 내부 페이지 전환과 브라우저 뒤로가기의 스크롤 흔들림만 수정한 핫픽스입니다. 자세한 변경점은 `NAV_STABILITY_HOTFIX.md`를 참고하세요.

# 정참시 v3.0.0-alpha5.2

DETAIL COMPLETE 01 · 543 NOW · MEMBER ADMIN · LAYOUT LOCK

주요 경로:
- `/now`
- `/itsme`
- `/community`
- `/poll`
- `/keywords`
- `/trending`
- `/mypage/activity`
- `/mypage/recent`
- `/admin`

Preview 계정:
- Root 관리자: `admin` / `jcv3-2026!`
- 일반회원: `user` / `jcv3-user!`

정치인 실데이터·실사진·NOW Rank 산식은 아직 연결하지 않았습니다.
v2 런타임을 사용하지 않고 543개 v3 슬롯에 추후 데이터만 연결하도록 구성했습니다.


## Hobby 배포 구조
이 버전부터 Vercel API는 `api/gateway.js` 단 하나의 Function만 사용합니다.
기존 기능별 handler는 `/server/v3/routes`의 일반 모듈이며 Serverless Function으로 계산되지 않습니다.

공개 API URL은 기존과 동일합니다.
예: `/api/v3/user/session`, `/api/v3/content`, `/api/v3/action`

`.vercelignore`는 이전 GitHub 커밋에 남아 있을 수 있는 `api/v3/**` 파일을
Vercel 배포 대상에서 제외하고 `api/gateway.js`만 포함하도록 구성되어 있습니다.


## alpha6.0.2 인증/라우팅 수정
- API 라우팅은 Vercel `rewrites` 사용.
- 로그인/회원가입/세션은 하나의 `api/gateway.js`로 연결.
- Gateway 기능 모듈은 lazy-load.
- `.vercelignore`는 오직 예전 `api/v3/**`만 제외.
- 서버 저장소 환경변수는 `JCV3_REDIS_REST_URL` + `JCV3_REDIS_REST_TOKEN` 또는 호환 Upstash/KV 이름을 사용합니다.
- 세션 secret은 `JCV3_SESSION_SECRET` 권장.


## alpha6.0.3 인증/저장소 수정
Redis 환경변수는 아래 정상 PAIR만 사용합니다.
1. `JCV3_REDIS_REST_URL` + `JCV3_REDIS_REST_TOKEN`
2. `KV_REST_API_URL` + `KV_REST_API_TOKEN`
3. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

과거 잘못 생성된 `UPSTASH_REDIS_REST_KV_REST_API_*` 변수는 코드에서 완전히 무시합니다.

배포 후 `/api/v3/health`를 열어
`{"ok":true,"storage":"ready","session":"ready"}`가 나오면
회원가입/로그인 기반이 정상입니다.


## alpha6.0.4
Vercel 번들러가 서버 route 모듈을 누락하지 않도록 동적 require를 폐기하고
모든 route를 literal require loader로 변경했습니다.
`/api/v3/health`, 로그인, 회원가입, 관리자 setup 모듈 로드 검증을 통과했습니다.


## alpha6.0.35 — BENCHMARKED PRODUCT SYSTEM
- Base: alpha6.0.30 STANDARD FULL CLEAN
- Visual research applied before redesign: AJD / Mintit / Toss / Ohouse
- New unified header, product hero and service launcher
- Core API/server/data preserved
- See BENCHMARK_SYSTEM.md and BENCHMARK_QA.md
