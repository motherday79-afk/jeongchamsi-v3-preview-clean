# 정참시 정치인 사진 저장/노출 정합성 핫픽스 0.36.81

## 확인된 원인 1 — 덮어쓰기 회귀
0.36.72에서 적용했던 사진 저장 직후 캐시 차단 로직이
이후 사진 진단 패치에서 이전 politician-photo.js가 다시 포함되며 일부 되돌아갔습니다.

복구:
- 정치인 사진 resolver 응답: private, no-store
- 사진 없음 404 응답: private, no-store
- Wikimedia fallback 응답: private, no-store
- politicianPhotos 저장 시 서버 수기사진 캐시 즉시 무효화
- 프런트 사진 resolver 키를 v=03681로 갱신
- index cache marker도 03681로 갱신

## 확인된 원인 2 — 전체 목록 덮어쓰기형 저장
기존 상세페이지 관리자 사진 저장은:
1. politicianPhotos 전체 목록 GET
2. 한 명 레코드 수정
3. politicianPhotos 전체 목록 POST

방식이어서 stale data / lost update 가능성이 있었습니다.

수정:
- `manual-upsert` 전용 액션 추가
- 저장 대상 정치인 1명만 원자적으로 upsert
- 서버 로스터의 assembly / metropolitan / basic ID를 공통 검증
- 기초단체장도 동일한 저장 경로 사용
- 기존 사진 교체 시 새 Blob 저장 성공 후 이전 Blob 정리

## 기초단체장 소형 프로필
- 최소 허용: 120 × 150px
- 173 × 216 공식 프로필 계열은 허용
- mini/card/profile 자동 최적화 유지
- 총 최적화 용량 128KB 제한 유지

## 검증
- 핵심 사진/관리자 회귀 테스트 27/27 통과
- 관련 JS 문법 검사 통과
