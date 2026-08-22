# 0.36.27 PERFORMANCE AUDIT + SAFE CLEANUP

## Goal
PC·모바일의 현재 기능과 레이아웃을 유지하면서 실제 런타임에서 중복 로드·중복 요청·불필요한 파싱/렌더 비용을 줄인다.

## Protected behavior
- 인증 singleton (`core/user.js`, `core/repository.js`) 단일 경로
- 브라우저 Back/Forward 정확한 스크롤 복원
- NOW Rank `50명 더 불러오기` append-only / 현재 위치 유지
- 대표배지·전시배지·PARTNER 권한
- PC 레이아웃
- 0.36.26 MOBILE FOUNDATION 반응형
- 관리자 편집 기능

## Audit findings
1. `src` 내부에 같은 JS 파일을 서로 다른 `?v=` 주소로 부르는 참조가 62개 남아 있었다. SPA 세션에서 동일 물리 파일이 별도 ES module 인스턴스로 로드될 수 있는 구조였다.
2. LIVE BAR가 메인에서 이미 받은 회원수를 다시 `/api/v3/home` 전체 스냅샷으로 요청했고, 단독페이지에서도 회원수 하나 때문에 12개 콘텐츠 도메인을 읽었다.
3. 로그인/세션 초기화에서 사용자 저장소를 중복 읽고 `/user/activity` 왕복 요청을 추가로 했다.
4. 성능 모니터가 일반 사용자에게도 항상 로드되어 PerformanceObserver와 타이머를 설치했다.
5. 로그인·MY·관리자·간단한 기능 페이지에서도 약 91KB의 전체 정치인 상세 Seed가 정적 의존성으로 따라왔다.
6. 메인은 세대뽑/최근본 이름 표시만을 위해 전체 정치인 상세 Seed를 필요 시 로드했다.
7. 메인 작성자 배지 조회가 실제 화면에 보이지 않는 게시물까지 포함해 최대 120명 작성자를 조회할 수 있었다.
8. LIKE/설문/세대뽑/전국평가 후 서버 응답에 최신 activity가 있는데도 `/user/activity`를 다시 요청했다.
9. `home.js`에 사용되지 않는 재귀형 초기 홈 스냅샷 헬퍼가 남아 있었다.
10. CSS에는 누적 override가 상당하다. 현재 기준 `!important`는 pages 86, spectrum 297, mobile 451이며 중복 selector 이름도 485개가 확인됐다. 다만 이번 SAFE CLEANUP에서는 디자인 회귀 위험 때문에 공격적으로 삭제하지 않았다.

## Applied cleanup
- 모든 내부 JS import의 버전 query 제거. `/src/*`는 Vercel에서 `no-store`라 canonical URL 하나로 통일한다.
- `/api/v3/livebar` 경량 endpoint 추가: brand LIVE BAR 설정 + 회원수만 조회.
- 메인 header에 회원수가 이미 있으면 LIVE BAR 추가 네트워크 요청 0회.
- 홈 스냅샷 10초 메모리 캐시 및 변경 시 무효화.
- 작성자 공개 프로필 15초 ID별 메모리 캐시, 필요한 ID만 재요청.
- 메인 작성자 프로필 요청 범위를 실제 노출되는 COLUMN/정뮤니티 작성자로 제한.
- session GET/POST 응답에 activity 포함. GET은 사용자와 activity 저장소 읽기를 병렬화.
- 액션 응답의 activity를 클라이언트 상태에 바로 적용해 후속 `/user/activity` 요청 제거.
- `performance.js`는 `?perf`일 때만 동적 로드.
- `person-provider.js` 정적 로드를 USER/ADMIN/FEATURES 기본 경로에서 제거하고 필요한 화면에서만 동적 로드.
- 메인·MY용 `person-lite.js` 추가: 상세 Seed 91KB 대신 약 31KB 경량 identity index 사용.
- 관리자 인물관리의 숫자/상태 확인은 91KB provider 대신 250B `person-meta.js` 사용.
- 사용되지 않는 재귀형 홈 스냅샷 헬퍼 제거.
- desktop에서 mobile stylesheet를 render-blocking 대상으로 사용하지 않도록 media 조건 지정.

## Measured static eager dependency graph
Uncompressed source bytes, static import graph 기준:

| Entry | 0.36.26 | 0.36.27 | Change |
|---|---:|---:|---:|
| app | 60,290 B / 5 files | 57,980 B / 4 files | -2,310 B |
| user | 163,834 B / 10 files | 62,000 B / 7 files | -101,834 B |
| admin | 182,561 B / 10 files | 83,819 B / 7 files | -98,742 B |
| features | 196,571 B / 11 files | 101,571 B / 9 files | -95,000 B |

Home 기본 static graph는 repository cache 로직 때문에 약 1KB 증가했지만, 사람 lookup이 필요한 경우 추가로 읽던 `person-provider.js` 91,371 B를 `person-lite.js` 31,440 B로 교체해 해당 deferred payload를 약 59.9KB 줄였다.

## QA
- `src/server/lib/api` 전체 JavaScript `node --check`
- 상대 import/require 경로 108개 존재 확인
- 내부 `.js?v=` 참조 0개
- CSS brace 구조 검사
- users count/select mock test
- session + activity mock test
- LIVE BAR endpoint mock test
- person-lite 528개 행 데이터 parity test
- ZIP `unzip -t`

## Intentionally deferred
- CSS selector 대규모 병합/삭제: 시각적 회귀 위험이 커서 별도 VISUAL CSS CONSOLIDATION 단계로 분리
- 게시판 가상화/페이지네이션: 데이터량이 커졌을 때 별도 UX 승인 후 진행
- 이미지 포맷/서버 변환 파이프라인 변경: 현재 업로드 기능과 자산 호환성 보호
