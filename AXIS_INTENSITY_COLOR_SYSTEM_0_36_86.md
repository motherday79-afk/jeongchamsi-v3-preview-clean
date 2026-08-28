# 정참시 상세/비교 분석축 데이터 강도 컬러 시스템 0.36.86

## 적용 범위
정치인 상세페이지의 `-50 ← 0 → +50` 축 전부:
- 관심 구조 분석
- 활동 · 미디어 분석
- DEEP ANALYSIS 내부 상대축

정치인 비교분석의 `50 ← 0 → 50` 축 전부.

## 원칙
색상은 방향이나 지표 종류를 의미하지 않습니다.
색상은 오직 중심에서의 거리 / 두 정치인의 차이 강도만 표시합니다.

방향:
- 상세페이지: 좌/우 위치가 -/+ 방향을 표현
- 비교분석: 좌/우 위치가 정치인 A/B 상대강세를 표현

강도:
- 0 ~ 10: 초록
- 11 ~ 20: 노랑
- 21 ~ 30: 앰버
- 31 ~ 40: 오렌지
- 41 ~ 50: 빨강

`-47`과 `+47`은 같은 빨강.
비교축에서도 어느 정치인이 앞서든 차이의 절대값이 같으면 같은 색을 사용합니다.

## UI
- 축 배경은 중립 회색으로 통일
- 현재 포인트와 현재 숫자만 데이터 강도 색상 적용
- 기존 상세 상대축의 mint/navy/blue/orange/red/violet 고정색 지정 제거
- 관심 구조 축의 고정 민트 포인트 제거
- 비교축의 고정 다크 포인트 제거
- 안내문에 초록→빨강이 편차/차이 강도임을 명시

## 공통 로직
`axisIntensityBand(value)`를 상세페이지와 비교분석이 공동 사용.

## 캐시
- index marker: `03686-data-intensity-axis`
- people.js: `v=03686`
- features.js: `v=03686`
- compare-intelligence.js: `v=03686`

## 검증
- 신규 TDD: RED 확인 후 GREEN
- 관련 회귀 테스트: 24/24 통과
- JS 문법 검사 통과
- CSS `!important`: 0
- 공유 `.intensity-green` 팔레트 본 규칙: 1개
- 상세 상대축 고정 tone 인자: 0개
- 전체 테스트: 144개 중 140개 통과
- 기존 실패 4개 유지:
  1. 03661 cache/version marker
  2. 03662 cache/version marker
  3. deep analysis progressive disclosure
  4. detail intelligence UI
