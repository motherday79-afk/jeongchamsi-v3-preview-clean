# JCV3 alpha6 0.36.30 — PHOTO GLOBAL LINK ROOTFIX

- tiny/sidebar Vercel image quality를 production 허용값 q55로 통일해 깨진 이미지 요청 제거
- HOME 상위 15명 person-lite identity에 connected=true를 부여해 최근 본 정치인 이름 정상화
- 비교분석 A/B 실제 정치인 사진 연결
- 통합검색 정치인/전국평가 결과 사진 연결
- 기존 NOW, 세대별 TOP15, 정치인 상세, 전국평가, 최근 본 사진 연결 유지
- 사진 없는 정치인은 기존 zero-request vector placeholder 유지
