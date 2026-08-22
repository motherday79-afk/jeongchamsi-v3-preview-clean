const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('admin dashboard uses one aggregate endpoint instead of 7 content/member requests',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../src/views/admin.js'),'utf8');
  assert.match(src,/\/api\/v3\/admin\/dashboard/);
  const start=src.indexOf('async function dashboardPanel()');
  const end=src.indexOf('async function membersPanel()',start);
  const block=src.slice(start,end);
  assert.doesNotMatch(block,/getDomain\(/);
  assert.doesNotMatch(block,/fetchMembers\(/);
});

test('gateway exposes admin dashboard aggregate route',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../api/gateway.js'),'utf8');
  assert.match(src,/"admin\/dashboard"/);
});
