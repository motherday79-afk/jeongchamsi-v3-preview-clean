const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('admin HISTORY route is server-authenticated and wired to V2 store',()=>{
  const s=read('server/v3/routes/admin/history.js');
  assert.match(s,/requireAdmin\(req\)/);
  assert.match(s,/history-v2-store/);
  assert.match(s,/historyOverviewV2/);
  assert.match(s,/readPersonHistoryV2/);
});

test('admin HISTORY supports capture-current without external refresh',()=>{
  const s=read('server/v3/routes/admin/history.js');
  assert.match(s,/action\s*===\s*['"]capture-current['"]/);
  assert.match(s,/captureCurrentSnapshot\(\)/);
});

test('admin HISTORY backfill action uses V2 partial migration',()=>{
  const s=read('server/v3/routes/admin/history.js');
  assert.match(s,/backfillLegacyPageV2/);
});

test('NOW publish writes live serving stores with batched MSET before attempting V2 HISTORY capture',()=>{
  const s=read('server/v3/routes/admin/now-data.js');
  const liveWrite=s.indexOf('await msetJSON([');
  const currentEntry=s.indexOf('[CURRENT,current]');
  const v2Capture=s.indexOf('await recordPublishedSnapshotV2');
  assert.ok(liveWrite>=0,'batched live write must exist');
  assert.ok(currentEntry>liveWrite,'CURRENT must be included in the batched live write');
  assert.ok(v2Capture>currentEntry,'V2 capture must occur after live serving data is stored');
});

test('NOW publish catches V2 HISTORY failure instead of failing public publication',()=>{
  const s=read('server/v3/routes/admin/now-data.js');
  assert.match(s,/try\s*\{[^}]*recordPublishedSnapshotV2[\s\S]*?catch/);
  assert.match(s,/historyWarnings/);
});
