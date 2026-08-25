# POLITICIAN PHOTO FILL — 5 NATIONAL ASSEMBLY MEMBERS (2026-08-26)

이번 작업에서는 아래 5명의 국회의원 사진만 로컬 자산으로 채워 넣었습니다.

## 적용 대상
- assembly-127 — 장종태 (더불어민주당 / 대전 서구갑)
- assembly-227 — 이상휘 (국민의힘 / 경북 포항시남구울릉군)
- assembly-089 — 김미애 (국민의힘 / 부산 해운대구을)
- assembly-214 — 윤준병 (더불어민주당 / 전북 정읍시고창군)
- assembly-248 — 박상웅 (국민의힘 / 경남 밀양시의령군함안군창녕군)

## 반영 방식
- 로컬 정적 자산 추가: `assets/politicians/`
- 로컬 시드 추가: `server/v3/data/politician-photo-local-seed.json`
- 사진 라우트 우선순위:
  1. 기존 관리자/Blob 수기등록 사진
  2. 이번 5명 로컬 시드 사진
  3. 기존 자동 위키미디어 경로

## 포함 파일
- `server/v3/routes/politician-photo.js`
- `server/v3/data/politician-photo-local-seed.json`
- `assets/politicians/assembly-089-{mini,card,profile}.webp`
- `assets/politicians/assembly-127-{mini,card,profile}.webp`
- `assets/politicians/assembly-214-{mini,card,profile}.webp`
- `assets/politicians/assembly-227-{mini,card,profile}.webp`
- `assets/politicians/assembly-248-{mini,card,profile}.webp`

## 출처 참고
- 톡표 프로필 페이지 기반 수집 후 로컬 자산화
