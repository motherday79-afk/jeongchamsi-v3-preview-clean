JCS Stage 1 - News Provider Cleanup
Date: 2026-09-01
Base: JCS_CURRENT_FULL_20260901 / jcs-emergency-repair

Scope only:
- NOW/news collection primary provider: Google News RSS
- Removed NOW/news runtime dependency on NAVER API Hub news credentials
- News ERROR/MISSING/ZERO -> immediate JCS modeled news
- Admin NOW status simplified to google-news-rss + JCS model
- NAVER Search Ads unchanged
- Politician photo Naver API Hub code unchanged
- Age/gender, HISTORY, badges, photos, CSS/UI unchanged

Delete from project when applying:
- server/v3/lib/naver-news.js

Verification:
- Targeted news/NOW tests: 30/30 pass
- Baseline full suite: 353 tests / 309 pass / 44 fail
- Changed full suite: 354 tests / 311 pass / 43 fail
- New regression failures: 0
- Active naver-news runtime refs in server/lib/src: 0
- NAVER_API_HUB news env refs in NOW/news pipeline: 0
