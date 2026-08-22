# alpha6.0.36.9 — Citizen Choice + Generation President hotfix

## 적용 내용

### 1) 시민들의 선택 (CITIZENS’ CHOICE)
- 섹션 전체 배경색 제거 → 화이트 섹션으로 정리
- 기존 파스텔 배경색을 선택지 버튼으로 이동
- 텍스트 컬러 체계는 유지
- 선택지 hover 시만 한 단계 진해지도록 조정

### 2) 세대가 뽑은 대통령 (GENERATION CHOICE · MOCK VOTE)
- 레드 기반 톤 제거
- 상단 eyebrow를 정참시 민트로 변경
- 전체보기 버튼을 다른 게시판과 같은 회색 톤으로 복귀
- 왼쪽 안내 카드의 빨간 세로 라인 제거
- 데이터 포인트 컬러를 블루로 재정의
  - 세대 라벨
  - focus 카드
  - 결과 bar
  - 모의투표 참여 버튼

## 수정 파일
- index.html
- css/spectrum-palette.css
- src/version.js
