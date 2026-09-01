'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const {allPeople}=require('../server/v3/lib/politician-live-roster');
const {buildBootstrapCurrent}=require('../server/v3/lib/now-bootstrap');
const {buildHomePublicSnapshot,buildCategoryPublicSnapshots}=require('../server/v3/lib/now-public-snapshot');
const {mgetJSONInBatches}=require('../server/v3/lib/storage-safe-mget');
const {createSafePublicPublisher,jsonBytes}=require('../server/v3/lib/safe-public-publish');
const redis=require('../lib/v3/redis');
const news=require('../server/v3/lib/google-news-rss');

test('emergency roster remains complete: 542 = 299 + 16 + 227',()=>{
  const people=allPeople();
  assert.equal(people.length,542);
  const counts=people.reduce((acc,p)=>(acc[p.type]=(acc[p.type]||0)+1,acc),{});
  assert.deepEqual(counts,{assembly:299,metropolitan:16,basic:227});
});

test('modeled bootstrap supplies a differentiated 542-person NOW snapshot when Redis publish is absent',()=>{
  const current=buildBootstrapCurrent(Date.parse('2026-09-01T00:00:00.000Z'));
  assert.equal(current.ranked.length,542);
  assert.equal(current.ranked[0].rank,1);
  assert.equal(current.ranked.at(-1).rank,542);
  assert.equal(current.modeled,true);
  assert.ok(current.ranked.every(r=>r.search?.state==='MODELED'&&r.news?.state==='MODELED'));
  assert.ok(new Set(current.ranked.map(r=>r.score)).size>20,'scores must not flatten');
  assert.ok(new Set(current.ranked.map(r=>r.search.monthlyTotalQcCnt)).size>100,'search fallback must be person-specific');
  assert.ok(new Set(current.ranked.map(r=>r.news.count7d)).size>5,'news fallback must be person-specific');
});

test('HOME NOW contract exposes top30 and categories preserve 299/16/227',()=>{
  const current=buildBootstrapCurrent(Date.parse('2026-09-01T00:00:00.000Z'));
  const home=buildHomePublicSnapshot(current,{items:[]},Date.parse('2026-09-01T00:00:00.000Z'));
  assert.equal(home.top30.length,30);
  assert.equal(home.top10.length,10);
  assert.equal(home.total,542);
  const groups=buildCategoryPublicSnapshots(current);
  assert.equal(groups.assembly.total,299);
  assert.equal(groups.metropolitan.total,16);
  assert.equal(groups.basic.total,227);
});

test('home frontend is wired for 30 people in 10-person pages and four-second rotation',()=>{
  const view=read('src/views/home.js');
  const app=read('src/app.js');
  assert.match(view,/nowPeople\.slice\(0,30\)/);
  assert.match(view,/rankTop30\.slice\(pageIndex\*10,pageIndex\*10\+10\)/);
  assert.match(view,/data-now-rank-prev/);
  assert.match(view,/data-now-rank-next/);
  assert.match(app,/setInterval\(\(\)=>show\(index\+1\),4000\)/);
});

test('badge API routes exist and gateway mounts both user/admin badge endpoints',()=>{
  for(const file of ['server/v3/routes/user/badges.js','server/v3/routes/admin/badges.js','lib/v3/badge-celebrations.js']){
    assert.ok(fs.existsSync(path.join(root,file)),file);
    assert.doesNotThrow(()=>require(path.join(root,file)));
  }
  const gateway=read('api/gateway.js');
  assert.match(gateway,/"user\/badges"/);
  assert.match(gateway,/"admin\/badges"/);
});

test('provider contracts that previously crashed are exported functions',()=>{
  assert.equal(typeof news.availability,'function');
  assert.equal(news.availability().provider,'google-news-rss');
  assert.equal(typeof redis.scanDomains,'function');
  assert.equal(typeof redis.msetJSON,'function');
});

test('542-key MGET is bounded to 25 keys per request',async()=>{
  const keys=Array.from({length:542},(_,i)=>`k${i}`);const calls=[];
  const result=await mgetJSONInBatches(keys,async chunk=>{calls.push(chunk.length);return chunk;},25);
  assert.equal(result.length,542);
  assert.equal(calls.length,22);
  assert.ok(calls.every(n=>n<=25));
});

