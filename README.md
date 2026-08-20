# 정참시 v3.0.0-alpha5.0

## FUNCTION CORE 01 · LAYOUT LOCK · 543 PERSON SLOTS

이 패키지는 v2 코드를 복사하거나 v2 런타임 데이터에 의존하지 않는 v3 독립 구현입니다.

### 레이아웃 고정
- `css/app.css`는 최종 확정된 alpha3.1 파일을 그대로 사용합니다.
- SHA256: `920100f57c2ed74ed5b389b053473aa689aa2bbb8de7c23b699957a1cf69366b`
- PC / Mobile / Fold 메인 레이아웃과 폰트 크기를 기능 구현 때문에 변경하지 않습니다.
- 신규 내부페이지 전용 스타일은 `css/pages.css`에만 존재합니다.

### 정치인 슬롯
- 국회의원: 300개 슬롯, 모두 목록 노출 / 모두 클릭 가능
- 광역단체장: 16개 슬롯, 모두 목록 노출 / 모두 클릭 가능
- 기초단체장: 227개 슬롯, 모두 목록 노출 / 모두 클릭 가능
- 총 543개 공통 상세페이지
- 실명 / 정당 / 지역 / 사진 / 실제 정치 데이터: 0명, 의도적으로 미연결
- 인물 공급자 / 사진 공급자 / NOW Rank Engine: `UNDECIDED`

### 게시판
- COLUMN: 작성 / 수정 / 삭제 / 노출 / 대표사진 / 대표 COLUMN 설정
- 정뮤니티: 작성 / 수정 / 삭제 / 노출
- 정참시 NEWS: 작성 / 수정 / 삭제 / 노출 / 대표사진
- 관리자에서 작성한 글은 외부 목록과 상세페이지에 연결됩니다.
- COLUMN 대표사진은 브라우저에서 자동 축소·압축됩니다.

### 관리자
- URL: `/admin`
- Preview 기본 아이디: `admin`
- Preview 기본 비밀번호: `jcv3-2026!`

실제 운영 전 Vercel 환경변수로 반드시 변경하세요.
- `JCV3_ADMIN_ID`
- `JCV3_ADMIN_PASSWORD`
- `JCV3_ADMIN_SESSION_SECRET`

### 저장소
서버 저장은 v3 전용 namespace `jcv3:content:v3:*`만 사용합니다.

지원 환경변수:
- `JCV3_REDIS_REST_URL` / `JCV3_REDIS_REST_TOKEN`
- 또는 기존 Upstash REST 환경변수명

Redis가 연결되지 않은 Preview에서도 같은 브라우저에서는 localStorage fallback으로 `작성 → 외부 노출 → 상세 확인`이 가능합니다.

### 기타 구현
- 시민들의 선택: 관리자 설문 작성 / 최대 10개 선택지 / 투표
- 아카데미: 관리자 일정 작성 / 외부 일정 노출
- 통합검색: 현재 COLUMN / 정뮤니티 / NEWS 검색 동작
- 대통령 / NOW / IT’S ME / 비교분석 / 세대별 대통령 / 전국 평가제 페이지 Shell 포함

### 원칙
- v2 Redis key 사용 안 함
- v2 API 사용 안 함
- v2 정치인 snapshot 사용 안 함
- 정치인 실데이터 공급방식은 별도 협의 후 연결
