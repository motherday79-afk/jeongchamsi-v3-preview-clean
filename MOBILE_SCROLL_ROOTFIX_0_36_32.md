# JCV3 alpha6 0.36.32 — MOBILE SCROLL ROOTFIX

## 목적
Samsung Internet 등 모바일 브라우저에서 스크롤 hot path에 `history.replaceState()`가 프레임 단위로 들어가던 비용을 제거합니다.

## 변경
- 매 `requestAnimationFrame`마다 History API를 쓰던 구조 제거
- 스크롤 좌표는 메모리에 즉시 기록
- History API 반영은 최대 약 240ms 간격으로 제한
- `scrollend`, `touchend`, `pointerup`, 라우트 이동 직전, `pagehide`, hidden 전환에서는 정확한 좌표 즉시 저장
- 동일 좌표의 중복 `replaceState()` 호출 제거

## 보호된 동작
- 일반 라우트 이동: 즉시 `(0,0)`
- 브라우저 Back/Forward: 저장한 X/Y 복원
- `history.scrollRestoration = "manual"` 유지
- NOW `50명 더 불러오기`: 라우터 렌더 없이 append-only 유지
