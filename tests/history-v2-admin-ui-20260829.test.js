const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('HISTORY admin panel identifies V2 as current internal intelligence layer while retaining legacy contract visibility',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/HISTORY V2/);
  assert.match(s,/JCS_HISTORY_PIPELINE_V2/);
  assert.match(s,/JCS_DERIVED_V2/);
  assert.match(s,/JCS_HISTORY_PIPELINE_V1/);
});

test('HISTORY admin panel has current snapshot capture and safe legacy backfill controls',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/data-history-capture-current/);
  assert.match(s,/현재 542명 기준점/);
  assert.match(s,/data-history-backfill/);
});

test('HISTORY admin panel provides search-to-select and 7 30 90 365 all ranges',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/data-history-search-input/);
  assert.match(s,/data-history-search-results/);
  assert.match(s,/data-history-search-source/);
  assert.doesNotMatch(s,/data-history-person-select/);
  assert.match(s,/\['7','30','90','365','all'\]/);
  assert.match(s,/data-history-range=\"\$\{value\}\"/);
});

test('HISTORY admin panel renders six core deltas and FULL versus LEGACY PARTIAL observation labels',()=>{
  const s=read('src/views/admin.js');
  for(const label of ['종합 관심','심층 관심','대중 확산','활동성','이슈 온도','미디어 확산'])assert.match(s,new RegExp(label));
  assert.match(s,/FULL SNAPSHOT/);
  assert.match(s,/LEGACY PARTIAL/);
});

test('app wires HISTORY capture and search-result selection without touching public NOW handler',()=>{
  const s=read('src/app.js');
  assert.match(s,/data-history-capture-current/);
  assert.match(s,/captureHistoryCurrent/);
  assert.match(s,/data-history-search-input/);
  assert.match(s,/data-history-search-person/);
  assert.doesNotMatch(s,/data-history-person-select/);
});

test('HISTORY V2 styles are scoped and add no important declarations',()=>{
  const s=read('css/pages.css');
  assert.match(s,/history-v2-browser/);
  assert.match(s,/history-v2-observation/);
  const block=s.slice(s.indexOf('HISTORY V2'));
  assert.doesNotMatch(block,/!important/);
});

test('HISTORY observation timeline exposes saved competitor context when present',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/경쟁구도/);
  assert.match(s,/row\.related/);
});

test('HISTORY V2 changed browser modules remain cache-busted after removing only the home summary',()=>{
  const index=read('index.html');
  const app=read('src/app.js');
  const admin=read('src/views/admin.js');
  const people=read('src/views/people.js');
  const home=read('src/views/home.js');
  assert.match(index,/pages\.css\?v=[^"']*history-v2/);
  assert.match(index,/src\/app\.js\?v=[^"']*history-v2/);
  assert.match(app,/views\/admin\.js\?v=history-v1-v2/);
  assert.match(app,/views\/people\.js\?v=03686-history-v2/);
  assert.match(app,/views\/home\.js\?v=03683-history-v2/);
  assert.match(admin,/core\/history-repository\.js\?v=history-v2/);
  assert.match(people,/core\/history-repository\.js\?v=history-v2/);
  assert.doesNotMatch(home,/core\/history-repository\.js\?v=history-v2/);
});

test('HISTORY six-core cards expose volatility alongside momentum deltas',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/person\?\.summary\?\.volatility/);
  assert.match(s,/변동성/);
});

test('HISTORY competitor timeline reads the persisted nested related-person shape',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/x\.person/);
  assert.match(s,/x\.globalRank/);
});
