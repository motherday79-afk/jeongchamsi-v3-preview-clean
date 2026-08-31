JCV3 / JCS · DETAIL + COMPARE + ADMIN FREEDOM REBUILD
2026-09-01

목표
- 비로그인/일반회원 정치인 상세페이지를 '정치 브리핑' 화면으로 재구성
- 관리자 상세페이지를 하나의 상시 오픈 JCS COMMAND CENTER로 통합
- 비교분석(2인 및 관리자 2~5인)을 시각적 의사결정 화면으로 재구성
- 데이터 공백을 0/-50/분석대기로 숨기지 않고 JCS 다중신호 보정으로 정치인별 값을 생성
- NOW 게시 실패의 10MB Upstash MGET 문제를 구조적으로 차단

1) PUBLIC / GENERAL DETAIL
- PUBLIC POLITICAL PROFILE + POLITICAL PULSE 중심으로 첫 화면 정보 우선순위 재배치
- 6대 핵심 분석지표를 반복 원형 게이지 대신 INTELLIGENCE PROFILE 수평 막대로 표현
- HISTORY가 충분하면 실제 추세, 짧으면 JCS 추정 추세를 사용해 항상 흐름을 표시
- 활동/미디어는 RADAR, 관심 전환은 SIGNAL FLOW, 세부 축은 DEEP DATA로 표현
- 데이터 공백 시 일괄 0/-50 또는 분석대기를 쓰지 않음
- 검색/뉴스/NOW/순위/상대기준/정치인별 안정 해시를 조합한 deterministic 보정값 사용

2) ADMIN DETAIL
- JCS POLITICAL WAR ROOM + CONFIDENTIAL ADVISORY INTELLIGENCE를 JCS COMMAND CENTER 하나로 통합
- 관리자 로그인 시 접힘 없이 전부 펼침
- 현재 정치 흐름, CAUSE TRACE, RISK & OPPORTUNITY, PRIORITY ACTION,
  ACTION MANAGEMENT, RESULT TRACKING, CASE INTELLIGENCE, EVIDENCE를 한 흐름으로 연결
- HISTORY/인텔리전스가 sparse한 정치인도 관리자 분석값을 정치인별로 보정해 표시
- 분석 근거는 퍼센트 자기평가 대신 '강함/충분/보강 중' 계열의 정성 판정 사용

3) COMPARE
- 공개 비교에 COMPARE SCOREBOARD / SIGNAL PROFILE / MOMENTUM TRACK 추가
- 포지션과 격차를 텍스트 카드만이 아니라 막대/추세/포지션 구조로 분리
- 관리자 다자 비교(2~5인)는 sparse HISTORY에도 각 정치인별 원수치/변화/위험/우선대응을 채움
- 관리자 DEEP DATA는 항상 열림

4) AGGRESSIVE DATA FILL POLICY
- 원칙: 빈 분석칸 없음 / 분석대기 없음 / 일괄 0 없음 / 일괄 -50 없음
- 관측값이 있으면 관측값 우선
- 없으면 NOW 점수, 검색/뉴스 신호, 순위, HISTORY, 상대기준, JCS deterministic 보정을 결합
- 추정값은 정치인 ID를 포함한 안정 해시를 사용하므로 새로고침마다 임의로 흔들리지 않음

5) NOW 10MB STORAGE FIX
관측 오류:
- Upstash limit: 10,485,760 bytes
- 실제 MGET 응답: 11,232,018 bytes
- command=MGET, 542명 nowDataPersonPublic assembly 키 집합

수정:
- 542명 이전 person payload 조회를 25개 단위 MGET으로 분할
- 한 번에 542개 person 키를 읽는 direct MGET 제거
- 새 person payload는 Redis key별 개별 SET
- 최대 단일 payload preflight 9,000,000 bytes
- person/control write가 모두 성공한 뒤 META commit을 마지막에 수행
- 실패 시 새로 건드린 person/control 값을 이전 값으로 rollback하고 META는 전환하지 않음

6) FONT / VISUAL
- 신규 FREEDOM DETAIL V2 영역의 최소 px 폰트는 11px
- 핵심 수치/제목은 20~46px급으로 계층화
- 텍스트 카드 반복 대신 bar / trend / radar / signal flow / command bands를 역할별 사용

적용
- 이 ZIP은 직전 JCS POLITICAL DECISION SYSTEM V1 위에 적용하는 통합 리빌드 패키지다.
- 동일 경로 파일을 프로젝트에 반영한 뒤 Vercel 재배포한다.
- 배포 후 관리자 NOW 리프레시 → 게시를 실행해 새 분할 MGET/안전 게시 경로를 확인한다.
