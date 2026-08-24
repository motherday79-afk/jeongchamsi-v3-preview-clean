# JCV3 alpha6.0.36.61 — Structural Cascade Cleanup

## 목적
PC·모바일의 보이는 결과와 기능을 유지하면서, 후단 CSS가 `!important` 또는 과도한 specificity로 앞선 규칙을 덮는 구조를 제거합니다.

## 변경 원칙
- 기능 변경 없음
- 디자인 변경 없음
- 데이터/라우팅 변경 없음
- CSS 강제 선언(`!important`) 876개 → 0개
- late specificity guard 제거
- 현재 drawer와 충돌하던 레거시 `.drawer-account div / a` 범용 규칙 제거
- 필요한 최종 속성은 canonical `.drawer-account-copy`, `.drawer-account-arrow`에 귀속
- 모바일/색상 레이어는 실제 컴포넌트 범위가 드러나는 셀렉터로 정상 cascade 구성
- CSS 5개 캐시 버전을 36.61로 갱신하고 JavaScript 동작은 36.60 그대로 유지

## 주요 구조 수정
1. `pages.css`
   - drawer account late specificity guard 삭제
   - 충돌 원인이던 과거 범용 account child 규칙 삭제
   - 현재 drawer의 최종 스타일을 canonical 규칙으로 통합
2. `spectrum-palette.css`
   - launcher 흰색/compact 규칙을 `.product-launcher-grid` 범위로 명확화
3. `mobile-foundation.css`
   - launcher, IT’S ME, NOW, module description, hero hub의 모바일 규칙을 실제 컴포넌트 범위로 명확화
   - “마지막에 강제로 이긴다”는 전제를 제거
4. 공통
   - `app.css`, `pages.css`, `product-system.css`, `spectrum-palette.css`, `mobile-foundation.css`의 `!important` 전부 제거

## 회귀 검증
- 기존 36.60 테스트 전체 유지
- 36.61 구조 회귀 테스트 추가
- 실제 렌더 마크업 기준 10개 뷰 확인
  - HOME
  - NOW
  - COMPARE
  - GENERATION
  - NATIONAL EVALUATION
  - ACADEMY
  - SEARCH
  - ADMIN
  - MYPAGE
  - COLUMN
- 폭: 1440 / 1024 / 760 / 430
- 기준 36.60과 shorthand 확장 후 CSS cascade 결과 비교: 변경 0
- 5개 CSS 파싱 오류: 0

## 의도적으로 건드리지 않은 영역
이번 버전은 CSS cascade 구조만 정리합니다. JavaScript의 비동기 재렌더·타이머는 동작 근거를 별도로 확인한 뒤 다음 구조 감사에서 다룹니다. 증거 없이 제거하지 않습니다.
