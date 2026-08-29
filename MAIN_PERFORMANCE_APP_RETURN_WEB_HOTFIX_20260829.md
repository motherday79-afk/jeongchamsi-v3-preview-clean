# JCV3 Main Performance Hotfix

Date: 2026-08-29

## Main performance
- Public Home no longer statically imports the HISTORY browser repository.
- Home HTML generation never waits for a HISTORY request.
- Admin Home renders first, then HISTORY V2 hydrates after DOM commit.
- The Home HISTORY request uses `?summary=home`, which omits the 542-person roster payload.
- Full HISTORY roster/person reads remain available only in Admin → HISTORY.

## Protected paths
This patch does not modify the live NOW/detail serving files:
- `api/gateway.js`
- `server/v3/routes/now-data.js`
- `server/v3/lib/now-public-signals.js`
- `server/v3/lib/now-public-snapshot.js`
- `src/core/repository.js`
