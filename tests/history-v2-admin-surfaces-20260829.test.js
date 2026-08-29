const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('HISTORY browser requests live in a separate repository module while public getNowPerson stays in the golden repository',()=>{
  const history=read('src/core/history-repository.js');
  const publicRepo=read('src/core/repository.js');
  assert.match(history,/export async function getAdminHistoryPerson/);
  assert.match(history,/export async function getAdminHistoryOverview/);
  assert.match(history,/\/api\/v3\/admin\/history/);
  assert.doesNotMatch(publicRepo,/getAdminHistoryPerson|getAdminHistoryOverview/);
  assert.match(publicRepo,/export async function getNowPerson\(id/);
});

test('politician detail requests HISTORY only behind an admin-session guard',()=>{
  const s=read('src/views/people.js');
  assert.match(s,/isAdmin\s*\?\s*getAdminHistoryPerson/);
  assert.match(s,/HISTORY INTELLIGENCE/);
  assert.match(s,/INTERNAL_ADMIN/);
});

test('politician detail HISTORY card links to full admin browser and shows six-core deltas',()=>{
  const s=read('src/views/people.js');
  assert.match(s,/\/admin\?tab=history&person=/);
  for(const key of ['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'])assert.match(s,new RegExp(key));
});

test('home reserves an admin-only HISTORY slot and hydrates it asynchronously',()=>{
  const s=read('src/views/home.js');
  assert.match(s,/userSession\.authenticated\s*&&\s*userSession\.user\?\.role\s*===\s*"admin"/);
  assert.match(s,/data-home-history-slot/);
  assert.match(s,/getAdminHistoryHomeSummary/);
  const renderHome=s.slice(s.indexOf('export async function renderHome()'),s.indexOf('export async function renderHome()')+2200);
  assert.doesNotMatch(renderHome,/await\s+getAdminHistoryHomeSummary/);
  assert.match(s,/ADMIN INTELLIGENCE/);
});

test('admin-only HISTORY surfaces are styled without important declarations',()=>{
  const s=read('css/pages.css');
  assert.match(s,/admin-history-intelligence/);
  assert.match(s,/home-history-intelligence/);
  const block=s.slice(s.indexOf('HISTORY V2 — admin-only surfaces'));
  assert.doesNotMatch(block,/!important/);
});
