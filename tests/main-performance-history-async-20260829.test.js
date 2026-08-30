const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('removing the home HISTORY summary keeps home HTML independent from admin HISTORY requests',()=>{
  const home=read('src/views/home.js');
  const app=read('src/app.js');
  const renderHome=home.slice(home.indexOf('export async function renderHome()'),home.indexOf('export async function renderHome()')+2600);
  assert.doesNotMatch(renderHome,/getAdminHistory(?:Overview|HomeSummary)/);
  assert.doesNotMatch(home,/data-home-history-slot|hydrateHomeAdminHistory|getAdminHistoryHomeSummary/);
  assert.doesNotMatch(app,/hydrateHomeAdminHistory/);
});

test('home HISTORY uses a compact summary endpoint rather than the 542-person overview payload',()=>{
  const repo=read('src/core/history-repository.js');
  const route=read('server/v3/routes/admin/history.js');
  assert.match(repo,/export async function getAdminHistoryHomeSummary/);
  assert.match(repo,/summary=home/);
  assert.match(route,/summary\s*===\s*['"]home['"]/);
  assert.match(route,/historyHomeSummaryV2/);
});

test('compact home summary store does not enumerate the 542-person roster',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  let rosterTouched=false;
  const header={draftId:'d4',publishedAt:'2026-08-29T03:00:00.000Z',rosterTotal:542,intelligenceSummary:{movers:[{id:'assembly-001',name:'테스트'}]}};
  const store=createHistoryV2Store({
    allPeople(){rosterTouched=true;throw new Error('home summary must not enumerate roster');},
    getJSON:async key=>key==='nowDataCurrent'?{draftId:'d4',publishedAt:'2026-08-29T03:00:00.000Z'}:null,
    command:async cmd=>{
      if(cmd[0]==='ZCARD')return 4;
      if(cmd[0]==='ZREVRANGE')return ['d4'];
      if(cmd[0]==='GET')return JSON.stringify(header);
      return null;
    },
    pipeline:async()=>[],mgetJSON:async()=>[],mgetRawJSON:async()=>[],derivePersonView:()=>null
  });
  const result=await store.historyHomeSummaryV2();
  assert.equal(rosterTouched,false);
  assert.equal(result.snapshotCount,4);
  assert.equal(result.latestDraftId,'d4');
  assert.equal(result.rosterTotal,542);
  assert.equal(Object.hasOwn(result,'roster'),false);
});
