# JCS Political Decision System — Design Specification

Date: 2026-09-01  
Product: 정참시 V3 · 관리자 전용 정치 의사결정 시스템  
Status: Design approved in principle; implementation begins only from this written specification.

## 1. Product objective

정참시를 단순한 정치 데이터 대시보드가 아니라, 정치 컨설턴트가 한 정치인의 현재 상태를 설명하고, 변화 원인을 추적하고, 실행 우선순위를 제시하고, 실제 대응 이후 무엇이 달라졌는지까지 관리하는 **정치 의사결정 시스템**으로 확장한다.

최종 사용자 흐름은 다음 다섯 단계다.

1. **DATA — 분석 근거**: 어떤 데이터가 이 판단을 뒷받침하는가.
2. **INTELLIGENCE — 변화 원인**: 지금 무엇이 변했고, 어떤 사건·신호가 변화를 만들었는가.
3. **ADVISORY — 우선 대응**: 지금 가장 먼저 해야 할 일은 무엇이며, 성공 여부를 무엇으로 확인할 것인가.
4. **MANAGEMENT — 대응 이후 변화**: 실제 행동 이후 핵심 지표가 어떻게 움직였는가.
5. **CASE INTELLIGENCE — 축적된 정치 행동 기록**: 사건 → 판단 → 권고 → 행동 → 결과의 연결을 장기 자산으로 남긴다.

관리자 첫 화면의 핵심 문장은 항상 네 질문에 답해야 한다.

- 지금 무슨 일이 벌어지고 있는가.
- 왜 벌어졌는가.
- 무엇을 해야 하는가.
- 그래서 실제로 무엇이 달라졌는가.

## 2. Non-negotiable product rules

### 2.1 분석 근거를 스스로 과도하게 깎아내리지 않는다

현재 화면에 존재하는 `분석 신뢰도 30%`, `CONF 42%`처럼 사용자가 정확한 의미를 알기 어려운 숫자형 신뢰도 노출은 관리자 핵심 화면에서 제거한다.

내부 계산의 품질 점수는 판독 가능 여부와 정렬에 사용할 수 있지만, 사용자에게는 다음처럼 근거 상태를 명확하게 표시한다.

- **분석 근거 강함**: 현재 데이터 + HISTORY + 외부 공개 근거가 같은 방향을 지지함.
- **분석 근거 충분**: 현재 데이터와 HISTORY가 판단을 지지함.
- **근거 보강 중**: 일부 축의 관측이 부족해 해당 세부 판단만 보강 중임.

근거가 약한 부분을 강하다고 포장하지 않는다. 대신 전체 정참시 데이터 자체를 불필요하게 낮은 백분율로 표현하지 않는다.

### 2.2 모든 문장은 단정하고 명확하게 쓴다

설명은 쉬운 말투로 낮추지 않는다. 전문적인 관리자 보고서 문체를 유지한다.

허용되는 문장:
- `검색 관심과 뉴스 확산이 동시에 상승했습니다.`
- `20·30대 관심 하락이 가장 큰 위험 요인입니다.`
- `현재 상승 이슈를 정책 메시지와 연결해야 합니다.`

피해야 하는 문장:
- `이 지표를 통해 확인할 수 있습니다.`
- `관리자가 이해할 수 있게 정리했습니다.`
- `현재 상황이 어떤지 살펴볼 수 있습니다.`

### 2.3 사실, 추정, 권고를 구분한다

화면의 모든 핵심 결과는 다음 세 유형 중 하나로 분류한다.

- **관측**: 실제 검색·뉴스·HISTORY·공개 근거에서 직접 확인된 변화.
- **JCS 분석**: 관측 데이터를 정참시 계산 규칙으로 결합한 판단.
- **전략 권고**: 현재 판단을 바탕으로 한 실행 우선순위.

MANAGEMENT에서는 시간적 연관을 인과관계로 과장하지 않는다. `이 대응 때문에 +13`이 아니라 `대응 이후 정치 흐름 +13`으로 표기한다. 충분한 반복 사례가 축적됐을 때만 CASE INTELLIGENCE가 반복 패턴을 제시한다.

## 3. Existing architecture to preserve

현재 구조는 이미 중요한 기반을 갖추고 있다.

