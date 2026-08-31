const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function block(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);
  return source.slice(a,b>0?b:source.length);
}

test('admin compare requires an explicit run action after selecting two to five politicians',()=>{
  const source=read('src/views/features.js');
  const render=block(source,'async function renderAdminCompare','export async function renderCompare');
  assert.match(render,/params\.get\(["']run["']\)\s*===\s*["']1["']/);
  assert.match(render,/execute\s*&&\s*people\.length\s*>=\s*2|shouldRun\s*&&\s*people\.length\s*>=\s*2/);
  assert.match(source,/run=1|set\(["']run["'],\s*["']1["']\)/);
  assert.match(source,/data-admin-compare-run/);
  assert.match(source,/비교하기/);
});

test('admin compare selection UI is a deliberate command deck rather than an auto-running quick form',()=>{
  const source=read('src/views/features.js');
  const css=read('css/pages.css');
  for(const token of ['admin-compare-command-deck','admin-compare-stage','admin-compare-selection-card','admin-compare-search-panel','admin-compare-actions']){
    assert.ok(source.includes(token),token);
    assert.ok(css.includes(`.${token}`),`${token} css`);
  }
  assert.match(source,/현재\s*\$\{ids\.length\}명|선택 인원/);
  assert.match(source,/최소 2명 · 최대 5명/);
});

test('admin Political Intelligence is packaged as a collapsed premium report with explicit open action',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  for(const token of ['admin-intelligence-report-shell','admin-intelligence-report-gate','admin-intelligence-report-body','admin-intelligence-report-open']){
    assert.ok(source.includes(token),token);
    assert.ok(css.includes(`.${token}`),`${token} css`);
  }
  assert.match(source,/<details class="content-card admin-intelligence-report-shell"/);
  assert.match(source,/<summary class="admin-intelligence-report-gate"/);
  assert.match(source,/리포트 열기/);
});

test('premium Political Intelligence uses multiple visualization grammars and section color languages',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  for(const token of ['admin-pi-visual-pulse','admin-pi-support-donut','admin-pi-issue-bars','admin-pi-resilience-gauge','admin-pi-tone-demographic','admin-pi-tone-support','admin-pi-tone-media','admin-pi-tone-risk','admin-pi-tone-strategy']){
    assert.ok(source.includes(token),token);
    assert.ok(css.includes(`.${token}`),`${token} css`);
  }
  assert.match(source,/<svg[^>]*admin-pi-pulse-svg|class="admin-pi-pulse-svg"/);
  assert.match(css,/conic-gradient/);
});

test('premium UI cache revisions are wired through stylesheet and dynamic view imports',()=>{
  const index=read('index.html');
  const app=read('src/app.js');
  assert.match(index,/admin-premium-intelligence-v2/);
  assert.match(app,/features\.js\?v=[^"']*admin-premium-intelligence-v2/);
  assert.match(app,/people\.js\?v=[^"']*admin-premium-intelligence-v2/);
});

test('admin compare add preserves an existing legacy a or b selection before converting to repeated p params',()=>{
  const app=read('src/app.js');
  const start=app.indexOf("const adminCompareAdd = event.target.closest('[data-admin-compare-add]')");
  const end=app.indexOf("const compareSelect",start);
  assert.ok(start>=0&&end>start);
  const section=app.slice(start,end);
  assert.match(section,/params\.getAll\(['"]p['"]\)/);
  assert.match(section,/params\.get\(['"]a['"]\)/);
  assert.match(section,/params\.get\(['"]b['"]\)/);
});

test('selecting admin compare candidates warms only person data and does not run the expensive admin comparison',()=>{
  const source=read('src/core/instant-prefetch.js');
  const start=source.indexOf('export function prefetchCompareSelection');
  assert.ok(start>=0);
  const section=source.slice(start);
  assert.match(section,/prefetchNowPerson/);
  assert.doesNotMatch(section,/prefetchAdminCompare/);
});
