# 정참시 v3.0.0-alpha4.0 — FUNCTION FOUNDATION 01 · LAYOUT LOCK

## 절대 원칙
- v2 코드/API/Redis key/사진 파이프라인을 사용하지 않습니다.
- 확정된 PC/모바일/Fold 메인 레이아웃과 폰트는 `css/app.css` alpha3.1을 그대로 유지합니다.
- 새로운 내부 페이지 스타일은 `css/pages.css`에만 존재합니다.
- 정치인 실제 데이터는 0명입니다. `src/data/person-provider.js`가 유일한 공급자 경계이며 현재 `UNDECIDED`입니다.

## 이번 구현
- 국회의원 최대 300명 목록 Shell `/assembly`
- 지방자치단체장 최대 300명 목록 Shell `/local-leaders`
- 공통 인물 상세 Shell `/person/:id`
- NOW Rank / 대통령 페이지 Shell (실데이터 미연결)
- COLUMN / 정뮤니티 / NEWS 목록·상세
- 시민들의 선택 / IT'S ME / 비교분석 / 세대별 대통령 / 전국평가제 / 아카데미 페이지
- 관리자 `/admin`
  - 인물관리: 공급방식 확정 전 잠금
  - COLUMN / COMMUNITY / NEWS / 설문 / 아카데미 입력 UI
  - 버전 표시
- v3 전용 content API `/api/v3/content`
- Redis namespace는 오직 `jcv3:content:v1:*`

## 관리자 저장
서버 저장을 쓰려면 Vercel 환경변수에 `JCV3_ADMIN_TOKEN`을 추가합니다.
Redis는 `JCV3_REDIS_REST_URL`, `JCV3_REDIS_REST_TOKEN`을 권장합니다. 기존 Upstash 연결 환경변수가 이미 있다면 인프라 연결에만 fallback 사용하며, 저장 key는 v3 namespace만 사용합니다.
환경변수가 없으면 관리자 UI는 브라우저 LocalStorage 미리보기 모드로 동작합니다.

## 아직 의도적으로 하지 않은 것
- 정치인 실데이터 수집/정규화
- 정치인 실사진
- NOW Rank 계산 엔진
- 투표 중복방지/회원 인증 정책이 필요한 실제 투표 write

이 세 영역은 협의 후 v3 전용 구조로 연결합니다.
