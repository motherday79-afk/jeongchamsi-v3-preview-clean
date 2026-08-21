정참시 v3 alpha6.0.25 · BRAND HERO / ABOUT / SUPPORT
기준: alpha6.0.24
형식: PATCH ONLY

적용 내용
1. 메인 최상단 대통령 박스 제거
- 대통령 상세페이지 /president는 그대로 유지
- 더보기 메뉴의 대통령 링크도 그대로 유지
- 기존 대통령 메인 자리에는 정참시 브랜드 히어로 배치

2. 메인 브랜드 히어로
- 확정 카피:
  정참시 — 정치에 참여할 시간
  바라볼 때가 아닌, 행동할 때 정치가 시작됩니다.
  알고, 비교하고, 선택하고, 평가하는 것.
  한 사람의 작은 행동이 정치의 방향을 만듭니다.
- CTA:
  정참시 더 알아보기 → /about
  정참시 후원하기 → /support
- 확정 시안의 오른쪽 비주얼을 경량 WebP 자산으로 사용
- 자산 14KB 수준으로 최적화
- PC에서는 기존 메인-column 가로폭 100%를 사용하고 대통령 박스보다 세로만 확대
- 모바일 반응형 포함

3. 관리자 > 메인 타이틀
- 상단 문구
- 메인 문구
- 서브 1 / 서브 2
- 두 CTA 문구
- 히어로 비주얼 교체
- /about 페이지 제목/도입문/본문
- /support 페이지 제목/도입문/본문/후원 안내
모두 서버 Source of Truth인 brand 도메인에 저장

4. 정참시 더 알아보기
- /about
- 임시 브랜드 스토리 초안 작성
- 메인 철학 → 참여의 의미 → 정참시를 만든 이유 흐름

5. 정참시 후원하기
- /support
- 후원의 의미/사용 목적/준비 상태를 설명하는 임시 페이지
- 실제 후원 계좌/결제수단은 아직 넣지 않음
- 관리자에서 문구 수정 가능

보존
- 대통령 상세페이지 유지
- 기존 NOW Rank 이하 메인 순서 유지
- Redis/API gateway 1-function 구조 유지
- 543명 정치인 데이터/성능 lazy 구조 유지
- !important 0

검수
- 전체 JS node --check PASS
- brand schema sanitize/default PASS
- 메인 히어로 runtime PASS
- /about runtime PASS
- /support runtime PASS
