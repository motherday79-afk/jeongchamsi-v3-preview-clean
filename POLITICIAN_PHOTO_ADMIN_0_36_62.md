# JCV3 alpha6.0.36.62 — 정치인 수동 사진 관리

## 목적
관리자가 어드민의 `인물 관리`에서 정치인 한 명을 선택해 사진을 직접 추가·교체하고, 필요하면 수동 사진을 삭제해 기존 Wikimedia Commons 자동 사진으로 즉시 복귀할 수 있게 한다.

## 운영 구조
- 서버 Source of Truth: `politicianPhotos` 도메인
- 이미지 저장: 기존 Vercel Blob 업로드 경로 사용
- 공개 이미지 URL은 기존 `/api/v3/politician-photo?id=...&w=...`를 그대로 유지한다.
- 공개 사진 라우트는 관리자 수동 사진을 먼저 확인하고, 없을 때만 Wikimedia Commons resolver로 fallback한다.
- 수동 사진 삭제 시 별도 데이터 이관 없이 Wikimedia 자동 사진으로 복귀한다.
- 사진 교체 성공 후 이전 MINI/CARD/PROFILE Blob 3종을 자동 삭제한다.
- 수동사진 해제 시 해당 Blob 3종도 자동 삭제해 저장공간 누적을 막는다.
- 3종 업로드 중 일부만 성공한 경우 성공분을 즉시 롤백 삭제해 고아 Blob을 남기지 않는다.
- 기존 정치인 카드/상세/평가제 코드는 사진 URL 구조를 바꾸지 않는다.

## 관리자 사용법
1. 관리자 → `인물 관리`
2. 이름·정당·지역으로 검색
3. 정치인 선택
4. JPG / PNG / WebP 사진 선택
5. 미리보기 확인 후 `사진 저장 · 수동사진 우선 적용`
6. 되돌릴 때 `수동사진 삭제 · Wikimedia 복귀`

## 사진 가이드
### 권장 원본
- 비율: 3:4 세로형
- 권장 해상도: 800×1067 이상
- 권장 원본 용량: 1.5MB 이하
- 업로드 허용 상한: 5MB
- 포맷: JPG, PNG, WebP
- 얼굴 위치: 상단 1/3~중앙 권장
- 단체사진/배경이 넓은 사진보다 상반신 중심 인물사진 권장

### 서비스 저장 규격
원본을 그대로 서비스하지 않고 브라우저에서 자동으로 WebP/JPEG 최적화 후 3종을 저장한다.

| 용도 | 목표 크기 | 해상도 상한 | 사용 위치 |
|---|---:|---:|---|
| MINI | 12KB | 96×128 | 작은 랭킹·사이드 영역 |
| CARD | 24KB | 192×256 | 정치인 목록·NOW 카드 |
| PROFILE | 64KB | 480×640 | 상세·평가 페이지 |
| 합계 | 약 100KB | - | 정치인 1명 전체 |

- 자동 최적화 후 1명 전체가 **128KB를 초과하면 저장을 중단**한다.
- 542명 전원 수동 등록 시 목표 저장량은 약 **52.9MiB**, 절대 상한 기준 약 **67.8MiB**다.
- 목록 이미지는 기존처럼 `loading="lazy"`, `decoding="async"`, 낮은 fetch priority를 유지하므로 처음부터 전체 사진을 동시에 요청하지 않는다.
- Blob/CDN 캐시를 사용하므로 재방문 트래픽 부담도 낮춘다.

## 캐시
- 수동사진 매핑 서버 메모리 캐시: 10초
- 수동사진 redirect 응답: 브라우저 30초 / CDN 60초
- 어드민 저장 화면은 저장된 Blob URL을 직접 사용하므로 저장 결과를 바로 확인할 수 있다.

## 안전장치
- 실존 정치인 슬롯 ID만 허용하고 synthetic `assembly-300`은 수동사진 대상에서 제외한다.
- 수동사진 URL은 `*.blob.vercel-storage.com`만 허용한다.
- Blob 삭제 API는 관리자만 사용할 수 있고 `/jcv3/politician/` 경로의 Blob만 삭제한다.
- 관리자 권한은 기존 `/api/v3/upload` 및 `/api/v3/content` 권한 검증을 그대로 사용한다.
- 새 CSS는 기존 36.61 cascade cleanup 위에 정상 component selector로 추가하며 `!important`를 사용하지 않는다.

## 검증
- 36.60 전국평가제 회귀 테스트
- 36.61 CSS cascade cleanup 회귀 테스트
- 36.62 정치인 사진 admin contract
- 36.62 politicianPhotos schema sanitization
