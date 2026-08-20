# 정참시 v3 alpha6.0 FINAL QA

## 구조 청소
- `css/app.css` SHA256: `920100f57c2ed74ed5b389b053473aa689aa2bbb8de7c23b699957a1cf69366b` — 확정 PC/Mobile/Fold 레이아웃·폰트 LOCK.
- 기능 CSS에 `!important` 0건.
- 기능 CSS에 alpha5 패치/override 블록 0건.
- `jjdd:`, `jcv2`, `public_snapshot`, `/api/rank/home` 런타임 참조 0건.
- 게시글·회원·댓글·좋아요·투표의 browser storage fallback 제거.
- localStorage는 `jcv3:guest-recent:v1` 비회원 최근 본 정치인 기능에만 사용.
- 하드코딩 Preview 관리자/회원 계정 제거.
- API/정적파일 우선 + 프론트 SPA catch-all 하나의 Vercel 라우팅 구조 확인.

## 정치인 / NOW
- 국회의원 300 Slot.
- 광역단체장 16 Slot.
- 기초단체장 227 Slot.
- 총 543 Slot.
- 경계 ID `assembly-001`, `assembly-300`, `metropolitan-016`, `basic-227` 존재 확인.
- NOW 국회의원/기초단체장 기본 50명, 50명 단위 추가 로드 구조.
- 광역단체장 16명 전체 표시.
- 543개 Slot 모두 `/person/:id` 공통 상세 구조 사용.
- 메인 NOW TOP15는 요약, `/now`는 전체 정치인 허브.

## 요청 기능
- 전체메뉴 중복 `정치인`, `회원` 서비스 카테고리 제거.
- 오른쪽 사이드바 개인기능을 상단으로 이동: 로그인 → 내 참여·배지 → 최근 본 정치인 → 키워드 → NEWS → 급상승.
- 사이드바 더보기/전체/행 클릭 hover·focus·pointer 상태 확인.
- 죽은 `더보기/전체보기` 링크 검사: 빈 `data-go`, `href="#"` 0건.
- 정치인 비교분석: 543 Slot A/B 선택 → 빈 데이터 비교 결과 레이아웃.
- 세대가 뽑은 대통령: 로그인 회원의 출생연도 기준 세대 적용, 543 Slot 중 후보 선택·투표.
- 대통령: 프로필/취임·임기/경력/선거/비전/정책/공약/국정과제/채널/정참시 데이터 레이아웃 및 관리자 입력구조.
- COLUMN 관리자 이미지 안내: 1200×675, 16:9, 최소 800×450, 2MB 이하 권장.
- 마이페이지 내가 쓴 글: 전체 / 정뮤니티 / IT’S ME / 댓글 탭.
- 회원관리: 목록·검색·member/admin 승격/회수·정상/이용정지·마지막 활성 관리자 보호.
- 시민들의 선택: 선택지 1~10개, 시작/종료 datetime 관리자 입력, 기간 검증, 회원 중복투표 방지.

## 서버 단위 통합 QA — Mock Redis
실제 API 핸들러를 Mock Redis REST와 함께 실행해 아래를 통과함.
- 첫 관리자 생성.
- 일반회원 생성.
- 관리자 회원 목록 조회.
- 일반회원 → 관리자 승격.
- 기존 회원 세션에서 승격된 관리자 권한 반영.
- 승격 회원의 관리자 API 접근 성공.
- 관리자 권한 회수.
- 회수된 세션의 관리자 API 접근 차단.
- 설문 시작/종료 시간 저장.
- IT’S ME 회원 글 작성.
- 게시물 좋아요.
- 댓글 작성.
- 세대별 대통령 투표.

## 문법/설정
- 전체 JS `node --check` 통과.
- `vercel.json` JSON 파싱 통과.
- `package.json` JSON 파싱 통과.
