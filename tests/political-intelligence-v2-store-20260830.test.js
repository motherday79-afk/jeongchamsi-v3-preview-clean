const test=require('node:test');
const assert=require('node:assert/strict');
const {COHORT_KEYS}=require('../server/v3/lib/age-gender-baseline-v2');

function cohortLayer(value=3){
  const cells=Object.fromEntries(COHORT_KEYS.map((k,i)=>[k,{key:k,value,status:'VALID_SIGNAL',confidence:70+i%5,baselineQuality:80,evidenceCount:2,independentEventCount:2,lastValidatedAt:null,reason:null,components:{personalEffect:1,partyEffect:0,regionalEffect:0,competitorEffect:0,issueEffect:1,externalAnchorEffect:0,historyPriorEffect:0}}]));
  return {engineVersion:'JCS_AGE_GENDER_INTELLIGENCE_V2',asOf:'2026-08-30T00:00:00.000Z',baseline:{kind:'DIRECT_CANDIDATE',quality:80,sourceState:'TEST',limitedReasons:[]},cells,age:{},gender:{},summary:{strongestPositive:{cohort:'18–29 M',value}},validity:{state:'VALID_SIGNAL',validCellCount:12,totalCellCount:12,independentEventCount:2,evidenceCount:2,historyDays:30,confidenceThreshold:55}};
}

test('V2 store uses isolated prefix and compact snapshot round-trips',()=>{
  const store=require('../server/v3/lib/political-intelligence-v2-store');
  assert.equal(store.PREFIX,'jcv3:intelligence:v2');
  assert.equal(store.STORE_VERSION,'JCS_POLITICAL_INTELLIGENCE_SNAPSHOT_V2');
  const snapshot={schemaVersion:2,draftId:'d1',publishedAt:'2026-08-30T00:00:00.000Z',people:{p:store.packCohorts(cohortLayer(7))}};
  const packed=store.encodeSnapshot(snapshot);const decoded=store.decodeSnapshot(packed.encoded);
  assert.deepEqual(decoded,snapshot);
  const expanded=store.unpackCohorts(decoded.people.p);
  assert.equal(expanded.cells['18_29_m'].value,7);
  assert.equal(expanded.cells['18_29_m'].status,'VALID_SIGNAL');
});

test('registry-only baseline refuses to create a misleading active V2 snapshot',async()=>{
  const {createPoliticalIntelligenceV2Store}=require('../server/v3/lib/political-intelligence-v2-store');
  let writes=0;
  const store=createPoliticalIntelligenceV2Store({hasTrustedBaselineV2:()=>false,command:async args=>{if(args[0]==='SET'||args[0]==='ZADD')writes++;return null;}});
  const result=await store.recordPoliticalIntelligenceSnapshotV2({current:{draftId:'d',publishedAt:'2026-08-30T00:00:00.000Z',ranked:[{person:{id:'p'}}]}});
  assert.equal(result.skipped,true);assert.equal(result.error,'BASELINE_INGESTION_REQUIRED');assert.equal(writes,0);
});

test('ready V2 store writes immutable snapshot once and returns cached latest person on repeat navigation',async()=>{
  const {createPoliticalIntelligenceV2Store}=require('../server/v3/lib/political-intelligence-v2-store');
  const db=new Map();let gets=0;
  const command=async args=>{const [op,key,...rest]=args;if(op==='GET'){gets++;return db.get(key)||null;}if(op==='SET'){if(rest.includes('NX')&&db.has(key))return null;db.set(key,rest[0]);return 'OK';}if(op==='ZADD'){db.set('index:last',rest[1]);return 1;}if(op==='ZREVRANGE')return db.has('index:last')?[db.get('index:last')]:[];throw new Error(op);};
  const current={draftId:'d1',publishedAt:'2026-08-30T00:00:00.000Z',ranked:[{person:{id:'p',name:'P'}}]};
  const fakeView={row:{person:{id:'p',name:'P'},news:{headlines:[]}},analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50}},trend:{points:[]}};
  const store=createPoliticalIntelligenceV2Store({command,hasTrustedBaselineV2:()=>true,derivePersonView:()=>fakeView,getAgeGenderBaselineV2:()=>({personId:'p',baselineKind:'DIRECT_CANDIDATE',baselineQuality:80,populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(0),sourceState:'TEST',limitedReasons:[]}),getPoliticalIntelligenceEvidence:()=>({sources:[]}),derivePoliticalIntelligenceV1:()=>({version:'JCS_POLITICAL_INTELLIGENCE_V1_2',validity:{state:'VALID'}}),derivePoliticalIntelligenceV2:()=>({version:'JCS_POLITICAL_INTELLIGENCE_V2',cohorts:cohortLayer(4)})});
  const first=await store.recordPoliticalIntelligenceSnapshotV2({current,legacyHistory:{items:[]},personViews:[fakeView],evidenceBundle:{records:[]}});
  assert.equal(first.created,true);assert.equal(first.rosterTotal,1);
  const a=await store.readLatestPoliticalIntelligenceSnapshotPersonV2('p');const b=await store.readLatestPoliticalIntelligenceSnapshotPersonV2('p');
  assert.equal(a.cohorts.cells['18_29_m'].value,4);assert.equal(b.cohorts.cells['18_29_m'].value,4);
  assert.ok(gets<=4,'warm latest snapshot should not repeatedly decode storage');
});

