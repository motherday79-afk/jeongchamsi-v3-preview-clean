# 0.36.69 · 정치인 상세 관리자 사진 즉시 등록

- 관리자 로그인 상태에서 정치인 상세페이지의 사진/벡터 영역 클릭 가능
- `사진 등록·교체` 버튼 또는 사진 영역 클릭 → JPG/PNG/WebP 선택
- 선택 즉시 기존 `uploadPoliticianPhotoSet()` 최적화 파이프라인 실행
- mini/card/profile 3종 생성, 정참시 Blob 자산 저장, `politicianPhotos` Source of Truth 갱신
- 업로드 라우트가 타임스탬프+랜덤 suffix URL 생성 → 교체 시 캐시 충돌 방지
- 관리자 사진 관리 화면에서는 sourceType=manual 규칙으로 `수기등록 · 정참시 자산` 표시
- 일반 회원에게는 업로드 UI가 렌더링되지 않음
