const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('gateway exposes exactly one History API path named admin/history',()=>{ const s=read('api/gateway.js'); assert.equal((s.match(/[\"']admin\/history[\"']\s*:/g)||[]).length,1); });
test('history route performs server-side requireAdmin authentication',()=>{ assert.match(read('server/v3/routes/admin/history.js'),/requireAdmin\(req\)/); });
test('history route is no-store',()=>{ assert.match(read('server/v3/routes/admin/history.js'),/Cache-Control[^\n]*no-store/); });
test('history route accepts GET overview and POST operations only',()=>{ const s=read('server/v3/routes/admin/history.js'); assert.match(s,/req\.method\s*===\s*['"]GET['"]/); assert.match(s,/req\.method\s*!==\s*['"]POST['"]/); });
test('history route supports paged backfill',()=>{ const s=read('server/v3/routes/admin/history.js'); assert.match(s,/action\s*===\s*['"]backfill['"]/); assert.match(s,/backfillLegacyPage/); });
test('history route supports admin political event append',()=>{ const s=read('server/v3/routes/admin/history.js'); assert.match(s,/action\s*===\s*['"]event-add['"]/); assert.match(s,/appendPoliticalEvent/); });
test('public home server route imports no History implementation',()=>{ assert.doesNotMatch(read('server/v3/routes/home.js'),/history-(?:core|store)|admin\/history/i); });
test('public NOW snapshot library imports no History implementation',()=>{ assert.doesNotMatch(read('server/v3/lib/now-public-snapshot.js'),/history-(?:core|store)|admin\/history/i); });
test('History ACTION storage implementation contains no member identifiers or IP fields',()=>{ const s=read('server/v3/lib/history-store.js'); assert.doesNotMatch(s,/userId|email|nickname|clientIp|ipAddress/i); });
test('History ACTION integration never passes the authenticated user object into history storage',()=>{ const s=read('server/v3/routes/action.js'); assert.doesNotMatch(s,/recordActionSignal\([^\n]*user\b/); });
