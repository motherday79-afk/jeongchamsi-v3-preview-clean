# alpha6.0.36.12 — Generation result block hotfix

## 적용 내용
- 세대뽑 카드의 결과 구조를 재정리
- 후보명 아래에 결과 bar와 수치 텍스트를 한 묶음으로 배치
- 결과 텍스트는 `00표 · 00% · 총00명` 형식
- 빈 카드도 동일한 구조를 유지하고, `첫 투표를 기다리는 중`을 bar 아래에 배치

## 수정 파일
- index.html
- src/views/home.js
- css/app.css
- src/version.js
