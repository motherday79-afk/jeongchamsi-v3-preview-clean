# alpha6.0.36.20 — AUTH SINGLETON ROOTFIX

## 원인
- app.js는 core/user.js?v=0.36.19를 로드
- 여러 view는 core/user.js?v=0.36.18을 로드
- 브라우저가 서로 다른 모듈로 인식해 로그인 session 메모리가 분리됨

## 수정
- core/user.js의 모든 import에서 버전 query 제거
- core/repository.js의 모든 import에서 버전 query 제거
- 상태를 가진 core 모듈은 앱 전체에서 canonical URL 하나만 사용
- /src/*는 Vercel no-store 설정이 있으므로 상태 모듈 cache-bust query가 필요하지 않음
- app.js entry만 0.36.20으로 갱신

## 기대 동작
- 메인/마이페이지/관리자/게시판/상세가 동일 로그인 상태 공유
- 로그인 후 MY 이동 시 세션 유지
- 향후 디자인/배지 패치가 버전 문자열을 바꿔도 인증 인스턴스가 분리되지 않음
