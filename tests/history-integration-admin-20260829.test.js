const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('legacy History V1 remains available while formal NOW publish capture has moved to V2',()=>{ const now=read('server/v3/routes/admin/now-data.js'),action=read('server/v3/routes/action.js'); assert.doesNotMatch(now,/await recordPublishedSnapshot\(current\)/); assert.match(now,/recordPublishedSnapshotV2/); assert.match(action,/history-store/); assert.match(action,/recordActionSignal/); });
test('redis helper provides raw MGET and true pipeline operations without new environment variables',()=>{ const s=read('lib/v3/redis.js'); assert.match(s,/async function mgetRawJSON/); assert.match(s,/async function pipeline/); assert.match(s,/\/pipeline/); assert.doesNotMatch(s,/HISTORY_[A-Z_]+|DATABASE_URL/); });
test('redis helper restores msetJSON used by NOW publication batching',()=>{ const s=read('lib/v3/redis.js'); assert.match(s,/async function msetJSON/); assert.match(s,/module\.exports[^\n]*msetJSON/); });
test('admin navigation includes a History control tab and cache-busts the changed admin module',()=>{ assert.match(read('src/views/admin.js'),/\["history",\s*"HISTORY"\]/); assert.match(read('src/app.js'),/views\/admin\.js\?v=history-v1/); assert.match(read('index.html'),/history-v1/); });
test('admin History panel displays scope and three algorithm versions',()=>{ const s=read('src/views/admin.js'); assert.match(s,/INTERNAL_ADMIN/); assert.match(s,/JCS_NOW_V1/); assert.match(s,/JCS_HISTORY_PIPELINE_V1/); assert.match(s,/JCS_DERIVED_V1/); });
test('admin History backfill automatically continues page by page until done',()=>{ const s=read('src/views/admin.js'); assert.match(s,/runHistoryBackfill/); assert.match(s,/while\s*\(!done\)/); assert.match(s,/cursor\s*=\s*Number\(result\.nextCursor/); });
test('History styles add no important declarations',()=>{ const css=read('css/pages.css'); assert.equal((css.match(/!important/g)||[]).length,0); });
