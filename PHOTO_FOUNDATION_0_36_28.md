# 0.36.28 · PHOTO FOUNDATION 1

## Scope
- Main COLUMN lower-card author row hotfix: ADMIN + representative badge remains on one line and the badge is 18px.
- First real-photo performance trial: HOME NOW top 10 only.
- No additional politician text/profile dataset was introduced in this phase.

## Photo pipeline
- Photo candidates were collected by the assistant, not manually entered by the operator.
- Identity verification uses politician-specific Commons categories / structured `depicts` plus original-source context.
- Sources intentionally vary: Korean public authorities, political-party Creative Commons channels, U.S. government public-domain photography, and reviewed/self-published Creative Commons material.
- Browser delivery uses Vercel native Image Optimization: allow-listed Wikimedia originals -> 96/160/384px variants -> WebP -> 30-day CDN cache.
- List photos are lazy/low-priority; a politician detail photo is eager/high-priority only after the user opens that detail page.
- Existing fixed avatar boxes are reused, so image arrival does not change layout dimensions.
- Face framing is normalized with per-person focal points + `object-fit: cover`.

## Trial batch
1. 김민석
2. 정청래
3. 장동혁
4. 송영길
5. 한동훈
6. 나경원
7. 박주민
8. 안철수
9. 전현희
10. 김병주

## Provenance
Every trial photo stores source URL, source page, attribution, license, license URL, and verification notes in `src/data/politician-photo-index.js`.

## Performance gate
Baseline before photos: TTFB 7.1ms / FCP 96ms / LCP 1016ms / CLS 0 / REQ 32 / TRANSFER 117.6KB.
After deployment, rerun JCV3 PERF on PC and mobile before expanding beyond the 10-person batch.
