정참시 v3 alpha6.0.17.1 · WHITE SCREEN RECOVERY

기준
- alpha6.0.17 정치인 543 TEXT SEED 적용 후 흰 화면이 뜨는 상태

수정
- person-seed.js 추가 모듈 의존성 제거
- 543명 Seed를 person-provider.js 내부에 직접 번들
- home / people / admin / features 모듈 캐시 버전 강제 갱신
- app.js 자체 캐시 키 갱신

보존
- 543명 텍스트 데이터 유지
- 사진 제외 유지
- 외부 정치인 API 호출 0 유지
- 기존 Redis 회원/게시판/설문/칼럼 데이터에는 손대지 않음
- css/app.css 변경 없음
- 기능/권한/저장구조 변경 없음

이 패치는 '흰 화면 복구'만 위한 최소 핫픽스입니다.
