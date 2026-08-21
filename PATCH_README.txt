정참시 v3 alpha6.0.21 · HEADER / DRAWER DESIGN DETAIL
기준: alpha6.0.20 FUNCTION DETAIL 1 적용 상태
형식: PATCH ONLY

이번 수정 범위는 요청한 3가지만 적용

1. 상단 ··· 메뉴 닫힘 UX
- ··· 클릭 → 기존처럼 열림
- 메뉴 밖 빈 여백 클릭 → 즉시 닫힘
- ESC → 닫힘
- ··· 재클릭 → 닫힘
- 메뉴 내부 링크 클릭 → 라우팅되며 닫힘
- 삼선바 drawer도 기존 backdrop 바깥클릭 + ESC 닫힘 유지

2. 메인/공통 상단 퀵메뉴 디자인
- 검색창 아래 텍스트-only 메뉴를 '아이콘 + 설명' 방식으로 전환
- 직접 노출 7개 유지:
  NOW Rank / IT’S ME / COLUMN / 정참시 NEWS / 시민들의 선택 / 정뮤니티 / 비교분석
- 더보기는 별도 아이콘 타일 + '더보기' 라벨
- 더보기 내부:
  대통령 / 세대별 대통령 / 전국 평가제 / 아카데미
- 모든 아이콘은 inline SVG
- 외부 아이콘 CDN/이미지 요청 0
- PC: 가운데 정렬 아이콘 행
- 모바일/Fold: 동일 아이콘 구조 + 가로 스크롤
- hover/active 터치 피드백 추가

3. 삼선바 전체메뉴 전면 디자인 개선
- 단순 링크 나열 제거
- 참고자료처럼 '서비스 패널' 구조로 변경
- 로그인/회원 상태 카드
- 바로가기 4x2 아이콘 그리드
- 참여·분석 기능 리스트
- 내 참여·배지 / 최근 본 정치인
- 이용안내 / 개인정보처리방침 / 운영정책
- 관리자 권한일 때만 관리자 진입
- drawer 내부만 스크롤, 페이지 body scroll lock
- 바깥 backdrop 클릭 닫기
- ESC 닫기
- 180ms 가벼운 open/close motion

성능 보호
- 정치인 543명 로딩/Seed 구조 변경 없음
- Redis/API/게시판/검색/투표/아카데미 기능 변경 없음
- 외부 이미지·아이콘 요청 추가 0
- !important 0
- 홈 초기 경로 gzip 증가량 로컬 비교:
  pages.css +2.2KB
  app.js +0.18KB
  layout.js +1.42KB
  home.js cache-key change 수준 +0.01KB
- 총 약 +3.8KB 수준
- alpha6.0.20 성능 기준 TRANSFER 63.7KB 대비 소폭 증가 예상

QA
- 전체 JS node --check PASS
- 상단 primary quick item 7개 PASS
- drawer quick item 8개 PASS
- more 바깥클릭 닫기 PASS
- ESC more/drawer 닫기 PASS
- drawer backdrop 닫기 PASS
- external icon/image request 0 PASS
- !important 0 PASS

배포 후 확인
1. PC 상단 아이콘+라벨
2. ··· 열고 빈 여백 클릭 → 닫힘
3. 삼선바 → 새 서비스 drawer
4. drawer 바깥 클릭 → 닫힘
5. 모바일 상단 아이콘 가로 스크롤
6. /?perf=1 재측정
