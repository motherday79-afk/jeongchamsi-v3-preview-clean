# 0.36.57 · BADGE CENTER RECOVERY + CITIZEN ACHIEVEMENT CELEBRATION

## Badge Center recovery
- Fixed the `BADGE_CENTER_FAILED` root cause in `computeBadgeMetrics`.
- The engine calculated `likedGiven` but returned an undefined `likesGiven` variable, causing the admin-wide badge calculation to throw a `ReferenceError`.
- Badge Center can calculate holder counts again without changing existing badge rules.

## Main achievement celebration
- Adds a centered celebration slot between the live member count and the support/action area.
- Message format: `닉네임님께서 [배지명] 배지를 획득하셨습니다.`
- Recent messages rotate automatically when more than one exists.
- Historical achievements are not flooded into the feed after deployment: the first badge-status evaluation establishes a baseline, and only later newly recognized achievements can create celebration events.
- Celebration feed keeps only compact public fields: nickname, badge key/name, timestamp. No private member fields are exposed.

## Admin control
- Badge Center now includes `메인 축하 노출` controls.
- Only GOLD / PLATINUM / BLACK achievement badges are eligible; `운영자` is excluded from public celebration selection.
- Admin can choose exactly which eligible badges produce main celebration messages.
- Default selection favors higher-effort GOLD badges, all five expansion PLATINUM badges, `정참시장`, and `미카엘`.

## Performance
- No badge-wide calculation is added to ordinary home rendering or common user actions.
- New-achievement detection occurs on the existing badge-status surface, preserving the lightweight general navigation path.
- Home reads the compact recent celebration feed in the existing Redis multi-get.
