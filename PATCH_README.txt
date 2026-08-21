정참시 v3 alpha6.0.22 · DETAIL POLISH
기준: alpha6.0.21 HEADER/DRAWER DETAIL 적용 상태
형식: PATCH ONLY

이번 승인 범위
1. 헤더 아이콘 확대
- 삼선바 / 내 참여(알림) / 최근 본 정치인(즐겨찾기) 버튼과 SVG를 한 단계 확대
- 헤더 전체 구조와 위치는 유지
- PC 42px hit area / 모바일 44px hit area
- SVG 23~24px

2. 메인 아카데미 정돈
- 긴 YYYY-MM-DD 세로 줄바꿈 제거
- 날짜 표시: MM.DD 요일
- 시간: HH:MM–HH:MM
- 교육명: 한 줄 ellipsis
- 상태: 우측 신청가능/예정/마감 pill
- 기존 회색 skeleton처럼 보이던 선 제거
- 최대 4개 노출 구조는 그대로 유지
- 관리자 날짜/시간/문구 편집 기능 유지

3. 오른쪽 '내 참여 · 배지' 빈 원 제거
- 의미 없는 빈 동그라미 4개 완전 제거
- 실제 확인 가능한 기존 배지 상태만 프리뷰
  * 설문 참여가 있으면 '첫 참여', '시민 선택'
- 배지가 아직 없으면 empty state:
  * 로그인 사용자: '첫 배지를 획득해보세요'
  * 비로그인: '로그인하고 배지를 모아보세요'
- 배지함으로 바로 이동
- v3 전체 40~50종 + 히든미션 시스템은 다음 별도 기능 패치에서 설계/구현

4. 검색창 브랜드 인지
- 기존 '정치인·정당·정책...' placeholder 제거
- 검색창 첫 문구: '정치에 참여할 시간'
- 정 / 참 / 시 세 글자만 브랜드 그린 포인트
- input 자체 placeholder가 아니라 overlay hint 방식
- 검색창 focus 또는 실제 입력 시 자동으로 사라짐
- 빈 상태로 돌아오면 다시 표시
- 검색 기능/라우팅 변경 없음

보존
- alpha6.0.21 상단 아이콘 퀵메뉴/삼선바 drawer 유지
- ··· 바깥클릭/ESC 닫기 유지
- 정치인 543명 lazy 구조 유지
- Redis/API 구조 변경 없음
- 외부 이미지/아이콘 요청 추가 0
- !important 0

QA
- 전체 JS node --check PASS
- runtime home mock PASS:
  * 2026-08-24 → 08.24 월
  * 14:00–17:00
  * 교육명 한 줄 데이터 유지
  * 구 badge-mini-row 제거
  * 비로그인 badge empty state 노출
  * 검색 브랜드 문구 렌더
- 초기경로 gzip 증감(로컬):
  pages.css +906 bytes
  layout.js +42 bytes
  home.js +417 bytes
  app.js +1 bytes

배포 후
- 화면 확인 후 /?perf=1 재측정 권장
