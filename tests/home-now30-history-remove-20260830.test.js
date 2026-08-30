const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('home NOW Rank uses 30 politicians in 10-person carousel pages with manual navigation and 4s rotation',()=>{
  const home=read('src/views/home.js');
  const app=read('src/app.js');
  assert.match(home,/nowPeople\.slice\(0,30\)/);
  assert.match(home,/data-now-rank-carousel/);
  assert.match(home,/data-now-rank-page=/);
  assert.match(home,/data-now-rank-nav=/);
  assert.match(home,/setInterval\([^\n]*4000\)/);
  assert.match(home,/export function hydrateHomeNowCarousel/);
  assert.match(app,/hydrateHomeNowCarousel/);
});

test('admin-only HISTORY V2 is removed from Home only',()=>{
  const home=read('src/views/home.js');
  const app=read('src/app.js');
  const admin=read('src/views/admin.js');
  assert.doesNotMatch(home,/data-home-history-slot/);
  assert.doesNotMatch(home,/homeHistoryIntelligence/);
  assert.doesNotMatch(home,/hydrateHomeAdminHistory/);
  assert.doesNotMatch(app,/hydrateHomeAdminHistory/);
  assert.match(admin,/HISTORY V2/);
});

test('hotpatch does not require data, intelligence, publish, or storage changes',()=>{
  const home=read('src/views/home.js');
  assert.doesNotMatch(home,/setJSON|msetJSON|redis|publishNow|age-gender-cohort|political-intelligence/);
});
