const test=require('node:test');
const assert=require('node:assert/strict');
const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');

function samplePeople(){return [
  {id:'assembly-001',name:'A',type:'assembly',party:'P',jurisdiction:'서울 A',office:'국회의원'},
  {id:'metropolitan-001',name:'B',type:'metropolitan',party:'P2',jurisdiction:'서울',office:'시장'}
];}
function sampleCurrent(){return {draftId:'draft-current',publishedAt:'2026-08-29T00:00:00.000Z',weights:{search:55,news:45},providers:['naver-search-ads','naver-news'],ranked:[
  {rank:1,score:90,searchScore:80,newsScore:100,person:samplePeople()[0],search:{state:'OK',monthlyPcQcCnt:100,monthlyMobileQcCnt:200,monthlyTotalQcCnt:300},news:{state:'OK',count6:2,count24:8,count7d:20,sources24:5,headlines:[{title:'A 기사',link:'https://a',source:'언론',ts:1787960000000}]}},
  {rank:2,score:70,searchScore:60,newsScore:80,person:samplePeople()[1],search:{state:'OK',monthlyPcQcCnt:50,monthlyMobileQcCnt:100,monthlyTotalQcCnt:150},news:{state:'OK',count6:1,count24:3,count7d:10,sources24:3}}
]};}
function fakeView(current,history,id){
  const row=current.ranked.find(x=>x.person.id===id);if(!row)return {row:null};
  return {row,draftId:current.draftId,publishedAt:current.publishedAt,categoryRank:1,categoryLabel:row.person.type==='assembly'?'국회의원':'광역단체장',rankDelta:id==='assembly-001'?3:null,whyNow:'현재 분석 이유',related:[],analysis:{scores:{overallInterest:80,highEngagement:60,massExpansion:90,activity:70,issueHeat:85,mediaSpread:75},grades:{overallInterest:'높음'},audience:{position:70,label:'대중 확산형'},signal:{label:'상승형',diagnosis:'진단'},mediaPublic:{direction:'balanced'}}};
}
function harness(initial={}){
  const kv=new Map(Object.entries(initial));const zsets=new Map();const pipelines=[];
  const command=async args=>{
    const [op,...rest]=args;
    if(op==='GET')return kv.get(rest[0])??null;
    if(op==='SET'){const [key,value,...flags]=rest;if(flags.includes('NX')&&kv.has(key))return null;kv.set(key,value);return 'OK';}
    if(op==='MGET')return rest.map(key=>kv.get(key)??null);
    if(op==='ZADD'){const [key,score,member]=rest;const arr=zsets.get(key)||[];const next=arr.filter(x=>x.member!==member);next.push({score:Number(score),member});next.sort((a,b)=>a.score-b.score);zsets.set(key,next);return 1;}
    if(op==='ZCARD')return (zsets.get(rest[0])||[]).length;
    if(op==='ZREVRANGE'){const [key,start,stop]=rest;return (zsets.get(key)||[]).slice().sort((a,b)=>b.score-a.score).slice(Number(start),Number(stop)+1).map(x=>x.member);}
    throw new Error(`UNSUPPORTED_${op}`);
  };
  const pipeline=async commands=>{pipelines.push(commands);const out=[];for(const c of commands)out.push(await command(c));return out;};
  const contentKey=d=>`jcv3:content:v4:${d}`;
  const getJSON=async d=>{const raw=kv.get(contentKey(d));return raw?JSON.parse(raw):null;};
  const mgetJSON=async ds=>ds.map(d=>{const raw=kv.get(contentKey(d));return raw?JSON.parse(raw):null;});
  const mgetRawJSON=async keys=>keys.map(k=>{const raw=kv.get(k);return raw?JSON.parse(raw):null;});
  const store=createHistoryV2Store({command,pipeline,getJSON,mgetJSON,mgetRawJSON,allPeople:samplePeople,derivePersonView:fakeView});
  return {store,kv,zsets,pipelines,contentKey};
}

test('capture current creates a full immutable v2 snapshot from existing NOW without refresh',async()=>{
  const h=harness();h.kv.set(h.contentKey('nowDataCurrent'),JSON.stringify(sampleCurrent()));h.kv.set(h.contentKey('nowDataHistory'),JSON.stringify({items:[]}));
  const r=await h.store.captureCurrentSnapshot();
  assert.equal(r.ok,true);assert.equal(r.created,true);assert.equal(r.rosterTotal,2);
  const header=JSON.parse(h.kv.get('jcv3:history:v2:snapshot:draft-current'));
  assert.equal(header.completeness,'FULL');assert.equal(header.rosterTotal,2);
  const a=JSON.parse(h.kv.get('jcv3:history:v2:observation:assembly-001:draft-current'));
  assert.equal(a.source,'FULL_SNAPSHOT');assert.equal(a.intelligence.scores.issueHeat,85);
});

