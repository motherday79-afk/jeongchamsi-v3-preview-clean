JCS POLITICAL DECISION SYSTEM V1
정참시 관리자 정치 의사결정 시스템
2026-09-01

목표
- DATA → INTELLIGENCE → ADVISORY → MANAGEMENT → CASE INTELLIGENCE 연결
- 관리자 화면에서 현재 정치 흐름, 원인, 위험, 기회, 대응, 대응 이후 변화를 한 흐름으로 판단
- 분석 근거를 의미 없는 낮은 퍼센트로 스스로 깎지 않고 질적 근거 판정으로 표기
- 관리자용 문구는 짧고 단정한 보고서 문체 유지

핵심 추가 기능
1. JCS POLITICAL WAR ROOM
   - 현재 정치 흐름
   - 주요 원인
   - 핵심 위험 / 핵심 기회
   - 우선 대응 1~3순위

2. CAUSE TRACE
   - 검색 / 뉴스 / HISTORY / 이슈 / 대중 확산 변화의 근거 기반 원인 정렬

3. ADVISORY
   - 판단 → 근거 → 대응 → 확인 기준

4. CASE INTELLIGENCE
   - 당시 판단을 CASE로 저장
   - CASE 진행 / 종료

5. ACTION LOG
   - 메시지 / 미디어 / 정책 / 현장 / 이슈 대응 / 캠페인 행동 기록

6. MANAGEMENT
   - 행동 이후 72시간 / 7일 / 14일 관측
   - 정치 흐름 / 관심 / 대중 확산 / 순위 전후 변화 판독
   - 인과관계를 과장하지 않고 '대응 이후 관측 변화'로 표기

7. 비교하기 의사결정 브리프
   - 현재 위치
   - 주요 원인
   - 가장 큰 우위
   - 가장 큰 위험
   - 최우선 대응

주요 신규 파일
- server/v3/lib/decision-intelligence-v1.js
- server/v3/lib/decision-case-store.js
- server/v3/lib/decision-outcome-v1.js
- server/v3/routes/admin/decision.js
- src/core/decision-repository.js

주요 수정 파일
- api/gateway.js
- server/v3/routes/admin/history.js
- src/core/history-repository.js
- src/views/people.js
- src/views/features.js
- src/app.js
- css/pages.css
- index.html

적용 주의
- 이 ZIP은 현재 정참시 통합/패치 구조를 기준으로 만든 적용 패키지다.
- .git 디렉터리는 포함하지 않았다.
- 기존 Redis / NOW 계산 엔진을 교체하지 않고 관리자 Decision 계층을 추가한다.
