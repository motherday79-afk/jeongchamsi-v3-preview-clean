# 0.36.54 · NOW CARD RESTORE + REAL TREND HISTORY + PC VIEW SWITCH

## NOW Rank
- Main TOP10 remains the combined national NOW ranking.
- Full-view category league logic remains intact: Assembly / Metropolitan / Basic local leaders.
- Category results return to the previous card-grid presentation instead of the 0.36.53 vertical row list.
- Each card shows category rank and global NOW rank without exposing raw NOW score.

## Politician detail header
- Right-side NOW block is split into two equal rank cells.
- Shows `전체 NOW` and the politician's own category rank.
- Removes the redundant `NOW 지수 · 게시시간` line.

## ANALYSIS TREND
- Official trend points are recorded only when the admin publishes a NOW snapshot.
- Each person's existing public record is batch-read, then a compact derived trend point is appended and kept for the latest 60 official publishes.
- Stored trend point contains only derived analysis numbers and ranks; raw search/news payloads are not duplicated.
- Existing pre-0.36.54 public person analysis can seed the first prior trend point on the first new publish.
- Existing `nowDataHistory` top30 snapshots are reused to show recoverable historical global NOW ranks immediately where available.
- Detail page now renders lightweight inline SVG trend lines for 종합 관심 / 대중 확산 / 활동성 / 이슈 온도 and rank-history sequences.

## Mobile PC view
- Restores `PC버전 보기` on touch/mobile devices.
- PC mode uses a 1280px viewport and persists through reload/navigation via `jcv3:view-mode`.
- In PC mode, the same control becomes `모바일버전 보기`.

## Performance
- No chart library added.
- No 542-person payload is sent to detail pages.
- Trend history is stored inside each existing compact per-person public record and written with batched Redis helpers only on publish.