test('full capture is idempotent and never overwrites an existing immutable observation',async()=>{
  const h=harness();h.kv.set(h.contentKey('nowDataCurrent'),JSON.stringify(sampleCurrent()));h.kv.set(h.contentKey('nowDataHistory'),JSON.stringify({items:[]}));
  const first=await h.store.captureCurrentSnapshot();
  const before=h.kv.get('jcv3:history:v2:observation:assembly-001:draft-current');
  const second=await h.store.captureCurrentSnapshot();
  assert.equal(first.created,true);assert.equal(second.created,false);assert.equal(h.kv.get('jcv3:history:v2:observation:assembly-001:draft-current'),before);
});

test('capture current refuses to manufacture data when NOW current is absent',async()=>{
  const r=await harness().store.captureCurrentSnapshot();assert.deepEqual(r,{ok:false,error:'NOW_CURRENT_REQUIRED'});
});

test('formal snapshot header is written only after per-person observation pipeline work',async()=>{
  const h=harness();
  await h.store.recordPublishedSnapshotV2(sampleCurrent(),{items:[]});
  const all=h.pipelines.flat();
  const firstSnapshotSet=all.findIndex(c=>c[0]==='SET'&&String(c[1]).includes(':snapshot:'));
  const firstObservationSet=all.findIndex(c=>c[0]==='SET'&&String(c[1]).includes(':observation:'));
  assert.ok(firstObservationSet>=0);assert.ok(firstSnapshotSet>firstObservationSet);
});

test('legacy backfill writes PARTIAL rows and never converts missing scores into zero',async()=>{
  const h=harness();
  h.kv.set(h.contentKey('nowDataPersonPublic:assembly-001'),JSON.stringify({trend:{points:[{draftId:'legacy-a',publishedAt:'2026-08-01T00:00:00.000Z',globalRank:10,categoryRank:3,scores:{overallInterest:61}}]}}));
  h.kv.set(h.contentKey('nowDataHistory'),JSON.stringify({items:[]}));
  const r=await h.store.backfillLegacyPageV2({cursor:0,pageSize:1});assert.equal(r.written,1);
  const o=JSON.parse(h.kv.get('jcv3:history:v2:observation:assembly-001:legacy-a'));
  assert.equal(o.completeness,'PARTIAL');assert.equal(o.intelligence.scores.overallInterest,61);assert.equal(Object.hasOwn(o.intelligence.scores,'mediaSpread'),false);
});

test('person history range returns chronological observations and six-core summary',async()=>{
  const h=harness();
  const idx='jcv3:history:v2:observations:assembly-001';
  for(const [draft,date,value,rank] of [['a','2026-08-01T00:00:00.000Z',40,20],['b','2026-08-20T00:00:00.000Z',70,8]]){
    const o={publishedAt:date,rank:{global:rank},intelligence:{scores:{overallInterest:value}},source:'LEGACY_PARTIAL'};
    h.kv.set(`jcv3:history:v2:observation:assembly-001:${draft}`,JSON.stringify(o));await h.store._deps.command(['ZADD',idx,Date.parse(date),draft]);
  }
  const r=await h.store.readPersonHistoryV2('assembly-001',{days:'all'});
  assert.equal(r.observations.length,2);assert.equal(r.observations[0].publishedAt,'2026-08-01T00:00:00.000Z');assert.equal(r.summary.coreDeltas.overallInterest,30);assert.equal(r.summary.rankDelta.global,12);
});

test('overview exposes compact 542-selector shape and current capture state without public data writes',async()=>{
  const h=harness();h.kv.set(h.contentKey('nowDataCurrent'),JSON.stringify(sampleCurrent()));
  const before=[...h.kv.keys()];const r=await h.store.historyOverviewV2();const after=[...h.kv.keys()];
  assert.equal(r.accessScope,'INTERNAL_ADMIN');assert.equal(r.roster.length,2);assert.equal(r.currentDraftId,'draft-current');assert.equal(r.currentCaptured,false);assert.deepEqual(after,before);
});
