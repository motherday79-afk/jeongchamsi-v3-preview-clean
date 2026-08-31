const test=require('node:test');
const assert=require('node:assert/strict');

function memoryRedis({failOn=null}={}){
  const kv=new Map(),zs=new Map();let calls=0;
  async function command(args){
    calls++;const [op,...rest]=args;const O=String(op).toUpperCase();
    if(failOn&&failOn({op:O,args:rest,calls}))throw Object.assign(new Error('STORAGE_FAIL'),{code:'STORAGE_FAIL'});
    if(O==='GET')return kv.get(rest[0])??null;
    if(O==='SET'){
      const [key,value,flag]=rest;if(String(flag||'').toUpperCase()==='NX'&&kv.has(key))return null;kv.set(key,String(value));return 'OK';
    }
    if(O==='DEL'){let n=0;for(const key of rest){if(kv.delete(key))n++;}return n;}
    if(O==='ZADD'){const [key,score,member]=rest;if(!zs.has(key))zs.set(key,new Map());zs.get(key).set(String(member),Number(score));return 1;}
    if(O==='ZREM'){const [key,member]=rest;return zs.get(key)?.delete(String(member))?1:0;}
    if(O==='ZREVRANGE'){
      const [key,start,end]=rest;const rows=[...(zs.get(key)||new Map()).entries()].sort((a,b)=>b[1]-a[1]).map(x=>x[0]);const e=Number(end);return rows.slice(Number(start),e<0?undefined:e+1);
    }
    throw new Error('UNSUPPORTED_'+O);
  }
  return {command,kv,zs};
}
function decision(){return {version:'JCS_DECISION_INTELLIGENCE_V1',asOf:'2026-09-01T00:00:00Z',currentState:{condition:31,conditionLabel:'강한 상승'},causeTrace:[{rank:1,title:'뉴스 상승',evidence:['a']}],risks:[{rank:1,title:'2030 약화'}],opportunities:[{rank:1,title:'미디어 확산'}],priorities:[{rank:1,title:'2030 방어',mode:'DEFEND',judgement:'j',basis:'b',direction:'d',successCriteria:[{metric:'age2030',targetDirection:'UP',description:'x'}]}],evidenceState:{level:'STRONG',label:'분석 근거 강함',basis:['HISTORY']}};}

test('case stores compact decision reference without bulk history data',async()=>{
  const redis=memoryRedis();
  const {createDecisionCaseStore}=require('../server/v3/lib/decision-case-store');
  const store=createDecisionCaseStore({command:redis.command,now:()=>Date.parse('2026-09-01T01:00:00Z'),randomId:()=> 'fixed'});
  const result=await store.createCase({caseId:'case-1',personId:'assembly-001',sourceDraftId:'now-1',sourcePublishedAt:'2026-09-01T00:00:00Z',decision:decision(),headline:'상승 국면',note:'관리 시작'});
  assert.equal(result.ok,true);
  const raw=JSON.parse(redis.kv.get('jcv3:decision:v1:case:case-1'));
  assert.equal(raw.sourceDraftId,'now-1');
  assert.equal(raw.currentState.condition,31);
  assert.equal(raw.causeTraceTop3.length,1);
  assert.equal(raw.history,undefined);
  assert.equal(raw.observations,undefined);
  assert.equal(raw.politicalIntelligence,undefined);
});

test('case and action indexes return newest first and duplicates are rejected',async()=>{
  const redis=memoryRedis();
  const {createDecisionCaseStore}=require('../server/v3/lib/decision-case-store');
  const store=createDecisionCaseStore({command:redis.command});
  await store.createCase({caseId:'c1',personId:'p1',createdAt:'2026-09-01T00:00:00Z',sourceDraftId:'d1',sourcePublishedAt:'2026-09-01T00:00:00Z',decision:decision()});
  await store.createCase({caseId:'c2',personId:'p1',createdAt:'2026-09-01T02:00:00Z',sourceDraftId:'d2',sourcePublishedAt:'2026-09-01T02:00:00Z',decision:decision()});
  const dupe=await store.createCase({caseId:'c2',personId:'p1',sourceDraftId:'d2',sourcePublishedAt:'2026-09-01T02:00:00Z',decision:decision()});
  assert.equal(dupe.ok,false);assert.equal(dupe.error,'CASE_ALREADY_EXISTS');
  assert.deepEqual((await store.listCases('p1')).map(x=>x.caseId),['c2','c1']);
  const baseline={publishedAt:'2026-09-01T02:00:00Z',condition:31,overallInterest:66,highEngagement:54,massExpansion:57,issueHeat:70,mediaSpread:73,globalRank:12};
  await store.addAction({actionId:'a1',caseId:'c2',personId:'p1',occurredAt:'2026-09-01T03:00:00Z',createdAt:'2026-09-01T03:10:00Z',type:'MEDIA',title:'방송 출연',baseline});
  await store.addAction({actionId:'a2',caseId:'c2',personId:'p1',occurredAt:'2026-09-01T04:00:00Z',createdAt:'2026-09-01T04:10:00Z',type:'POLICY',title:'정책 발표',baseline});
  assert.deepEqual((await store.listActions('p1')).map(x=>x.actionId),['a2','a1']);
  assert.equal((await store.listActionsForCase('c2')).length,2);
});

test('action baseline is required and remains exactly the server-provided baseline',async()=>{
  const redis=memoryRedis();
  const {createDecisionCaseStore}=require('../server/v3/lib/decision-case-store');
  const store=createDecisionCaseStore({command:redis.command});
  await store.createCase({caseId:'c1',personId:'p1',sourceDraftId:'d1',sourcePublishedAt:'2026-09-01T00:00:00Z',decision:decision()});
  const missing=await store.addAction({actionId:'a0',caseId:'c1',personId:'p1',title:'행동'});
  assert.equal(missing.ok,false);assert.equal(missing.error,'ACTION_BASELINE_REQUIRED');
  const baseline={publishedAt:'2026-09-01T00:00:00Z',condition:17,overallInterest:50,globalRank:20};
  const ok=await store.addAction({actionId:'a1',caseId:'c1',personId:'p1',type:'FIELD',title:'지역 일정',baseline});
  assert.deepEqual(ok.action.baseline,baseline);
});

test('index failure rolls back the new row and any prior index mutation',async()=>{
  const redis=memoryRedis({failOn:({op,args})=>op==='ZADD'&&String(args[0])==='jcv3:decision:v1:cases'});
  const {createDecisionCaseStore}=require('../server/v3/lib/decision-case-store');
  const store=createDecisionCaseStore({command:redis.command});
  await assert.rejects(()=>store.createCase({caseId:'broken',personId:'p1',sourceDraftId:'d',sourcePublishedAt:'2026-09-01T00:00:00Z',decision:decision()}),/STORAGE_FAIL/);
  assert.equal(redis.kv.has('jcv3:decision:v1:case:broken'),false);
  assert.equal(redis.zs.get('jcv3:decision:v1:cases:p1')?.has('broken')||false,false);
});
