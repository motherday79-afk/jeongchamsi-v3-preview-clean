'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../server/v3/routes/admin/now-data.js'),'utf8');

test('non-blocking intelligence failure still persists a publishable preview instead of leaving HISTORY CONTEXT stuck',()=>{
  assert.match(src,/catch\(intelligenceError\)[\s\S]{0,700}await setJSON\(META,next\)/, 'finalize catch must persist preview meta');
  assert.match(src,/SNAPSHOT_VERIFY_COMPLETE_WITH_WARNINGS|SNAPSHOT_VERIFIED_SAVED/, 'finalize must close pipeline at verify');
});
