'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('refresh progress models actual expanded JCS pipeline instead of pinning every late phase at 100 percent',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../src/core/refresh-progress.js'),'utf8');
  const rows=[...source.matchAll(/key:"([^"]+)", pct:(\d+)/g)].map(m=>({key:m[1],pct:Number(m[2])}));
  assert.deepEqual(rows.map(x=>x.key),['now','evidence','official','market','history','cohort','intelligence','verify']);
  for(let i=1;i<rows.length;i++)assert.ok(rows[i].pct>rows[i-1].pct,JSON.stringify(rows));
  assert.equal(rows.at(-1).pct,100);
  assert.ok(rows.find(x=>x.key==='evidence').pct<70);
  assert.ok(rows.find(x=>x.key==='cohort').pct<95);
});

test('admin refresh and server route are wired to live pipeline stage updates',()=>{
  const admin=fs.readFileSync(path.join(__dirname,'../src/views/admin.js'),'utf8');
  const route=fs.readFileSync(path.join(__dirname,'../server/v3/routes/admin/now-data.js'),'utf8');
  assert.match(admin,/finalizeWithPipelineProgress/);
  assert.match(admin,/fetchNowDataStatus\(\)/);
  for(const key of ['market','history','cohort','intelligence','verify'])assert.match(route,new RegExp(`stage:'${key}'`));
  assert.match(route,/pipeline:meta\.pipeline\|\|null/);
});
