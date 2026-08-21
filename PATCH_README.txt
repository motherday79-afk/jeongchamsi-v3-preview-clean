정참시 v3 alpha6.0.28 · SUPPORT DIRECT / SEARCH CLEAN
기준: alpha6.0.27
형식: PATCH ONLY

1. 정참시 후원하기
- 메인 히어로 '정참시 후원하기' 클릭 시 외부 후원 URL로 바로 이동
- URL: https://toon.at/donate/jungchamsi
- 새 탭 + noopener/noreferrer
- /about 내부 후원 버튼도 동일 URL 직결
- /support 안내 페이지는 유지하며 실제 후원 페이지 이동 버튼 추가

2. 검색창 브랜딩 제거
- 검색창 안 '정치에 참여할 시간' 오버레이 제거
- 검색창 앞의 단독 '정' 홈 마크도 제거
- 검색창은 기능만 남김
- placeholder:
  정치인·정당·정책·NEWS·COLUMN 통합검색

3. 회원가입 인증
- 이번 패치에서는 변경 없음
- 현재 진입장벽 낮은 가입 구조 유지

QA
- 전체 JS node --check PASS
- 메인/ABOUT 후원 URL 직결 확인
- 검색 brand hint / search home mark 제거 확인
- functional placeholder 확인
- !important 0
