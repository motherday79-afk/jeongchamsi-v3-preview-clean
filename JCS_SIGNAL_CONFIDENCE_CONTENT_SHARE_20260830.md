# JCS SIGNAL CONFIDENCE + CONTENT SHARE HOTFIX · 2026-08-30

## Scope

This package is cumulative on top of `JCV3_JCS_INTELLIGENCE_VALIDITY_SPEED_HOTFIX_20260830`.
It includes both the previously approved signal-confidence wording correction and the new external content-share surface.

## 1. JCS Political Intelligence limited-signal wording

- Removes UI wording that can imply JCS has only just started collecting data.
- Keeps missing/low-confidence current inputs distinct from negative political signals.
- Admin UI uses `SIGNAL CONFIDENCE LIMITED` and `JCS HISTORY 정상 유지`.
- The engine diagnosis preserves the same HISTORY-first meaning.
- No valid HISTORY record is deleted.

## 2. Content sharing

Enabled on detail pages for:

- COLUMN
- 정참시 NEWS
- 정뮤니티
- IT'S ME

Buttons:

- 카카오톡
- Facebook
- Instagram
- URL 복사

Behavior:

- KakaoTalk / Instagram: uses the browser/device native share sheet when available; otherwise copies the exact content URL.
- Facebook: opens Facebook's URL sharer; if a popup cannot be opened, copies the exact content URL.
- URL 복사: copies the exact detail URL directly.
- No Kakao/Facebook/Instagram SDK is loaded.
- Share behavior JS is dynamically imported only after the user taps a share button.

## Performance / safety

- No new API route.
- No new DB / environment variable / API key.
- No external social SDK on page load.
- Public NOW/detail supply files and Home remain untouched.
