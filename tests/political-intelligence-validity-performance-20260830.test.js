const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function baseRow(){
  return {
    person:{id:'assembly-023',name:'이준석',type:'assembly',party:'개혁신당',jurisdiction:'경기 화성시을'},
    rank:11,score:72,
    search:{state:'READY',monthlyPcQcCnt:1000,monthlyMobileQcCnt:3000,monthlyTotalQcCnt:4000},
    news:{state:'READY',count6:3,count24:8,count7d:20,sources24:5,headlines:[]}
  };
}

function history(){return {observations:[],daily:[],summary:{rawSampleSize:0,dailySampleSize:0,coreDeltas:{},rankDelta:{}}};}

test('missing current analysis is explicitly insufficient instead of manufacturing -50 values',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const result=derivePoliticalIntelligenceV1({
    view:{row:baseRow(),rankDelta:0,related:[],analysis:{scores:{}}},
    history:history(),evidence:{sources:[],demographic:null},asOf:'2026-08-30T00:00:00.000Z'
  });
  assert.equal(result.version,'JCS_POLITICAL_INTELLIGENCE_V1_2');
  assert.equal(result.validity.state,'INSUFFICIENT_DATA');
  assert.deepEqual(result.support.ageMomentum,{age2030:null,age4050:null,age60plus:null});
  assert.equal(result.support.coreAttritionPct,null);
  assert.equal(result.support.newSupportInflowPct,null);
  assert.deepEqual(result.media.momentum,{news:null,youtube:null,sns:null,community:null});
  assert.equal(result.resilience.score,null);
  assert.equal(result.attentionSupportGap.gap,null);
  assert.equal(result.diagnosis.condition,null);
  assert.equal(result.strategicSolution.priorities.length,0);
});

test('valid core analysis with optional scores missing treats missing optional inputs as neutral, not -50',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const result=derivePoliticalIntelligenceV1({
    view:{row:baseRow(),rankDelta:0,related:[],analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50}}},
    history:history(),evidence:{sources:[],demographic:null},asOf:'2026-08-30T00:00:00.000Z'
  });
  assert.equal(result.validity.state,'VALID');
  for(const value of Object.values(result.support.ageMomentum))assert.notEqual(value,-50);
  for(const value of Object.values(result.media.momentum))assert.notEqual(value,-50);
  assert.ok(Number.isFinite(result.resilience.score));
});


test('null legacy HISTORY scores are ignored instead of being interpreted as zero',()=>{
  const { _internals }=require('../server/v3/lib/political-intelligence-v1');
  const h={observations:[
    {publishedAt:'2026-08-28T00:00:00.000Z',intelligence:{scores:{overallInterest:null}}},
    {publishedAt:'2026-08-29T00:00:00.000Z',intelligence:{scores:{overallInterest:60}}}
  ]};
  assert.equal(_internals.historyVolatility(h),0);
});

test('admin Intelligence UI renders missing axes and metrics as INSUFFICIENT DATA instead of zero',()=>{
  const source=read('src/views/people.js');
  assert.match(source,/INSUFFICIENT DATA/);
  const axis=source.slice(source.indexOf('function adminPiAxis'),source.indexOf('function adminPiMetric'));
  assert.match(axis,/piNumber\(value\)/);
  assert.match(axis,/raw===null/);
  assert.doesNotMatch(axis,/Number\(value\)\|\|0/);
});

