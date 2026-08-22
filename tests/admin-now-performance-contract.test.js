const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('admin NOW status uses lightweight batch statuses and split ranked snapshot',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../server/v3/routes/admin/now-data.js'),'utf8');
  assert.match(src,/nowDataBatchStatus:/);
  assert.match(src,/nowDataDraftRanked:/);
  assert.match(src,/nowDataPublicAdmin/);
  assert.doesNotMatch(src,/batches=await loadBatches\(meta\);\n\s*const configured=configState\(\); return res\.status\(200\)/);
});
