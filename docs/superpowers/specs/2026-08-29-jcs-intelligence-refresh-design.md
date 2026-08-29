# JCS Intelligence Refresh + Immutable Snapshot Design

## Goal
Turn the existing administrator **전체 데이터 새로고침** workflow into the data-production pipeline for JCS Political Intelligence without changing the public NOW/detail serving path.

## Refresh flow
1. Existing NAVER search/news batches run unchanged.
2. After the 542-person batch collection finishes, an admin-only external-evidence step fetches public pages from a small allowlist of institutions (initially 중앙선거여론조사심의위원회 and 한국갤럽).
3. External pages are parsed as evidence metadata and matched to roster people by exact politician name, with party context retained when available. Failure of an outside site is non-blocking and is recorded as a warning.
4. NOW finalize remains the public preview boundary, but it is also the JCS analytical observation boundary: when a full refresh reaches finalize, JCS computes Political Intelligence for all 542 people from the refreshed NOW rows + accumulated person trend + the exact external-evidence bundle collected for that draft.
5. The complete 542-person refresh-time JCS judgment is immediately gzip-compressed and stored as an immutable `jcv3:intelligence:v1:snapshot:<draftId>` record plus a time index, even before the operator chooses whether to publish the NOW preview.
6. Existing manual **현재 데이터로 게시** remains unchanged for public NOW. Publish retries snapshot capture only if finalize capture was unavailable; `SET NX` guarantees the original refresh-time judgment is never overwritten.
7. Admin politician detail reads the newest immutable JCS refresh snapshot first, so an admin can see the latest refresh-only Intelligence while public users remain on the last published NOW. If no JCS snapshot exists (legacy deployment), it falls back to live derivation.

## External evidence rules
- No new paid/external API key or environment variable.
- Only public HTML pages from explicit allowlisted institutions are fetched.
- No bypass of access controls, no CAPTCHA circumvention, no hidden/private endpoints.
- Each evidence record preserves institution, source type, source URL, observed date, JCS collection time, title, and person/party matching context.
- External data is evidence, not JCS output. Derived support/attrition/media values remain labeled `JCS EST.`.
- Evidence discovered later must never rewrite an older immutable JCS snapshot.

## Storage rules
- Draft evidence is transient under `nowDataExternalEvidence:<draftId>` and is removed after successful public publish, after the refresh-time JCS snapshot has already preserved the evidence actually used.
- Immutable JCS snapshots use a separate `jcv3:intelligence:v1:*` namespace.
- One compressed snapshot per completed refresh avoids 542 extra Redis keys and command amplification.
- Existing HISTORY V2 remains unchanged as the raw/current observation history; the JCS snapshot is the contemporaneous analytical judgment layer.

## Safety / regression boundaries
Do not modify these public serving contracts:
- `api/gateway.js`
- `server/v3/routes/now-data.js`
- `server/v3/lib/now-public-signals.js`
- `server/v3/lib/now-public-snapshot.js`
- `src/core/repository.js`

External collection and JCS snapshot failure must not corrupt or block the already-working public NOW publish; warnings are surfaced to admin metadata.
