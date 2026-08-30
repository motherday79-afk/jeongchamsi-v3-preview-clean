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

test('admin history route exposes a requireAdmin-protected two-to-five person compare batch',()=>{
  const s=read('server/v3/routes/admin/history.js');
  assert.match(s,/requireAdmin\(req\)/);
  assert.match(s,/view===['"]compare['"]/);
  assert.match(s,/personIds/);
  assert.match(s,/slice\(0,5\)|length\s*>\s*5/);
  assert.match(s,/new Set/);
  assert.match(s,/Promise\.all/);
  assert.match(s,/politicalIntelligence/);
});

test('history repository has a short-lived cached batch compare reader',()=>{
  const s=read('src/core/history-repository.js');
  assert.match(s,/export async function getAdminHistoryCompare/);
  assert.match(s,/personIds=/);
  assert.match(s,/view=compare/);
});

test('compare route preserves public one-to-one and branches admins to two-to-five Intelligence compare',()=>{
  const s=read('src/views/features.js');
  assert.match(s,/getUserSession\(\)/);
  assert.match(s,/role\s*===\s*["']admin["']/);
  assert.match(s,/renderAdminCompare/);
  assert.match(s,/renderPublicCompare/);
  assert.match(s,/params\.getAll\(["']p["']\)/);
  for(const label of ['ADMIN INTELLIGENCE COMPARE','2–5','AGE × GENDER','HISTORY','CORE INTELLIGENCE']) assert.ok(s.includes(label),label);
});

test('admin compare form submits repeated p params while public form keeps a and b',()=>{
  const s=read('src/app.js');
  const compare=block(s,'if (form.matches("[data-compare-form]"))','if (form.matches("[data-generation-admin-form]"))');
  assert.match(compare,/getAll\(["']p["']\)/);
  assert.match(compare,/slice\(0,5\)/);
  assert.match(compare,/new URLSearchParams/);
  assert.match(compare,/fd\.get\(["']a["']\)/);
  assert.match(compare,/fd\.get\(["']b["']\)/);
  assert.match(s,/\["login","join","mypage","admin","compare"\]/);
});

test('정보르기니 layer caches compare data and warms routes before click',()=>{
  const data=read('src/core/compare-data.js');
  const prefetch=read('src/core/instant-prefetch.js');
  const app=read('src/app.js');
  assert.match(data,/Map\(/);
  assert.match(data,/getFastNowPerson/);
  assert.match(data,/getFastAdminCompare/);
  assert.match(data,/prefetchNowPerson/);
  assert.match(prefetch,/export async function prefetchRoute/);
  assert.match(prefetch,/bits\[0\]===\"person\"/);
  assert.match(prefetch,/bits\[0\]===\"compare\"/);
  assert.match(app,/pointerover/);
  assert.match(app,/pointerdown/);
  assert.match(app,/focusin/);
  assert.match(app,/prefetchRoute/);
  assert.match(app,/viewPrefetchCache/);
  assert.match(app,/prefetchResolvedView/);
});

test('admin multi compare has responsive dedicated styling and cache bust marker',()=>{
  const css=read('css/pages.css');
  const index=read('index.html');
  assert.match(css,/admin-multi-compare/);
  assert.match(css,/admin-compare-grid/);
  assert.match(css,/@media\(max-width:/);
  assert.match(index,/admin-multi-compare-inforeghini/);
});