test('admin person detail does not block first paint on HISTORY and hydrates Intelligence after DOM commit',()=>{
  const people=read('src/views/people.js');
  const app=read('src/app.js');
  const render=people.slice(people.indexOf('export async function renderPersonDetail'),people.length);
  assert.doesNotMatch(people,/^import\s+\{\s*getAdminHistoryPerson/m);
  assert.doesNotMatch(render,/await\s+getAdminHistoryPerson/);
  assert.match(people,/data-person-admin-intelligence-slot/);
  assert.match(people,/export async function hydratePersonAdminIntelligence/);
  assert.match(app,/hydratePersonAdminIntelligence/);
  assert.match(app,/requestAnimationFrame/);
});

test('detail HISTORY request uses compact view and person branch avoids 542-person overview',()=>{
  const repo=read('src/core/history-repository.js');
  const route=read('server/v3/routes/admin/history.js');
  assert.match(repo,/getAdminHistoryPersonDetail/);
  assert.match(repo,/view=detail/);
  const personPos=route.indexOf("view==='detail'");
  const overviewPos=route.indexOf('historyOverviewV2()');
  assert.ok(personPos>=0&&overviewPos>personPos,'compact person branch must return before full overview');
});

test('compatible frozen Intelligence is returned without reading large current NOW payload',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  let currentReads=0,liveDerives=0;
  const frozen={version:'JCS_POLITICAL_INTELLIGENCE_V1_2',validity:{state:'VALID'},asOf:'frozen'};
  const store=createHistoryV2Store({
    getJSON:async key=>{if(key==='nowDataCurrent')currentReads++;return null;},
    readLatestPoliticalIntelligenceSnapshotPersonV1:async()=>frozen,
    readPoliticalIntelligenceSnapshotPersonV1:async()=>null,
    derivePoliticalIntelligenceV1:()=>{liveDerives++;return {asOf:'live'};}
  });
  assert.deepEqual(await store.readPoliticalIntelligenceV2('assembly-023'),frozen);
  assert.equal(currentReads,0);
  assert.equal(liveDerives,0);
});

test('legacy pre-validity frozen Intelligence is not reused as the current answer',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  let liveDerives=0;
  const oldFrozen={version:'JCS_POLITICAL_INTELLIGENCE_V1_1',support:{ageMomentum:{age2030:-50,age4050:-50,age60plus:-50}}};
  const store=createHistoryV2Store({
    getJSON:async key=>key==='nowDataCurrent'?{draftId:'now-current',publishedAt:'2026-08-30T00:00:00.000Z',ranked:[{person:{id:'assembly-023'}}]}:{items:[]},
    readLatestPoliticalIntelligenceSnapshotPersonV1:async()=>oldFrozen,
    readPoliticalIntelligenceSnapshotPersonV1:async()=>null,
    derivePersonView:()=>({row:baseRow(),rankDelta:0,related:[],analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50}}}),
    getPoliticalIntelligenceEvidence:()=>({sources:[],demographic:null}),
    derivePoliticalIntelligenceV1:()=>{liveDerives++;return {version:'JCS_POLITICAL_INTELLIGENCE_V1_2',validity:{state:'VALID'},asOf:'live'};}
  });
  const result=await store.readPoliticalIntelligenceV2('assembly-023',history());
  assert.equal(result.version,'JCS_POLITICAL_INTELLIGENCE_V1_2');
  assert.equal(result.asOf,'live');
  assert.equal(liveDerives,1);
});

test('latest immutable snapshot reader caches decoded snapshot by draft for repeat admin detail navigation',async()=>{
  const {createPoliticalIntelligenceStore,encodeSnapshot}=require('../server/v3/lib/political-intelligence-store');
  const packed=encodeSnapshot({draftId:'d1',people:{a:{version:'JCS_POLITICAL_INTELLIGENCE_V1_2',marker:'A'},b:{version:'JCS_POLITICAL_INTELLIGENCE_V1_2',marker:'B'}}}).encoded;
  let gets=0;
  const store=createPoliticalIntelligenceStore({command:async args=>{
    if(args[0]==='ZREVRANGE')return ['d1'];
    if(args[0]==='GET'){gets++;return packed;}
    throw new Error('unsupported '+args[0]);
  }});
  assert.equal((await store.readLatestPoliticalIntelligenceSnapshotPersonV1('a')).marker,'A');
  assert.equal((await store.readLatestPoliticalIntelligenceSnapshotPersonV1('b')).marker,'B');
  assert.equal(gets,1,'same immutable snapshot should be decompressed/read once per warm runtime');
});