test('safe public publisher uses individual SET writes and commits META last',async()=>{
  const state=new Map([['META',{old:true}],['p1',{old:1}],['control',{old:2}]]);const writes=[];
  const publisher=createSafePublicPublisher({
    getJSON:async key=>state.has(key)?state.get(key):null,
    setJSON:async(key,value)=>{writes.push(key);state.set(key,value);}
  },{concurrency:1,maxEntryBytes:9_000_000});
  const out=await publisher.publish({personEntries:[['p1',{next:1}]],controlEntries:[['control',{next:2}]],commitEntry:['META',{published:true}]});
  assert.equal(out.ok,true);
  assert.deepEqual(writes,['p1','control','META']);
  assert.ok(jsonBytes({x:'a'.repeat(1000)})<9_000_000);
});

test('safe public publisher rejects oversized entry before any write',async()=>{
  const writes=[];const publisher=createSafePublicPublisher({getJSON:async()=>null,setJSON:async(k)=>writes.push(k)},{maxEntryBytes:100});
  await assert.rejects(()=>publisher.publish({personEntries:[['huge',{x:'x'.repeat(200)}]],commitEntry:['META',{ok:true}]}),e=>e.code==='NOW_PUBLIC_ENTRY_TOO_LARGE');
  assert.equal(writes.length,0);
});

