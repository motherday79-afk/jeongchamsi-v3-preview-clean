# 광역단체장 16명 사진 자산화 — 2026-08-26

현재 정참시 `politician-photo-roster.json`의 광역단체장 16명을 전원 사진 자산으로 등록했습니다.

- metropolitan-001 오세훈 · 서울특별시
- metropolitan-002 민형배 · 전남광주통합특별시
- metropolitan-003 전재수 · 부산광역시
- metropolitan-004 추경호 · 대구광역시
- metropolitan-005 박찬대 · 인천광역시
- metropolitan-006 허태정 · 대전광역시
- metropolitan-007 김상욱 · 울산광역시
- metropolitan-008 조상호 · 세종특별자치시
- metropolitan-009 추미애 · 경기도
- metropolitan-010 우상호 · 강원특별자치도
- metropolitan-011 신용한 · 충청북도
- metropolitan-012 박수현 · 충청남도
- metropolitan-013 이원택 · 전북특별자치도
- metropolitan-014 이철우 · 경상북도
- metropolitan-015 박완수 · 경상남도
- metropolitan-016 위성곤 · 제주특별자치도

## 자산 반영

`server/v3/data/politician-photo-local-seed.json`에 16명 전원을 자산 레코드로 추가했습니다.
기존 PHOTO5의 5명도 유지되어 패키지 시드는 총 21명입니다.

`server/v3/lib/politician-photo-assets.js`에서 Redis/Blob 저장 자산과 패키지 시드를 병합합니다.
동일 정치인에 관리자/Blob 자산이 존재하면 기존 관리자 자산을 우선합니다.

`/api/v3/content?domain=politicianPhotos`와 `/api/v3/politician-photo` 모두 병합 자산을 사용하므로 관리자 화면의 정참시 자산 수에도 패키지 자산이 포함됩니다.
