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
  assert.match(s,/isAdmin\?adminPersonIntelligenceSlot\(p\):""/);
  assert.match(s,/hydratePersonAdminIntelligence/);
  assert.match(s,/getAdminHistoryPersonDetail/);
  assert.match(s,/HISTORY INTELLIGENCE/);
  assert.match(s,/INTERNAL_ADMIN/);
});

test('politician detail HISTORY card links to full admin browser and shows six-core deltas',()=>{
  const s=read('src/views/people.js');
  assert.match(s,/\/admin\?tab=history&person=/);
  for(const key of ['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'])assert.match(s,new RegExp(key));
});

test('home no longer renders the admin HISTORY V2 summary while admin HISTORY browser remains available',()=>{
  const home=read('src/views/home.js');
  const admin=read('src/views/admin.js');
  assert.doesNotMatch(home,/data-home-history-slot|homeHistoryIntelligence|hydrateHomeAdminHistory/);
  assert.match(admin,/HISTORY V2/);
});

test('admin HISTORY browser styling remains available after the home summary removal',()=>{
  const s=read('css/pages.css');
  assert.match(s,/admin-history-intelligence/);
  const block=s.slice(s.indexOf('HISTORY V2 — admin-only surfaces'));
  assert.doesNotMatch(block,/!important/);
});
