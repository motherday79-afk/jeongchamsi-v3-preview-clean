# QA REPORT — v3.0.0-alpha5.0

- Locked HOME CSS SHA256 matched alpha3.1: PASS
- JavaScript syntax check (all src/api/lib JS): PASS
- v2 runtime reference scan: PASS (0)
- `!important` scan: PASS (0)
- 국회의원 슬롯/링크 300: PASS
- 광역단체장 슬롯/링크 16: PASS
- 기초단체장 슬롯/링크 227: PASS
- 공통 정치인 상세 8개 핵심 영역: PASS
- COLUMN 작성 → 외부 목록 → 상세 → 대표사진: PASS
- COLUMN / 정뮤니티 / NEWS 작성·수정·삭제 저장 흐름: PASS
- 설문 생성, 아카데미 일정 생성: PASS
- 관리자 기본 인증 + signed session 검증: PASS
- HOME snapshot refresh loop test: fetch 1회 / 불필요 update event 0회

정치인 실명·정당·지역·실사진·NOW Rank 실데이터는 의도적으로 0명 상태입니다.
