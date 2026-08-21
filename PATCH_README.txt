정참시 v3 alpha6.0.24 · STABILITY DETAIL
기준: alpha6.0.23 적용 상태
형식: PATCH ONLY

1. NOW Rank 50명 더 불러오기
- 기존 data-go 라우팅 제거
- URL limit 값은 갱신하되 페이지 resetScroll을 하지 않음
- 50명까지 본 현재 위치를 유지한 채 51~100명이 아래에 이어서 보이게 처리
- 맨 위로 튀는 현상 제거

2. 관리자 회원관리 강화
- 이름 / 닉네임 / 지역 / 선호정당 / 이메일 / 전화 / 출생연도 수정
- 새 비밀번호 직접 지정(8자 이상)
- 기존 비밀번호 원문 조회 없음
- 새 비밀번호는 기존 scrypt 방식으로 새 해시 저장
- 일반회원 ↔ 관리자
- 정상 / 이용정지
- 정지기간: 2일 / 7일 / 30일 / 무기한
- 제재사유 저장
- suspendedUntil / suspensionReason 저장
- 기간이 지난 정지는 로그인 시 자동 정상화
- 정지 계정은 server currentUser 단계에서 글쓰기/댓글/투표/좋아요 등 서버 액션 차단
- 마지막 활성 관리자 보호 유지

3. 메인 대표 COLUMN
- 카드 전체 cursor/hover/focus 피드백 추가
- 클릭 가능한 카드임을 명확하게 표시
- 대표이미지 cover 크롭 제거 → contain
- 사용자가 제작한 이미지 전체가 보이도록 변경

4. COLUMN / NEWS 상세 대표이미지
- PC 최대 width 58%, 620px
- 중앙정렬
- contain
- 모바일은 100%
- 본문보다 이미지가 과도하게 커 보이지 않게 축소

5. 오른쪽 실시간 급상승
- 게시글 급상승 제거
- 정치인 급상승 영역으로 의미 수정
- 실제 실시간 변화 데이터 연결 전에는 NOW Rank 상위 정치인을 fallback으로 사용
- 이름 + 정당/지역 + 정치인 상세 링크
- 전체페이지도 정치인 TOP 10 fallback

6. 정참시 아카데미 CSS 충돌 제거
- 원인: css/app.css에 남아있던 초기 skeleton 규칙
  .schedule-line i,.schedule-line em { height:7px; background:#e9efed; ... }
- 해당 skeleton 규칙을 원본 app.css에서 제거
- 아카데미 일정 디자인을 css/app.css 한 곳으로 통합
- pages.css에 후대에 덧댄 academy schedule 중복 규칙 제거
- 실제 교육명 em은 일반 텍스트로만 렌더
- 회색 줄이 글씨를 덮는 구조 제거

QA
- 전체 JS node --check PASS
- Vercel Function 1개(api/gateway.js) 유지
- 회원 제재/비밀번호 변경 in-memory runtime PASS
- NOW load-more dedicated no-scroll action PASS
- 아카데미 skeleton background 잔존 0
- pages.css academy schedule 중복 selector 0
- !important 0