test('542-person compact snapshot stays below 80% of hard storage budget',()=>{
  const store=require('../server/v3/lib/political-intelligence-v2-store');
  const people={};for(let i=0;i<542;i++)people[`p${i}`]=store.packCohorts(cohortLayer((i%21)-10));
  const packed=store.encodeSnapshot({schemaVersion:2,draftId:'synthetic',publishedAt:'2026-08-30T00:00:00.000Z',people});
  assert.ok(packed.compressedBytes<store.MAX_COMPRESSED_BYTES*.8,`${packed.compressedBytes} vs ${store.MAX_COMPRESSED_BYTES}`);
});

test('calculation hotfix writes a fresh snapshot instead of reusing the legacy flat snapshot for the same draft',async()=>{
  const mod=require('../server/v3/lib/political-intelligence-v2-store');
  const {createPoliticalIntelligenceV2Store}=mod;
  const db=new Map();
  const legacy={schemaVersion:2,draftId:'d-flat',publishedAt:'2026-08-30T00:00:00.000Z',people:{p:mod.packCohorts(cohortLayer(10))}};
  db.set(`${mod.PREFIX}:snapshot:d-flat`,mod.encodeSnapshot(legacy).encoded);
  const command=async args=>{const [op,key,...rest]=args;if(op==='GET')return db.get(key)||null;if(op==='SET'){if(rest.includes('NX')&&db.has(key))return null;db.set(key,rest[0]);return 'OK';}if(op==='ZADD'){db.set(`index:${key}`,rest[1]);return 1;}if(op==='ZREVRANGE'){const v=db.get(`index:${key}`);return v?[v]:[];}throw new Error(op);};
  const current={draftId:'d-flat',publishedAt:'2026-08-30T01:00:00.000Z',ranked:[{person:{id:'p',name:'P'}}]};
  const fakeView={row:{person:{id:'p',name:'P'},news:{headlines:[]}},analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50}},trend:{points:[]}};
  const varied=cohortLayer(4);let i=0;for(const row of Object.values(varied.cells))row.value=4+(i++%4);
  const store=createPoliticalIntelligenceV2Store({command,hasTrustedBaselineV2:()=>true,derivePersonView:()=>fakeView,getAgeGenderBaselineV2:()=>({personId:'p',baselineKind:'DIRECT_CANDIDATE',baselineQuality:80,populationWeights:Array(12).fill(1/12),cohortAffinity:Array.from({length:12},(_,j)=>(j-5.5)/100),sourceState:'TEST',limitedReasons:[]}),getPoliticalIntelligenceEvidence:()=>({sources:[]}),derivePoliticalIntelligenceV1:()=>({version:'JCS_POLITICAL_INTELLIGENCE_V1_2',validity:{state:'VALID'}}),derivePoliticalIntelligenceV2:()=>({version:'JCS_POLITICAL_INTELLIGENCE_V2',cohorts:varied})});
  const written=await store.recordPoliticalIntelligenceSnapshotV2({current,legacyHistory:{items:[]},personViews:[fakeView],evidenceBundle:{records:[]}});
  assert.equal(written.created,true,'same draft must get a new calculation-revision snapshot');
  const latest=await store.readLatestPoliticalIntelligenceSnapshotPersonV2('p');
  assert.ok(latest);
  assert.equal(latest.calculationRevision,mod.CALCULATION_REVISION);
  assert.ok(new Set(Object.values(latest.cohorts.cells).map(x=>x.value)).size>1,'new latest snapshot must not be the old flat values');
});
