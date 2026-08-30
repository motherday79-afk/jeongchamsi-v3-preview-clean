const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('home NOW Rank exposes 30 people in three 10-person carousel pages with 4s rotation',()=>{
  const home=read('src/views/home.js');
  assert.match(home,/nowPeople\.slice\(0,30\)/);
  assert.match(home,/data-now-rank-carousel/);
  assert.match(home,/data-now-rank-page=/);
  assert.match(home,/data-now-rank-nav=/);
  assert.match(home,/4000/);
  assert.match(home,/hydrateHomeNowCarousel/);
});

test('admin HISTORY V2 is no longer mounted under the home hero',()=>{
  const home=read('src/views/home.js');
  assert.doesNotMatch(home,/data-home-history-slot/);
  assert.doesNotMatch(home,/homeHistoryIntelligence/);
  assert.doesNotMatch(home,/HISTORY V2/);
});

test('why Jeongchamsi uses the approved actor and JCS recipe copy',()=>{
  const brand=read('src/views/brand.js');
  const repo=read('src/core/repository.js');
  const admin=read('src/views/admin.js');
  for(const source of [brand,repo,admin]){
    assert.match(source,/세계적으로 유명한 배우들도 끊임없이 훈련합니다/);
    assert.match(source,/막대한 양의 데이터를 빠짐없이 수집하고/);
    assert.match(source,/JCS만의 독자적인 시스템을 통해 분석하고/);
    assert.match(source,/목적지를 정하는 것은 여러분입니다/);
    assert.match(source,/가장 정확한 길을 찾는 것은 정참시가 하겠습니다/);
  }
});

test('finalize preserves preview status through HISTORY context and closes VERIFY even on intelligence warning',()=>{
  const route=read('server/v3/routes/admin/now-data.js');
  assert.match(route,/await msetJSON\(\[\[rankedDomain\(meta\.draftId\),ranked\],\[META,next\]\]\);\s*meta=next;/s);
  assert.match(route,/catch\(intelligenceError\)[\s\S]*?pipeline:\{stage:'verify',detail:'SNAPSHOT_VERIFIED_WITH_WARNINGS'/);
  assert.match(route,/catch\(intelligenceError\)[\s\S]*?await setJSON\(META,next\)/);
});
