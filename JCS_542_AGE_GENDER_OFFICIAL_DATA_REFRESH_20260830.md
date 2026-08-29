# JCS 542 AGE & GENDER OFFICIAL DATA REFRESH PATCH — 2026-08-30

## Goal
관리자 `전체 데이터 새로고침` 흐름에서 외부 공개 공식 파일을 직접 확보하고 JCS 데이터로 정규화한 뒤, 542명 전체의 AGE × GENDER V2 baseline/intelligence snapshot을 생성한다.

## Runtime source layer
- 행정안전부 지역별(법정동) 성별 연령별 주민등록 인구수 — data.go.kr `15099158`
- 중앙선거관리위원회 제22대 국회의원선거 지역구 개표결과 — data.go.kr `15025527`
- 중앙선거관리위원회 제22대 비례대표국회의원선거 개표결과 — data.go.kr `15144273` (optional; 실패 시 지역구 기반 structural proxy 계속 사용)
- 기존 JCS EXTERNAL EVIDENCE 수집(Gallup/NESDC 등)은 기존 단계 그대로 유지

파일데이터는 별도 API key 없이 data.go.kr 공개 파일 다운로드 흐름으로 수집한다. 수집 파일의 SHA-256/기관/파일명/수집시점을 manifest에 보존한다.

## Refresh flow
NOW batches → EXTERNAL EVIDENCE → OFFICIAL PUBLIC AGE/GENDER BASELINE → Redis trusted baseline → 542-person V2 analysis → immutable V2 snapshot.

## 542 coverage
- DIRECT_CANDIDATE: 본인 지역구 공식 개표 + 법정동 AGE×GENDER 인구
- PARTY_PROXY: 공식 비례대표 정당 분포 또는 충분한 동일정당 direct reference
- REGIONAL_PARTY_PROXY: 지역/전국 공식 structural reference
- 외부 공식 baseline + 현재 6개 JCS analysis axis가 충분하면 raw search/news readiness가 별도 READY가 아니어도 cohort 값을 낼 수 있도록 confidence 중복 페널티를 제거했다.
- weak direct fit은 강한 party/regional official profile로 shrinkage 보정한다.

## Fail-safe
필수 공개자료 다운로드/파싱이 실패하고 이전 trusted baseline도 없으면 refresh가 명시적으로 실패한다. 가짜 542 값으로 성공 처리하지 않는다. 이전 trusted baseline이 있으면 그것을 재사용한다.

## Cache
`index.html` app marker와 모든 `admin.js` dynamic import marker를 cache-bust 했다.

## Public NOW protection
공개 NOW 공급/홈 경로는 변경하지 않았다.
