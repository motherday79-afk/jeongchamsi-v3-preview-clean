# 0.36.31 PHOTO CHAIN ROOTFIX

- Vercel Image Optimization 허용 width/quality와 정치인 사진 variant를 강제 일치: 64/96/160/384, q55/65
- invalid 72px/80px 요청 제거
- HOME NOW / 전국평가 / 최근 본 / MY 최근 / 비교 / 검색 / 세대별 TOP15 / 상세의 동일 정치인 photo chain 유지
- person-lite 상위 15명 connected=true 자체 포함
- 이미지 실패 시 깨진 아이콘/alt가 남지 않고 기존 벡터 placeholder로 즉시 복귀
- 세대별 TOP15의 background-image 제거, lazy <img> 전환으로 모바일 불필요한 선로드 방지
- internal JS import query string 재도입 없음
