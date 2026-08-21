정참시 v3 alpha6.0.29 · SEARCH GRID HOTFIX
기준: alpha6.0.28
형식: PATCH ONLY

원인
- alpha6.0.28에서 검색창의 '정' 브랜드 칸을 마크업에서 제거했지만,
  css/app.css의 기존 .main-search grid-template-columns: 40px 1fr 66px 규칙이 남아 있었습니다.
- 결과적으로 존재하지 않는 첫 번째 40px 컬럼이 계속 예약되어 input/button 정렬이 무너졌습니다.
- 모바일도 34px + input + 58px의 3열 구조가 남아 같은 문제가 발생했습니다.

수정
- clean search 전용 2열 구조로 명시:
  PC: input + 66px 검색버튼
  Mobile: input + 58px 검색버튼
- 좌측 불필요한 빈 컬럼 완전 제거
- input 폭/placeholder/패딩 정상화
- 검색 기능과 후원 URL 등 다른 기능 변경 없음
- !important 0

QA
- 전체 JS node --check PASS
- PC 2-column selector 확인
- Mobile 2-column selector 확인
- 검색창 내 브랜드 마크/오버레이 없음 확인
