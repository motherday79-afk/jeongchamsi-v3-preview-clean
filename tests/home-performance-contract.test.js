const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('home fast path reads compact public NOW snapshot instead of full current/history',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../server/v3/routes/home.js'),'utf8');
  assert.match(src,/nowDataPublicHome/);
  assert.doesNotMatch(src,/const DOMAINS = \[\.\.\.CONTENT_DOMAINS, "nowDataCurrent", "nowDataHistory"\]/);
  assert.match(src,/top10/);
});