test('public NOW routes bootstrap rather than showing empty/dummy data when current publish keys are absent',()=>{
  const home=read('server/v3/routes/home.js');
  const now=read('server/v3/routes/now-data.js');
  assert.match(home,/buildBootstrapCurrent/);
  assert.match(home,/nowRank=\{/);
  assert.match(now,/if\(!current\)current=buildBootstrapCurrent\(\)/);
  assert.match(now,/buildCategoryPublicSnapshots\(current\)/);
});

test('news zero/error states are filled immediately by the JCS news model',()=>{
  const {needsNewsFallback,applyFallbacks}=require('../server/v3/lib/now-fallback');
  assert.equal(needsNewsFallback({state:'ZERO'}),true);
  assert.equal(needsNewsFallback({state:'ERROR'}),true);
  const person=allPeople()[0];
  const out=applyFallbacks(person,{provider:'naver-search-ads',state:'OBSERVED',monthlyTotalQcCnt:100},{provider:'google-news-rss',state:'ZERO',count7d:0},null,Date.parse('2026-09-01T00:00:00.000Z'));
  assert.equal(out.news.provider,'jcs-modeled-news-fallback');
  assert.equal(out.news.state,'MODELED');
  assert.ok(out.news.count7d>0);
});

test('NOW refresh uses canonical provider names and modeled fallbacks',()=>{
  const route=read('server/v3/routes/admin/now-data.js');
  const fallback=read('server/v3/lib/now-fallback.js');
  assert.match(route,/searchLive===true\?'naver-search-ads'/);
  assert.match(route,/jcs-modeled-search-fallback/);
  assert.match(route,/google-news-rss/);
  assert.match(route,/jcs-modeled-news-fallback/);
  assert.match(fallback,/state:'MODELED'/);
});


test('admin NOW status has a modeled 542-person fallback instead of 542 failures when live publish is absent',()=>{
  const route=read('server/v3/routes/admin/now-data.js');
  const admin=read('src/views/admin.js');
  assert.match(route,/buildBootstrapCurrent/);
  assert.match(route,/currentPublic=\{\.\.\.buildAdminPublicSnapshot\(source\),modeled:/);
  assert.match(admin,/현재 모델/);
  assert.match(admin,/JCS 모델 스냅샷/);
  assert.match(admin,/JCS 보강/);
});

test('NOW publication keeps a safety margin below the hard 9MB per-entry cap',()=>{
  const route=read('server/v3/routes/admin/now-data.js');
  assert.match(route,/SAFE_ENTRY_TARGET_BYTES=8_500_000,SAFE_ENTRY_HARD_BYTES=9_000_000/);
  assert.match(route,/fitNowPublishEntries\([\s\S]*SAFE_ENTRY_TARGET_BYTES\)/);
  assert.match(route,/maxEntryBytes:SAFE_ENTRY_HARD_BYTES/);
});

test('cache/version marker is synchronized for emergency repair',()=>{
  const version=read('src/version.js');
  const index=read('index.html');
  assert.match(version,/0\.36\.69/);
  assert.match(index,/alpha6\.0\.36\.69-jcs-emergency-repair/);
});

test('unwanted rebuild presentation markers are absent from public/admin/compare views',()=>{
  const source=['src/views/home.js','src/views/people.js','src/views/admin.js','src/views/features.js'].map(read).join('\n');
  for(const marker of ['PUBLIC POLITICAL PROFILE','POLITICAL PULSE','JCS COMMAND CENTER','COMPARE SCOREBOARD','JCS 다중신호 보정']){
    assert.equal(source.includes(marker),false,marker);
  }
});

test('HISTORY V2 capture is non-blocking and happens only after safe public commit',()=>{
  const route=read('server/v3/routes/admin/now-data.js');
  const publishStart=route.indexOf("if(action==='publish')");
  const safeCommit=route.indexOf('await publisher.publish',publishStart);
  const historyCapture=route.indexOf('await recordPublishedSnapshotV2',publishStart);
  assert.ok(safeCommit>publishStart);
  assert.ok(historyCapture>safeCommit);
  assert.match(route.slice(historyCapture),/catch\(historyError\)/);
});

test('Political Intelligence prefers compatible frozen snapshots and rejects stale legacy frozen schema',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  let derives=0;
  const baseDeps={
    command:async()=>[],mgetRawJSON:async()=>[],pipeline:async()=>[],getJSON:async key=>key==='nowDataCurrent'?{draftId:'d',publishedAt:'2026-09-01T00:00:00.000Z',ranked:[{person:{id:'assembly-001'}}]}:{items:[]},
    readPoliticalIntelligenceSnapshotPersonV1:async()=>null,
    derivePersonView:()=>({row:{person:{id:'assembly-001'},search:{state:'MODELED'},news:{state:'MODELED'}},analysis:{scores:{overallInterest:51}}}),
    getPoliticalIntelligenceEvidence:()=>({sources:[]}),derivePoliticalIntelligenceV1:()=>{derives++;return {version:'LIVE',validity:{state:'MODELED'}};}
  };
  const compatible={version:'JCS_POLITICAL_INTELLIGENCE_V1_3_AGGRESSIVE',validity:{state:'READY'},asOf:'frozen'};
  let store=createHistoryV2Store({...baseDeps,readLatestPoliticalIntelligenceSnapshotPersonV1:async()=>compatible});
  assert.deepEqual(await store.readPoliticalIntelligenceV2('assembly-001'),compatible);
  assert.equal(derives,0);
  const stale={version:'JCS_POLITICAL_INTELLIGENCE_V1',asOf:'stale'};
  store=createHistoryV2Store({...baseDeps,readLatestPoliticalIntelligenceSnapshotPersonV1:async()=>stale});
  const result=await store.readPoliticalIntelligenceV2('assembly-001',{observations:[],daily:[],summary:{},events:[]});
  assert.equal(result.version,'LIVE');
  assert.equal(derives,1);
});

test('badge engine gives deterministic earned badges and admin catalog remains fully available',()=>{
  const {evaluateBadgeRules,VALID_BADGE_KEYS}=require('../lib/v3/badge-engine');
  const member=evaluateBadgeRules({role:'member'},{grantedBadges:[]},{actionTotal:1,pollCount:1,participationCount:1});
  assert.ok(member.earned.has('first-step'));
  assert.ok(member.earned.has('first-participation'));
  assert.ok(member.earned.has('citizen-choice'));
  const admin=evaluateBadgeRules({role:'admin'},{grantedBadges:[]},{});
  assert.equal(admin.earned.size,VALID_BADGE_KEYS.size);
  assert.ok(admin.earned.has('operator'));
});
