# 정참시 v3 0.36.47 · NAVIGATION MODULE HOTFIX

## 증상
메인에서 다음 전체보기/이동 버튼이 공통으로 작동하지 않음.
- NOW Rank
- IT'S ME
- CITIZENS' CHOICE
- 전국평가제
- 세대의 선택, 대통령

## 원인
`src/views/features.js` 마지막에 `export { trendingItems };`가 남아 있었지만 0.36.45 실시간 사이드바 개편 과정에서 `trendingItems` 함수 자체는 제거되어 있었다.
브라우저가 기능 페이지 진입 시 `features.js`를 ES module로 import하면서 다음 오류로 전체 모듈 로드가 중단됨.

`SyntaxError: Export 'trendingItems' is not defined in module`

홈은 `home.js`만으로 렌더 가능해서 정상처럼 보였지만, 위 기능 페이지들은 모두 `features.js`를 공유하므로 동시에 이동 불가 상태가 됨.

## 수정
- 존재하지 않는 `trendingItems` export 제거
- 기능 모듈 실제 ES module import 회귀 테스트 추가
- 버전 0.36.47 및 캐시 버전 갱신
- 0.36.46 PERFORMANCE RECOVERY 구조는 그대로 유지