- HISTORY V2는 게시 시점의 NOW 원천·계산 결과를 immutable observation으로 저장한다.
- HISTORY V2는 정치 이벤트를 별도 이벤트 인덱스로 저장할 수 있다.
- Political Intelligence V1은 검색, 뉴스, HISTORY, 외부 공개 근거를 결합해 정치 흐름, 지지 기반, 미디어, 이슈, 위험·기회, 회복력 등을 계산한다.
- Political Intelligence snapshot은 게시/최종화 시점별로 저장된다.
- 관리자 상세 화면은 최신 Political Intelligence와 HISTORY를 결합해 렌더링한다.
- 관리자 비교 화면은 동일한 기준으로 2~5명을 비교한다.

이번 확장은 기존 HISTORY와 Political Intelligence snapshot을 사실 기록의 원본으로 유지한다. 같은 데이터를 새 저장소에 복제하지 않는다.

## 4. New decision architecture

새 계층은 네 개의 독립 모듈로 분리한다.

### 4.1 Decision Intelligence Engine

New server module: `server/v3/lib/decision-intelligence-v1.js`

책임:
- 현재 Political Intelligence와 HISTORY window를 입력받는다.
- 최근 7일/30일 핵심 변화량을 계산한다.
- 검색, 뉴스, 이슈, 지지 기반, 대중 확산, 경쟁자 변화 중 설명력이 큰 원인 후보를 추린다.
- 위험과 기회를 `영향도 / 방향 / 지속성 / 근거 상태`로 구조화한다.
- 실행 우선순위 최대 3개를 생성한다.
- 각 우선순위에 성공 확인 기준을 붙인다.

Output shape:

```js
{
  version: 'JCS_DECISION_INTELLIGENCE_V1',
  asOf,
  evidenceState: { level: 'STRONG|SUFFICIENT|BUILDING', label, basis: [] },
  currentState: { condition, conditionLabel, delta7d, delta30d },
  causeTrace: [
    { rank, type, title, observedChange, timeRange, evidence: [], direction, strength }
  ],
  risks: [
    { rank, title, impact, trajectory, persistenceDays, evidenceState, rationale }
  ],
  opportunities: [
    { rank, title, impact, trajectory, persistenceDays, evidenceState, rationale }
  ],
  priorities: [
    {
      rank,
      mode: 'DEFEND|EXPAND|CONVERT|WATCH',
      title,
      judgement,
      basis,
      direction,
      successCriteria: [
        { metric, targetDirection, description }
      ]
    }
  ]
}
```

이 엔진은 초기 버전에서 deterministic rule 기반으로 구현한다. 현재 데이터가 말하지 않은 정치 사건이나 인과관계를 생성하지 않는다.

### 4.2 Decision Case Store

New server module: `server/v3/lib/decision-case-store.js`

목적은 542명 전체의 데이터를 다시 복사하는 것이 아니다. 실제 관리·컨설팅 대상으로 선택된 정치인의 **의사결정 기록**만 저장한다.

Case는 한 시점의 판단을 고정한다.

```js
{
  caseId,
  personId,
  createdAt,
  status: 'OPEN|MONITORING|CLOSED',
  sourceDraftId,
  sourcePublishedAt,
  decisionVersion,
  headline,
  currentState,
  causeTraceTop3,
  risksTop3,
  opportunitiesTop3,
  prioritiesTop3,
  evidenceState,
  note
}
```

Case는 원천 데이터를 복제하지 않고 `sourceDraftId`와 시점만 참조한다. 당시 Political Intelligence snapshot과 HISTORY를 다시 조회할 수 있어야 한다.

Redis keys:

- `jcv3:decision:v1:case:<caseId>`
- `jcv3:decision:v1:cases:<personId>` sorted set
- `jcv3:decision:v1:cases` global sorted set for admin overview

### 4.3 Action Log

같은 store에서 case에 연결된 실제 대응을 append-only로 기록한다.

```js
{
  actionId,
  caseId,
  personId,
  occurredAt,
  createdAt,
  type: 'MESSAGE|MEDIA|POLICY|FIELD|ISSUE_RESPONSE|CAMPAIGN|OTHER',
  title,
  note,
  linkedPriorityRank,
  baseline: {
    publishedAt,
    condition,
    overallInterest,
    highEngagement,
    massExpansion,
    issueHeat,
    mediaSpread,
    globalRank
  }
}
```

행동 등록 순간 가장 가까운 최신 HISTORY observation을 baseline으로 고정한다.

Redis keys:

- `jcv3:decision:v1:action:<actionId>`
- `jcv3:decision:v1:actions:<personId>` sorted set
- `jcv3:decision:v1:actions:case:<caseId>` sorted set

