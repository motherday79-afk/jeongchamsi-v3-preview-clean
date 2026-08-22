const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('public NOW route prefers compact home/person snapshots',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../server/v3/routes/now-data.js'),'utf8');
  assert.match(src,/nowDataPublicHome/);
  assert.match(src,/nowDataPersonPublic:/);
});
