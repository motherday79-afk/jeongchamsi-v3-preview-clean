정참시 v3 alpha6.0.27 · HOME STORY ORDER
기준: alpha6.0.26
형식: PATCH ONLY

메인 노출 순서
0. 정참시 브랜드 선언
1. IT’S ME
2. CITIZENS’ CHOICE
3. 세대가 뽑은 대통령
4. 국회의원 전국 평가제
5. NOW Rank
6. 정치인 비교분석
7. 정참시 아카데미
8. COLUMN
9. 정뮤니티

의도
브랜드 선언 → 시민 제안 → 시민 선택 → 세대 선택 → 정치인 평가 → 주목 정치인 → 비교 → 실제 참여 준비 → 읽을거리/토론
정참시의 '행동 우선' 정체성이 메인 순서 자체에서 보이도록 재구성.

문구 변경
IT’S ME
- 제목: 저는, 이렇게 제안합니다
- 설명: 꼭 필요하고 유용한 정책이 공론화될 수 있도록 정참시가 앞장서겠습니다.

CITIZENS’ CHOICE
- 제목: 귀담아 들어야 합니다.
- 설명: 작은 관심이 세상을 바꿉니다.

보존
- 모든 모듈 기능/데이터 연결 그대로
- 히어로 /about /support / 관리자 수정 그대로
- 사이드바 그대로
- CSS 변경 없음
- API/Redis/정치인 543명 데이터 변경 없음
- 성능 critical path 변경 없음

QA
- 전체 JS node --check PASS
- 메인 section source-order 검증 PASS
- 새 문구 4종 검증 PASS
- 기존 문구 제거 확인 PASS
