# JCS Aggressive Intelligence Engine Design

## Goal
정참시의 기존 실제 수집 데이터와 HISTORY를 유지하면서, 불확실성을 이유로 숫자를 숨기거나 중앙값으로 과도하게 수렴시키지 않는 JCS 독립 해석 엔진으로 전환한다.

## Fixed rules
- 틀릴 수 있다. 정답 모사보다 JCS 독립 해석을 우선한다.
- 근거 없는 임의 숫자는 만들지 않는다.
- 분석 입력이 희박해도 실제 NOW 검색·뉴스·HISTORY·공개근거를 조합해 JCS estimate를 산출한다.
- AGE/GENDER는 12셀을 모두 숫자로 산출한다.
- 서로 독립적인 방향성 근거가 일치하면 결론 강도를 더 허용한다.
- 기존 보수적 R4 cohort snapshot index를 재사용하지 않는다.
- 전체 새로고침 로드바는 실제 확장 파이프라인 단계에 연결한다.

## Refresh pipeline
1. NOW search + news collection
2. Public research + registered poll evidence
3. Official election + population + AGE×GENDER baseline
4. Party/region/competitor market context
5. JCS HISTORY context
6. AGE/GENDER cohort analysis
7. Aggressive JCS Intelligence
8. Snapshot verify + save

## Compatibility
PUBLIC/ADMIN compare 분리, 관리자 2~5인 비교, 정보르기니 prefetch/cache 구조는 직전 통합 패치를 그대로 유지한다.
