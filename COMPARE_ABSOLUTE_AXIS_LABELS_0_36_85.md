# 정참시 정치인 비교분석 축 표기 정정 0.36.85

## 최종 비교축
정치인 A   50 · 25 · 0 · 25 · 50   정치인 B

- 왼쪽 위치 = 정치인 A 상대강세
- 중앙 0 = 균형
- 오른쪽 위치 = 정치인 B 상대강세
- 화면 숫자에는 - / + 부호를 표시하지 않음
- 마커 숫자 역시 절대값으로 표시

## 내부 계산
원본 Intelligence score(0~100)는 변경하지 않음.
상대 위치 계산도 기존 signed -50~+50 값을 유지:
`(B score - A score) / 2`

signed 값은 오직 좌/우 위치 결정에만 사용.
화면 표시값은 `Math.abs(axis)` 사용.

## 문구
`상세페이지 공통축 · -50 ← 0 → +50`
→ `비교 상대축 · 50 ← 0 → 50`

## 캐시
- features.js dynamic import: v=03685
- index marker: 03685-compare-absolute-axis

## 검증
- 신규 03685 테스트 RED 확인 후 GREEN
- 관련 회귀 테스트 12/12 통과
- JS 문법 검사 통과
- 화면 signed 축 라벨 0건
- 화면 절대축 `50 / 25 / 0 / 25 / 50` 1세트 확인
- 전체 테스트: 140개 중 136개 통과
- 기존 실패 4개 유지:
  1. 03661 구버전 cache/version marker
  2. 03662 구버전 cache/version marker
  3. deep analysis progressive disclosure
  4. detail intelligence UI
