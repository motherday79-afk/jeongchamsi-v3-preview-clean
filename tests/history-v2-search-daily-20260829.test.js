const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
const core=require('../server/v3/lib/history-v2-core');

function observation(publishedAt,overallInterest,globalRank=10,draftId='d'){
  return {draftId,publishedAt,completeness:'FULL',source:'FULL_SNAPSHOT',rank:{global:globalRank,category:2},intelligence:{scores:{overallInterest,highEngagement:overallInterest,massExpansion:overallInterest,activity:overallInterest,issueHeat:overallInterest,mediaSpread:overallInterest}}};
}

function historyHarness(){
  const kv=new Map(),zsets=new Map();
  const command=async args=>{
    const [op,...rest]=args;
    if(op==='GET')return kv.get(rest[0])??null;
    if(op==='SET'){const [key,value,...flags]=rest;if(flags.includes('NX')&&kv.has(key))return null;kv.set(key,value);return 'OK';}
    if(op==='ZADD'){const [key,score,member]=rest;const arr=zsets.get(key)||[];const next=arr.filter(x=>x.member!==member);next.push({score:Number(score),member});next.sort((a,b)=>a.score-b.score);zsets.set(key,next);return 1;}
    if(op==='ZREVRANGE'){const [key,start,stop]=rest;return (zsets.get(key)||[]).slice().sort((a,b)=>b.score-a.score).slice(Number(start),Number(stop)+1).map(x=>x.member);}
    if(op==='ZCARD')return (zsets.get(rest[0])||[]).length;
    throw new Error(`UNSUPPORTED_${op}`);
  };
  const pipeline=async commands=>{const out=[];for(const c of commands)out.push(await command(c));return out;};
  const mgetRawJSON=async keys=>keys.map(k=>{const raw=kv.get(k);return raw?JSON.parse(raw):null;});
  const store=createHistoryV2Store({command,pipeline,mgetRawJSON,getJSON:async()=>null,mgetJSON:async()=>[],allPeople:()=>[],derivePersonView:()=>({row:null})});
  return {store,kv,zsets,command};
}

test('daily summaries group repeated refreshes by Korea calendar day and preserve open high low close average',()=>{
  const rows=[
    observation('2026-08-28T15:30:00.000Z',60,12,'a'), // 2026-08-29 00:30 KST
    observation('2026-08-29T00:30:00.000Z',90,5,'b'),  // 2026-08-29 09:30 KST
    observation('2026-08-29T12:30:00.000Z',75,8,'c')   // 2026-08-29 21:30 KST
  ];
  const daily=core.buildDailySummaries(rows);
  assert.equal(daily.length,1);
  assert.equal(daily[0].date,'2026-08-29');
  assert.equal(daily[0].timezone,'Asia/Seoul');
  assert.equal(daily[0].observationCount,3);
  assert.deepEqual(daily[0].core.overallInterest,{count:3,open:60,high:90,low:60,close:75,average:75});
  assert.deepEqual(daily[0].rank.global,{count:3,open:12,best:5,worst:12,close:8,average:8.3});
});

test('long windows normalize trend calculations to one daily representative while retaining raw observations',async()=>{
  const h=historyHarness();
  const id='assembly-001',index=`jcv3:history:v2:observations:${id}`;
  const now=Date.now();
  const rows=[
    observation(new Date(now-30*60*60*1000).toISOString(),20,20,'a'),
    observation(new Date(now-27*60*60*1000).toISOString(),80,8,'b'),
    observation(new Date(now-24*60*60*1000).toISOString(),80,7,'c'),
    observation(new Date(now-3*60*60*1000).toISOString(),40,12,'d')
  ];
  for(const row of rows){
    h.kv.set(`jcv3:history:v2:observation:${id}:${row.draftId}`,JSON.stringify(row));
    await h.command(['ZADD',index,Date.parse(row.publishedAt),row.draftId]);
  }
  const result=await h.store.readPersonHistoryV2(id,{days:30});
  assert.equal(result.observations.length,4);
  assert.equal(result.daily.length,2);
  assert.equal(result.summary.normalization,'DAILY_AVERAGE');
  assert.equal(result.summary.rawSampleSize,4);
  assert.equal(result.summary.dailySampleSize,2);
  assert.equal(result.summary.sampleSize,2);
});

test('7-day window keeps intraday observations as the trend calculation input',async()=>{
  const h=historyHarness();
  const id='assembly-001',index=`jcv3:history:v2:observations:${id}`;
  const now=Date.now();
  for(const [draft,hours,value] of [['a',18,20],['b',12,80],['c',3,40]]){
    const row=observation(new Date(now-hours*60*60*1000).toISOString(),value,10,draft);
    h.kv.set(`jcv3:history:v2:observation:${id}:${draft}`,JSON.stringify(row));
    await h.command(['ZADD',index,Date.parse(row.publishedAt),draft]);
  }
  const result=await h.store.readPersonHistoryV2(id,{days:7});
  assert.equal(result.summary.normalization,'RAW_INTRADAY');
  assert.equal(result.summary.sampleSize,3);
  assert.equal(result.summary.rawSampleSize,3);
  assert.ok(result.daily.length>=1);
});

