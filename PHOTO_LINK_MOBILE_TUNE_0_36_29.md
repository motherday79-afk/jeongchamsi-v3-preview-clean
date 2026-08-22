# JCV3 alpha6 0.36.29 — PHOTO LINK + MOBILE TUNE

## 변경 사항
1. **국회의원 전국 평가제 사진 연동**
   - 메인 전국 평가 카드(`home`)에 평가 대상 정치인 사진 연동
   - `/national-evaluation` 상세 상단 히어로에 동일 사진 연동

2. **최근 본 정치인 사진 연동**
   - 메인 우측 사이드바 최근 본 정치인 카드에 사진 연동
   - `/mypage/recent` 최근 본 목록에도 사진 연동

3. **모바일 체감 속도 보완**
   - 최근 본/전국 평가에 더 작은 사진 variant(`tiny`, `sidebar`) 적용
   - 모든 보조 사진에 `loading="lazy"`, `decoding="async"`, `fetchpriority="low"` 적용
   - 기존 NOW TOP 카드 구조는 유지하여 CLS 없이 확장

## 수정 파일
- `src/data/politician-photo-index.js`
- `src/views/home.js`
- `src/views/features.js`
- `src/views/user.js`
- `css/pages.css`
- `src/version.js`
- `index.html`