### 4.4 Outcome Evaluator

New server module: `server/v3/lib/decision-outcome-v1.js`

Action의 baseline과 이후 HISTORY observation을 비교한다.

기본 판독 창:
- 최근 확보된 observation
- 72시간 이후 첫 observation
- 7일 이후 첫 observation
- 14일 이후 첫 observation

관측이 없으면 억지로 결과를 만들지 않고 `후속 관측 대기`라고 표시한다.

Output:

```js
{
  actionId,
  evaluatedAt,
  status: 'WAITING|EARLY|MEASURED',
  latestWindow,
  change: {
    condition,
    overallInterest,
    highEngagement,
    massExpansion,
    issueHeat,
    mediaSpread,
    globalRank
  },
  assessment: 'POSITIVE|MIXED|NEGATIVE|NEUTRAL|WAITING',
  headline,
  supportingSignals: [],
  caution: '대응 이후 관측 변화이며 단일 행동의 인과효과로 단정하지 않습니다.'
}
```

## 5. Cause Trace design

Cause Trace는 이 시스템의 핵심 차별점이다.

원인 후보는 다음 근거만 사용한다.

1. HISTORY score delta
2. 검색 월간/모바일/PC 변화
3. 뉴스 6h/24h/7d 변화와 headline 발생 시점
4. Political Event V2
5. Political Intelligence issue impact
6. 경쟁자 인접도와 비교 지표 변화
7. 외부 공개 근거가 존재할 경우 해당 근거

원인 후보 예시:

`8월 27일 ○○ 이슈 이후 뉴스 확산이 먼저 상승했고, 다음 관측에서 검색 관심과 정치 흐름이 동반 상승했습니다.`

표시 규칙:
- 사건이 명시적으로 연결되지 않으면 `주요 원인 후보`라고 쓴다.
- 시간 순서가 확인되면 `선행 신호`를 표시한다.
- 근거가 두 축 이상 일치하면 `분석 근거 강함`으로 분류한다.
- 단일 신호뿐이면 `분석 근거 충분` 또는 `근거 보강 중`으로 제한한다.

## 6. Advisory design

우선 대응은 최대 3개다. 추천을 나열하지 않는다.

각 Priority는 반드시 다음을 포함한다.

1. **판단**: 무엇이 문제 또는 기회인가.
2. **근거**: 어떤 데이터 때문에 그렇게 판단했는가.
3. **대응 방향**: 지금 무엇을 해야 하는가.
4. **확인 기준**: 무엇이 바뀌면 대응이 작동하고 있다고 볼 것인가.

Priority mode:
- `DEFEND`: 위험 확대 방어
- `EXPAND`: 강한 흐름 확대
- `CONVERT`: 관심을 지지 기반 또는 대중 확산으로 연결
- `WATCH`: 변곡점 감시

금지:
- 구체적인 불법·기만적 캠페인 행위 지시
- 데이터에 없는 개인 표적화 또는 민감정보 추정
- 결과가 보장된 것처럼 표현

## 7. War Room UI

관리자 정치인 상세 리포트의 첫 화면을 `JCS POLITICAL WAR ROOM`으로 재구성한다.

### 7.1 First screen

한 화면에 다음만 노출한다.

- 정치 흐름 지수 및 7일 변화
- 분석 근거 상태
- 변화 원인 1위
- 핵심 위험 1위
- 핵심 기회 1위
- 우선 대응 1~3
- 마지막 등록 행동과 대응 이후 변화
- 열린 CASE 수

예시:

`정치 흐름 +37 · 강한 상승 · 최근 7일 +11`

`주요 원인 · 뉴스 확산과 검색 관심 동반 상승`

`핵심 위험 · 20·30대 관심 하락이 2주째 지속`

`핵심 기회 · 경쟁자 대비 대중 확산 우위 확대`

`우선 대응 01 · 현재 상승 이슈를 정책 메시지와 연결`

### 7.2 Deep sections

War Room 아래는 다음 순서로 배치한다.

1. `변화 원인` — Cause Trace
2. `위험·기회` — severity / trajectory / persistence
3. `우선 대응` — Priority Action Plan
4. `행동 기록` — Action Log
5. `대응 이후 변화` — Outcome
6. `CASE HISTORY` — 과거 case timeline
7. 기존 상세 인텔리전스 — 세대·성별, 지지 기반, 미디어, 이슈, 분석 근거

