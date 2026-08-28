const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('golden gateway preserves every route that regressed during HISTORY V1 packaging',()=>{
  const s=read('api/gateway.js');
  for(const route of ['"now-data"','"admin/dashboard"','"admin/badges"','"user/badges"','"admin/history"'])assert.match(s,new RegExp(route.replace('/','\\/')));
});

test('public politician detail still loads existing NOW person data through repository',()=>{
  const view=read('src/views/people.js');
  const repo=read('src/core/repository.js');
  assert.match(view,/getNowPerson\(p\.id\)/);
  assert.match(repo,/\/api\/v3\/now-data/);
});

test('public detail core indicators remain mapped to existing intelligence score keys',()=>{
  const s=read('src/views/people.js');
  for(const key of ['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'])assert.match(s,new RegExp(`scores\\.${key}`));
});

test('public NOW route keeps compatibility migration from current into person public view',()=>{
  const s=read('server/v3/routes/now-data.js');
  assert.match(s,/getJSON\('nowDataCurrent'\)/);
  assert.match(s,/derivePersonView\(current,history,id\)/);
  assert.match(s,/nowDataPersonPublic:/);
});

test('golden roster keeps all three live politician categories at 542 total',()=>{
  const {allPeople}=require('../server/v3/lib/politician-live-roster');
  const rows=allPeople();
  const counts=rows.reduce((out,row)=>{out[row.type]=(out[row.type]||0)+1;return out;},{});
  assert.equal(rows.length,542);
  assert.deepEqual(counts,{assembly:299,metropolitan:16,basic:227});
});
