# 0.36.35 · NAVER DATA ENGINE

## 목적
v2에서 실제 사용했던 네이버 데이터 연결을 현재 정참시 v3의 542명 ID 체계로 독립 이식한다.
구버전 저장소/런타임/파일을 호출하지 않는다.

## 이번 패치에 들어간 것
- NAVER Search Ads Keyword Tool
  - 월간 PC 검색량 `monthlyPcQcCnt`
  - 월간 모바일 검색량 `monthlyMobileQcCnt`
  - 합계 및 검색 스케일 점수
- NAVER API HUB News
  - 정치인별 최신 뉴스 최대 100건
  - 최근 6시간 / 24시간 / 7일 기사 수
  - 출처 수, 최신 기사 시각, 최근 기사 목록
- 현재 542명 roster ID와 직접 연결
- 동명이인 보호
  - 박지원 2명
  - 이용우 2명
  - 이름 단독 검색량은 개인별로 귀속하지 않음
  - 뉴스는 직위/지역 문맥을 확인
- 광역/기초단체장은 직책 결합 키워드를 우선 조회
- 다른 데이터 소스는 이번 엔진에 넣지 않음

## API
- 상태 확인: `GET /api/v3/politician-live-data?status=1`
- 개인 데이터: `GET /api/v3/politician-live-data?id=assembly-001`

## 환경변수
v2에서 쓰던 이름을 그대로 유지한다.
- `NAVER_AD_ACCESS_LICENSE`
- `NAVER_AD_SECRET_KEY`
- `NAVER_AD_CUSTOMER_ID`
- `NAVER_API_HUB_CLIENT_ID`
- `NAVER_API_HUB_CLIENT_SECRET`

현재 Vercel 프로젝트에 위 값들이 이미 있으면 추가 입력 없이 작동한다.
새 Vercel 프로젝트이고 환경변수가 없다면 값은 한 번 설정해야 한다.

## 현재 단계
이 패치는 '네이버 데이터 수집 엔진 이식' 단계다.
상세페이지 UI / NOW Rank 계산 / Redis 6시간 스냅샷 연결은 다음 단계에서 이 엔진의 결과를 소비하도록 붙이면 된다.
