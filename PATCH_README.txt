정참시 v3 alpha6.0.23 · GENERATION HOME RESULT
기준: alpha6.0.22 DETAIL POLISH
형식: PATCH ONLY

수정
- 메인 '세대가 뽑은 대통령' placeholder 제거
- 세대별 실제 generation.results 집계 연결
- 투표가 있으면:
  정치인 이름 / 1위 / 득표수 / 득표율 / 총 참여자수 노출
- 투표가 없는 세대:
  '아직 투표가 이뤄지지 않았습니다'
  '첫 투표를 기다리는 중'
- 득표율 bar 실제 비율 연동
- 기존 generation 상세페이지 집계 방식과 동일하게 계산
- 전체 정치인 provider는 generation에 실제 득표가 있을 때만 필요 시 로드
  (투표가 전혀 없으면 메인 성능 경로에 추가 로드 없음)

QA
- 전체 JS node --check PASS
- mock runtime PASS
  10대: 김민석 4/6표 = 67%
  20대: 투표 없음 문구
  30대: 정청래 3/3표 = 100%
- '1위 후보 영역' / '투표 결과 표시' placeholder 제거 확인
- Redis 구조/API 변경 없음
- CSS 변경 없음
