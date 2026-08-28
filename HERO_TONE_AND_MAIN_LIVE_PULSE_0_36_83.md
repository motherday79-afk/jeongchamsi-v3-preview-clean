# 정참시 메인 히어로 색상 UX + LIVE PULSE 0.36.83

## 관리자 메인 타이틀
- 기존 색상 select 드롭다운 제거
- 헤드라인 기본색 / 강조 문구색 / 설명 문구색을 실제 색상칩으로 선택
- 선택 상태 테두리 + 체크 표시
- 강조할 문구 입력칸 추가
- 기본값: `움직이는 것`
- 강조 문구를 비우면 강조 없이 표시 가능
- 관리자 화면 안에 즉시 반영되는 LIVE 미리보기 추가
- 문구/색상 선택은 저장 전 미리보기만 변경, 저장 후 실제 메인 반영

## 메인 히어로
- `productAccentText`를 데이터 모델에 추가
- 더 이상 `움직이는 것`을 코드에 하드코딩해서 찾지 않음
- 관리자가 지정한 강조 문구를 실제 메인에서 강조
- 기존 기본 문구에서는 기존 줄바꿈 디자인 유지

## 메인 LIVE PULSE
적용 위치는 기존 3곳 그대로:
- NOW RANK
- 실시간 정치키워드
- 실시간 급상승 정치인

크기/정렬:
- PC: 16px / 중심점 8px
- 모바일(<=1024): 14px / 중심점 7px
- 제목 + 아이콘을 inline-flex / align-items:center로 중앙 정렬
- 기존 vertical-align 보정 제거
- CSS-only / 추가 네트워크 요청 0
- prefers-reduced-motion 유지

## 덮어쓰기 확인
- `.main-live-pulse` 본 규칙 1개
- `!important` 0개
- LIVE PULSE 실제 배치 3개

## 검증
- 관련 회귀 테스트 14/14 통과
- JS 문법 검사 통과
- 전체 테스트 136개 중 132개 통과
- 잔여 4개는 기존 테스트:
  - 0.36.61 구버전 cache/version marker
  - 0.36.62 구버전 cache/version marker
  - deep analysis progressive disclosure
  - politician intelligence detail UI
