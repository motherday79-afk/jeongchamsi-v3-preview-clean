# 정참시 정치인 비교분석 상대축 통일 0.36.84

## 변경
정치인 비교분석의 관심/활동/미디어 비교지표를
상세페이지와 동일한 `-50 · -25 · 0 · +25 · +50` 상대축으로 통일.

방향:
- 왼쪽(-): 정치인 A 상대강세
- 가운데(0): 균형
- 오른쪽(+): 정치인 B 상대강세

## 계산
원본 정참시 Intelligence score(0~100)는 변경하지 않음.

비교화면 표시축만:
`(B score - A score) / 2`

로 정규화하여 -50~+50 범위로 표시.

예:
- A 100 / B 0 → -50
- A 80 / B 20 → -30
- A 50 / B 50 → 0
- A 20 / B 80 → +30
- A 0 / B 100 → +50

## UI
기존 A/B 각각의 0~100 막대를 제거하고,
한 개의 중앙 기준 비교축으로 변경.

각 지표:
- 정치인 A 이름 ← 왼쪽
- -50 / -25 / 0 / +25 / +50
- 정치인 B 이름 → 오른쪽
- 현재 상대 위치를 마커와 숫자로 표시
- 상대강세/근접 판독 유지

## 캐시
- features.js dynamic import: `v=03684`
- index static asset marker: `03684-compare-relative-axis`

## 검증
- 비교 관련 회귀: 14/14 통과
- 전체 테스트: 138개 중 134개 통과
- 잔여 4개는 기존 실패:
  - 0.36.61 구버전 cache/version marker
  - 0.36.62 구버전 cache/version marker
  - deep analysis progressive disclosure
  - politician intelligence detail UI
- CSS `!important`: 0
- `.compare-relative-axis-track` 본 규칙: 1개
