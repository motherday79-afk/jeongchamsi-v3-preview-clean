# 정참시 0.36.36 WHITE SCREEN HOTFIX

원인: 0.36.35의 src/version.js에서 BUILD_NAME export가 제거되어, 기존 src/views/layout.js 및 src/views/admin.js의 named import가 실패하면서 앱 모듈 로드가 중단됨.

수정:
- APP_VERSION: v3.0.0-alpha6.0.36.36
- BUILD_NAME 복구
- ADMIN_VERSION 유지
- 네이버 데이터 엔진 로직 변경 없음

적용: 저장소 루트에 덮어쓰기(기존 파일 삭제 금지).