기존 리포트의 좋은 시각화는 제거하지 않는다. 첫 화면의 의사결정 흐름 아래로 재배치한다.

### 7.3 Typography

- 일반 본문 14px 이상
- 보조 설명 13px 이상
- 상태 라벨 12px 이상
- 핵심 수치 22px 이상
- 표 안의 데이터를 공간 부족 때문에 10px 이하로 축소하지 않는다.

## 8. Compare integration

기존 `JCS DECISION ROOM`에 새로운 Decision Intelligence를 연결한다.

추가 영역:

### 8.1 Comparative Decision Brief

각 정치인에 대해 다음 네 줄을 동일한 구조로 표시한다.

- 현재 위치
- 가장 큰 우위
- 가장 큰 위험
- 최우선 대응

### 8.2 Competitive Cause Trace

두 명 이상에서 같은 기간에 움직인 지표와 서로 다르게 움직인 지표를 분리한다.

예:
- `공통 상승 · 뉴스 노출`
- `김A 우위 확대 · 대중 확산`
- `김B 위험 확대 · 20·30대 관심`

### 8.3 Position Map

현재 승인된 정치 포지션 맵 구조를 유지한다. 새 Decision data는 맵 아래 판독 요약과 우선 대응 비교에만 연결한다.

## 9. Admin API

New route: `server/v3/routes/admin/decision.js`

모든 endpoint는 `requireAdmin()`을 통과해야 한다.

### GET

`GET /api/v3/admin/decision?personId=<id>&range=30`

Returns:
- latest Decision Intelligence
- cases
- actions
- evaluated outcomes

### POST actions

- `case-create`
- `case-close`
- `action-add`
- `action-note-update`

Case 생성 시 서버가 최신 Political Intelligence와 HISTORY를 직접 읽어 snapshot reference를 고정한다. 클라이언트가 임의 수치를 보내서 저장하지 못하게 한다.

Action baseline도 서버가 HISTORY에서 직접 고정한다.

Gateway는 기존 `admin/history`와 동일한 관리자 인증 원칙을 따른다.

## 10. Client repository and events

New client module: `src/core/decision-repository.js`

Exports:
- `getAdminDecisionPerson(id, range)`
- `createAdminDecisionCase(id, note)`
- `closeAdminDecisionCase(caseId)`
- `addAdminDecisionAction(payload)`
- `updateAdminDecisionActionNote(actionId, note)`

`src/app.js`는 다음 data attributes를 처리한다.

- `[data-decision-case-create]`
- `[data-decision-case-close]`
- `[data-decision-action-add]`
- `[data-decision-action-form]`

페이지 전체 새로고침보다 해당 관리자 리포트 섹션만 다시 로드하는 방식을 우선한다.

## 11. Storage and performance strategy

### 11.1 No duplicate bulk snapshot

새 Decision system은 542명의 HISTORY나 Political Intelligence를 다시 저장하지 않는다.

- 분석: 기존 snapshot에서 on-demand derive
- CASE: 선택된 정치인만 compact snapshot reference 저장
- ACTION: 실제 행동이 등록된 경우에만 저장
- OUTCOME: 기본적으로 read-time derive; 별도 중복 저장하지 않음

### 11.2 Read limits

- 상세 화면 기본 range 30일
- Cause Trace는 30일 데이터를 우선 사용
- CASE HISTORY는 최신 20개부터 로드
- ACTION HISTORY는 최신 40개부터 로드
- 장기 분석은 필요할 때 `90/365/all`로 확장

### 11.3 Non-blocking publish

NOW finalize/publish의 기존 성공 경로에 Decision case/action 처리를 넣지 않는다.

Decision Intelligence는 관리자 read 시 파생하거나, 필요 시 별도 compact cache를 사용한다. NOW 게시가 Decision 시스템 문제 때문에 실패해서는 안 된다.

## 12. Evidence state replacement

전체 관리자 인텔리전스의 숫자형 `분석 신뢰도`는 다음 방향으로 변경한다.

### Executive level

- `분석 근거 강함`
- `분석 근거 충분`
- `근거 보강 중`

### Cohort level

현재 `신뢰도 42%`, `CONF 42%` 표시를 제거하고:

- `유효 신호`
- `보강 중`
- `판독 대기`

로 표시한다.

내부 confidence number는 기존 계산 호환성과 gating을 위해 유지할 수 있다. 화면에서 숫자로 노출하지 않는다.

