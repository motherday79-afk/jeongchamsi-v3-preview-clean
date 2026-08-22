# 0.36.34 — WIKIMEDIA COMMONS ALL POLITICIANS

## 이번 패치에서 한 일
- 사진 대상: 542명 (국회의원 슬롯 300 중 공석 `assembly-300` 제외 + 광역 16 + 기초 227)
- 사진 원천: **Wikimedia Commons only**
- 0.36.33의 중앙선관위(NEC) 자동 사진 검색 제거
- v2/구버전 코드 런타임 연동 없음
- 기존 상위 10명 Commons 사진은 검증 seed로 유지하되, 화면에서는 다른 532명과 동일한 `/api/v3/politician-photo` 경로 사용
- 나머지 인물은 다음 순서로 Commons 이미지를 찾음
  1. 한국어 위키백과 정치인 문서 → Wikidata P18 → Commons
  2. Wikidata 동명이인 검색 → 정치인 문맥 검증 → P18 → Commons
  3. Commons 파일 검색 → 이름 + 직위 + 정당 + 지역 문맥 점수화
- 서명/로고/SVG/동영상은 인물사진 후보에서 제외
- 최종 이미지 호스트는 `commons.wikimedia.org` 또는 `upload.wikimedia.org`만 허용
- 성공한 사진 응답은 Vercel CDN에 장기 캐시

## 적용 방식
이 ZIP의 폴더 구조를 저장소 루트 기준으로 그대로 덮어쓰기.

## 확인 포인트
- 기존 10명도 `/api/v3/politician-photo?id=...` 경로를 사용함
- `X-JCV3-Photo-Provider` 응답 헤더가 `WIKIMEDIA_COMMONS_*`로 표시됨
- Commons에 실제 인물사진이 없는 인물은 다른 출처로 임의 대체하지 않고 404로 남김