test('distinct NOW publishes on the same day remain distinct immutable observations',async()=>{
  const people=[{id:'assembly-001',name:'A',type:'assembly'}];
  const h=historyHarness();
  h.store._deps.allPeople=()=>people;
  h.store._deps.derivePersonView=(current,history,id)=>({row:current.ranked[0],categoryRank:1,categoryLabel:'국회의원',publishedAt:current.publishedAt,draftId:current.draftId,analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50}}});
  const base={weights:{search:50,news:50},providers:['naver'],ranked:[{rank:1,score:50,searchScore:50,newsScore:50,person:people[0],search:{},news:{}}]};
  await h.store.recordPublishedSnapshotV2({...base,draftId:'morning',publishedAt:'2026-08-29T00:00:00.000Z'},{items:[]});
  await h.store.recordPublishedSnapshotV2({...base,draftId:'evening',publishedAt:'2026-08-29T09:00:00.000Z'},{items:[]});
  const members=h.zsets.get('jcv3:history:v2:observations:assembly-001')||[];
  assert.deepEqual(members.map(x=>x.member),['morning','evening']);
});

test('HISTORY admin uses search-to-select instead of a visible 542-person select list',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/data-history-search-input/);
  assert.match(s,/data-history-search-results/);
  assert.match(s,/data-history-search-source/);
  assert.match(s,/이름 · 정당 · 지역/);
  assert.doesNotMatch(s,/data-history-person-select/);
  assert.doesNotMatch(s,/data-history-person-load/);
});

test('HISTORY search result selection routes immediately to the selected politician',()=>{
  const s=read('src/app.js');
  assert.match(s,/data-history-search-input/);
  assert.match(s,/data-history-search-person/);
  assert.match(s,/historySearchText/);
  assert.doesNotMatch(s,/data-history-person-select/);
});

test('HISTORY long-range UI explains daily normalization while keeping raw timeline count visible',()=>{
  const s=read('src/views/admin.js');
  assert.match(s,/일 단위 정규화/);
  assert.match(s,/rawSampleSize/);
  assert.match(s,/dailySampleSize/);
  assert.match(s,/시간축 관측/);
});

test('search and daily-summary browser changes use a fresh cache tag',()=>{
  const index=read('index.html');
  const app=read('src/app.js');
  assert.match(index,/history-v2-search-daily/);
  assert.match(app,/views\/admin\.js\?v=history-v1-v2-search-daily/);
});

test('365-day reads reserve enough raw observation slots for an approximately 3-hour cadence',async()=>{
  let requestedStop=-1;
  const store=createHistoryV2Store({
    command:async args=>{if(args[0]==='ZREVRANGE'&&String(args[1]).includes(':observations:')){requestedStop=Number(args[3]);return [];}if(args[0]==='ZREVRANGE')return [];if(args[0]==='ZCARD')return 0;return null;},
    pipeline:async()=>[],mgetRawJSON:async()=>[],getJSON:async()=>null,mgetJSON:async()=>[],allPeople:()=>[],derivePersonView:()=>({row:null})
  });
  await store.readPersonHistoryV2('assembly-001',{days:365});
  assert.ok(requestedStop>=2999,`expected >= 3000 raw slots, got ${requestedStop+1}`);
});

test('large raw HISTORY reads batch MGET work instead of sending thousands of keys in one request',async()=>{
  const ids=Array.from({length:500},(_,i)=>`d${i}`),batchSizes=[];
  const store=createHistoryV2Store({
    command:async args=>{if(args[0]==='ZREVRANGE'&&String(args[1]).includes(':observations:'))return ids;if(args[0]==='ZREVRANGE')return [];if(args[0]==='ZCARD')return 0;return null;},
    pipeline:async()=>[],
    mgetRawJSON:async keys=>{batchSizes.push(keys.length);return keys.map((key,i)=>observation(new Date(Date.now()-(i+1)*60*60*1000).toISOString(),50,10,key.split(':').at(-1)));},
    getJSON:async()=>null,mgetJSON:async()=>[],allPeople:()=>[],derivePersonView:()=>({row:null})
  });
  await store.readPersonHistoryV2('assembly-001',{days:365});
  assert.ok(batchSizes.length>=3);
  assert.ok(batchSizes.every(size=>size<=180),`unexpected batch sizes ${batchSizes.join(',')}`);
});