## 13. Case Intelligence long-term layer

CASE가 쌓이면 정치인별 반복 패턴을 계산한다.

초기에는 3개 이상의 유사 case가 있어야 반복 패턴을 표시한다.

예시:

- `이슈 급등 뒤 검색 관심 최고점까지 평균 2.3일`
- `미디어 확산 단독 상승은 평균 4일 이내 둔화`
- `지역 일정이 결합된 3개 CASE에서 대중 확산이 더 오래 유지됨`

표시 제목은 `축적 패턴`으로 한다.

인과관계가 아니라 반복된 관측 패턴임을 명확히 한다.

## 14. Error handling

- HISTORY unavailable: 현재 Political Intelligence는 유지하고 `HISTORY 연결 확인 필요`만 표시.
- External evidence unavailable: JCS 현재 관측 + HISTORY로 Decision derive를 계속한다.
- No action baseline: action 저장을 거부하고 `기준 관측 필요`를 반환한다.
- No post-action observation: Outcome은 `후속 관측 대기`.
- Corrupt case/action row: 해당 row만 제외하고 전체 리포트는 계속 렌더링.
- Redis storage error: 관리자 action write만 실패 처리; 공개 화면/NOW publish에는 영향 없음.

## 15. Testing strategy

TDD로 구현한다.

### Unit tests

1. evidence state가 숫자 백분율 대신 올바른 label을 반환한다.
2. Cause Trace가 HISTORY delta와 headline/event 시간 순서를 올바르게 정렬한다.
3. Priority는 최대 3개이며 각각 판단/근거/대응/확인 기준을 가진다.
4. Outcome은 baseline 이전 관측을 사용하지 않는다.
5. Outcome은 후속 관측이 없으면 WAITING을 반환한다.
6. Case가 sourceDraftId를 고정하고 bulk data를 복제하지 않는다.

### Store tests

1. Case create is admin/server-derived.
2. Action baseline is server-derived.
3. Case/action index ordering.
4. Duplicate IDs are rejected.
5. Storage failures do not mutate partial indexes.

### Route/security tests

1. `/api/v3/admin/decision` requires admin.
2. GET does not expose data publicly.
3. POST ignores client-supplied baseline metrics.
4. Unknown actions return 400.

### UI contract tests

1. WAR ROOM exists only for admin.
2. No executive `분석 신뢰도 N%` string remains.
3. No cohort `CONF N%` string remains.
4. Cause Trace, Priority Action, Action Log, Outcome, Case History render.
5. Existing position map remains intact.
6. Minimum typography rules remain intact.

### Regression

- NOW Rank calculation unchanged.
- Refresh/finalize/publish unchanged.
- HISTORY V2 snapshots unchanged.
- Public home/detail does not import admin decision system.
- Existing compare 2~5 selection remains.
- Redis/storage rootfix areas not refactored unnecessarily.

## 16. Implementation boundary

This version does **not** require:

- 새로운 외부 정치 데이터 공급자 계약
- 새로운 유권자 개인정보 데이터베이스
- 자동 문자/푸시 캠페인 실행
- 개인별 민감 정치성향 추정
- 선거 결과를 확률로 단정하는 예측 엔진

이 버전의 목표는 현재 정참시가 이미 가진 데이터를 실제 컨설팅 의사결정 과정으로 연결하는 것이다.

## 17. Definition of done

다음 시나리오가 하나의 관리자 화면에서 연결되면 완료다.

1. 정치인 상세를 연다.
2. `현재 정치 흐름 / 최근 변화 / 주요 원인 / 핵심 위험 / 핵심 기회 / 우선 대응`을 첫 화면에서 읽는다.
3. `왜?`를 누르면 Cause Trace와 근거를 확인한다.
4. 현재 판단을 CASE로 저장한다.
5. 실제 행동을 Action Log에 기록한다.
6. 이후 HISTORY가 쌓이면 `대응 이후 변화`가 자동 계산된다.
7. 과거 CASE를 다시 열어 당시 판단과 실제 이후 변화를 비교한다.
8. 여러 CASE가 쌓이면 반복 패턴이 `축적 패턴`으로 표시된다.
9. 비교하기에서는 각 인물의 현재 위치·우위·위험·우선 대응을 같은 기준으로 비교한다.

이 상태가 되면 정참시는 `데이터를 보여주는 서비스`가 아니라 `판단을 기록하고 검증하는 정치 의사결정 시스템`으로 동작한다.
