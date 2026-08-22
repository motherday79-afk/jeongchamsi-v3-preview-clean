# 0.36.44 NOW publish → home link hotfix

- 관리자 `현재 데이터로 게시`가 저장한 `nowDataCurrent`를 `/api/v3/home` 응답에 포함
- 메인 NOW Rank TOP10은 게시 스냅샷 `ranked`를 우선 사용
- 게시 데이터가 없을 때만 기존 `HOME_NOW_PREVIEW` fallback
- 게시 성공 시 브라우저 홈 스냅샷 캐시 무효화
- 홈 API를 no-store로 전환해 게시 직후 재로드 반영
