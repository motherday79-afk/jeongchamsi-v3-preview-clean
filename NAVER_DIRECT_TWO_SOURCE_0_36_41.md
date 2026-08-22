# 0.36.41 NAVER DIRECT TWO-SOURCE HOTFIX

수집 원천을 두 개로 고정합니다.

1. 네이버 검색광고 API
   - PC 월간 검색량
   - 모바일 월간 검색량
2. 네이버 검색 Open API - 뉴스 검색
   - 공식 endpoint: `https://openapi.naver.com/v1/search/news.json`
   - 최근 6시간 / 24시간 / 7일 뉴스 집계

관리자 흐름:
검색광고 연결 OK + 뉴스 API 연결 OK -> 542명 전체 리프레시 실행

API HUB 경로와 API HUB 환경변수 이름은 뉴스 수집 코드에서 제거했습니다.
