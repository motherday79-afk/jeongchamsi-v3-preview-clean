# 정참시 v3.0.0-alpha5.1

## INTEGRATED ROUTES · USER · ADMIN · 543 PERSON · LAYOUT LOCK

이 패키지는 v2 코드를 복사하거나 v2 런타임 데이터에 의존하지 않는 v3 독립 구현입니다.

## 1. 메인 레이아웃 / 폰트 LOCK
- `css/app.css`는 확정된 alpha3.1 파일을 그대로 사용합니다.
- SHA256: `920100f57c2ed74ed5b389b053473aa689aa2bbb8de7c23b699957a1cf69366b`
- PC / Mobile / Fold 메인 레이아웃과 폰트 크기는 기능 구현 때문에 변경하지 않습니다.
- 신규 내부페이지 / 회원 / 관리자 스타일은 `css/pages.css`에서만 관리합니다.

## 2. 상단 메뉴
상단 서비스 메뉴는 더 이상 HOME의 `#section`으로 이동하지 않습니다.
각 메뉴가 독립 페이지로 이동합니다.
- 대통령 `/president`
- NOW Rank `/now`
- IT’S ME `/itsme`
- COLUMN `/column`
- 시민들의 선택 `/poll`
- 정뮤니티 `/community`
- 비교분석 `/compare`
- 세대별 대통령 `/generation-president`
- 전국 평가제 `/national-evaluation`
- 아카데미 `/academy`

## 3. 정치인 슬롯 / 상세페이지
실제 정치인 데이터 공급방식은 아직 연결하지 않습니다.
- 국회의원 `/assembly`: 300개 슬롯 전부 표시 / 전부 클릭 가능
- 광역단체장 `/local-leaders/metropolitan`: 16개 슬롯 전부 표시 / 전부 클릭 가능
- 기초단체장 `/local-leaders/basic`: 227개 슬롯 전부 표시 / 전부 클릭 가능
- 디렉터리 정치인 총 543명
- 공통 상세 레이아웃: 기본정보 / 임기·선거정보 / 경력 / 의정·행정·정치 활동 / 공약·정책 / 정참시 데이터 / 최근 뉴스·이슈 / 관련 콘텐츠
- 실명 / 정당 / 지역 / 사진 / 실제 정치 데이터: 0명, 의도적으로 미연결

NOW Rank는 실제 순위 엔진 연결 전에도 UI 검수를 할 수 있도록 1–15위 빈 검수 슬롯이 모두 클릭됩니다.
- `/now` → 15개 슬롯
- `/person/now-001` ~ `/person/now-015` → 공통 정치인 상세 Shell
- 추후 v3 Rank Engine 발행 결과의 실제 정치인 ID로 연결만 교체합니다.

## 4. 일반회원
메인 PC 우측 로그인 카드와 모바일 로그인 카드에서 `/login`으로 진입합니다.

Preview 일반회원:
- ID: `user`
- PW: `jcv3-user!`

회원가입 `/join`도 동작합니다. 브라우저 Preview에서는 가입정보가 해당 브라우저에 저장됩니다.

로그인 후 현재 확인 가능한 활동:
- 정치인 즐겨찾기
- 최근 본 정치인 기록
- 게시물 좋아요
- 게시물 댓글
- 설문 참여
- 아카데미 수강신청 기록
- 마이페이지 `/mypage`

서버 환경에서는 Preview 일반회원 로그인에 signed HttpOnly session cookie를 사용하며, 서버 연결이 없는 Preview에서는 브라우저 세션으로 자동 전환합니다.

## 5. 게시판
### COLUMN
- 관리자 새 글 / 수정 / 삭제 / 공개·비공개
- 대표사진 업로드 / 브라우저 자동 축소·압축
- 메인 대표 COLUMN 설정
- 외부 목록 `/column`
- 상세 `/column/:id`
- 좋아요 / 댓글

### 정뮤니티
- 관리자 새 글 / 수정 / 삭제 / 공개·비공개
- 외부 목록 `/community`
- 상세 `/community/:id`
- 좋아요 / 댓글

### 정참시 NEWS
- 관리자 새 글 / 수정 / 삭제 / 공개·비공개
- 대표사진 업로드
- 외부 목록 `/news`
- 상세 `/news/:id`
- 좋아요 / 댓글

관리자가 작성한 게시물은 외부 목록·상세와 HOME 콘텐츠에 같은 데이터로 연결됩니다.

## 6. 관리자
- URL: `/admin`
- Preview ID: `admin`
- Preview PW: `jcv3-2026!`

`api/v3/admin/session.js`가 포함되어 있어 배포환경에서 관리자 세션 API가 실제로 존재합니다.

운영 전 변경 권장 환경변수:
- `JCV3_ADMIN_ID`
- `JCV3_ADMIN_PASSWORD`
- `JCV3_ADMIN_SESSION_SECRET`

## 7. 저장소
서버 콘텐츠 저장 namespace:
- `jcv3:content:v3:*`

지원 환경변수:
- `JCV3_REDIS_REST_URL`
- `JCV3_REDIS_REST_TOKEN`
- 또는 Upstash REST 호환 환경변수

Redis 미연결 Preview에서는 같은 브라우저의 localStorage fallback으로 관리자 작성 → 외부 목록 → 상세 확인까지 가능합니다.

## 8. 기타
- 시민들의 선택: 관리자 설문 작성 / 최대 10개 선택지 / 투표
- 아카데미: 관리자 일정 작성 / 일반회원 신청
- 통합검색: COLUMN / 정뮤니티 / NEWS 검색
- 대통령 / IT’S ME / 비교분석 / 세대별 대통령 / 전국 평가제 독립 페이지 연결

## 9. v3 원칙
- v2 Redis key 사용 안 함
- v2 API 사용 안 함
- v2 정치인 snapshot 사용 안 함
- 정치인 실데이터 / 사진 / NOW Rank 산식은 별도 협의 후 v3 데이터 공급자에 연결
