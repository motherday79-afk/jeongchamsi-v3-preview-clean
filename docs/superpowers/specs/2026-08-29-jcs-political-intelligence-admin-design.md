# JCS Political Intelligence Admin Design

## Goal
Turn the administrator-only politician detail view into a political intelligence console while leaving the public politician detail and NOW serving contracts unchanged.

## Product rule
- Public/non-admin detail stays as-is.
- Admin detail adds JCS POLITICAL INTELLIGENCE.
- No new external API integration is introduced in this patch.
- Existing NOW/Search/News/HISTORY signals are the always-available base.
- When reliable public external evidence is useful (polls, election studies, public institutions, reputable research), it may be researched outside the runtime and curated into a source-attributed evidence registry.
- External source facts and JCS estimates are never presented as the same thing.
- Admin-facing estimates are labeled `JCS EST.` with confidence and observed-history context.

## Evidence layers
1. SOURCE EVIDENCE: existing search/news/HISTORY plus curated public external evidence.
2. JCS DERIVED INTELLIGENCE: demographic support movement, core supporter attrition/inflow, support quality, media propagation, issue impact, risk/opportunity, resilience, attention-support gap.
3. HISTORY CONTEXT: immutable source observations are retained by HISTORY V2. Political Intelligence V1 is a versioned deterministic derivation so the same V1 logic can reproduce its interpretation from preserved inputs.

## External evidence policy
Curated evidence entries include person ID, observation date, JCS ingestion date, institution/source name, source URL, evidence type, and structured values. Evidence is filtered by both `observedAt` and `ingestedAt` against `asOf`, so data discovered later cannot rewrite an earlier JCS analysis.

The initial registry includes an example for `assembly-023` (이준석) using public Korea Gallup age-breakdown evidence. The architecture works without an external entry; missing external evidence lowers confidence rather than manufacturing a source.

## Admin modules
- JCS CURRENT DIAGNOSIS (현재 정치상태 진단)
- SUPPORT BASE MOVEMENT (연령별 지지 흐름): 2030 / 4050 / 60+ on -50..0..+50
- CORE SUPPORT DYNAMICS (강성지지층 변화): estimated attrition and new support inflow
- SUPPORT QUALITY (지지 기반의 질): CORE / ACTIVE / SOFT / FLOATING
- MEDIA PROPAGATION (미디어 확산 흐름): NEWS / YOUTUBE / SNS / COMMUNITY estimates, persistence, burst, breadth
- ISSUE IMPACT MAP (이슈별 영향): headline/event classification and estimated age/core impact
- RISK & OPPORTUNITY (위험·기회 신호)
- POLITICAL RESILIENCE (정치적 회복력)
- ATTENTION → SUPPORT GAP (관심 대비 지지전환)
- COMPETITOR FLOW (경쟁자 이동 추정), when related-person context exists
- HISTORY INTELLIGENCE (누적 분석 이력), preserving existing detail HISTORY display

## Data integrity
- Values are deterministic and bounded.
- Estimated demographic/support values are not described as measured polling unless backed by an explicit external evidence entry.
- Curated source names/URLs are shown separately under EVIDENCE BASE.
- No member identity is persisted or exposed.
- No new database or environment variable.

## Performance
- No new public API call.
- No new home-page work.
- Political Intelligence computation occurs only on the existing admin HISTORY person request.
- Public NOW route, public snapshot/signals and core repository stay unchanged.

## Copy change
Admin NOW refresh progress copy changes from Naver-branded Korean text to `JCS INTELLIGENT DATA COLLECTION IN PROGRESS`.
