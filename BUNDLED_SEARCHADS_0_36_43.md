# 0.36.43 BUNDLED SEARCH ADS + NEWS FALLBACK

- v2에서 확인된 NAVER Search Ads 3종 인증값을 서버 전용 fallback으로 적용
- Vercel 환경변수가 있으면 환경변수를 우선 사용
- 환경변수가 없어도 bundled-v2 fallback으로 검색광고 PC/모바일 검색량 수집 가능
- NAVER News 인증값이 없으면 Google News RSS fallback 사용
- NOW start는 Search Ads가 준비되면 542명 수집 시작
- 버전 0.36.43
