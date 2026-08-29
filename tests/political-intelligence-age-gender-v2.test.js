const test=require('node:test');
const assert=require('node:assert/strict');
const {COHORT_KEYS}=require('../server/v3/lib/age-gender-baseline-v2');

function directBaseline(){return {personId:'p1',baselineKind:'DIRECT_CANDIDATE',baselineQuality:82,populationWeights:Array(12).fill(1/12),cohortAffinity:[.1,.05,.08,.04,0,-.03,-.02,-.04,.03,.02,.05,.04],sourceState:'OFFICIAL_FILE',limitedReasons:[]};}
function validView(headlines=[]){return {row:{person:{id:'p1',name:'테스트',party:'A',region:'서울',jurisdiction:'서울 테스트구'},news:{headlines},search:{state:'READY'}},rankDelta:2,analysis:{scores:{overallInterest:57,highEngagement:55,massExpansion:52,activity:54,issueHeat:60,mediaSpread:58}}};}
function validHistory(days=60){return {observations:[{publishedAt:'2026-08-28T00:00:00.000Z',intelligence:{scores:{overallInterest:52,highEngagement:51,massExpansion:50,mediaSpread:52,issueHeat:54}}},{publishedAt:'2026-08-29T00:00:00.000Z',intelligence:{scores:{overallInterest:57,highEngagement:55,massExpansion:52,mediaSpread:58,issueHeat:60}}}],daily:Array.from({length:days},(_,i)=>({date:`2026-07-${String((i%28)+1).padStart(2,'0')}`})),summary:{dailySampleSize:days,coreDeltas:{overallInterest:5,highEngagement:4,massExpansion:2,mediaSpread:6,issueHeat:6}}};}

test('limited structural baseline still publishes 12 JCS estimates from current real signals instead of hiding data',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const baseline={personId:'p1',baselineKind:'LIMITED',baselineQuality:0,populationWeights:Array(12).fill(null),cohortAffinity:Array(12).fill(null),limitedReasons:['TRUSTED_OFFICIAL_BASELINE_NOT_INGESTED']};
  const out=deriveAgeGenderCohortsV2({person:validView().row.person,baseline,view:validView([{title:'청년 주거 정책 지지 상승',source:'A'}]),history:validHistory(),evidence:{sources:[]}});
  assert.equal(out.validity.state,'VALID_SIGNAL');
  assert.equal(Object.keys(out.cells).length,12);
  for(const key of COHORT_KEYS){assert.ok(Number.isFinite(out.cells[key].value),key);assert.equal(out.cells[key].status,'VALID_SIGNAL',key);assert.ok(Number.isFinite(out.cells[key].confidence),key);}
});

test('direct baseline plus valid current inputs produces deterministic 12-cell output and aggregates',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const input={person:validView().row.person,baseline:directBaseline(),view:validView([{title:'청년 주거 정책 발표',source:'A'}]),history:validHistory(),evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'};
  const a=deriveAgeGenderCohortsV2(input),b=deriveAgeGenderCohortsV2(input);
  assert.deepEqual(a,b);
  assert.equal(Object.keys(a.cells).length,12);
  assert.equal(Object.keys(a.age).length,6);
  assert.equal(Object.keys(a.gender).length,2);
  assert.ok(Object.values(a.cells).some(x=>Number.isFinite(x.value)));
  for(const cell of Object.values(a.cells)){if(cell.value!==null){assert.ok(cell.value>=-50&&cell.value<=50);assert.ok(cell.confidence>=0&&cell.confidence<=100);}}
});

test('missing cells are excluded and aggregate weights renormalize instead of substituting zero',()=>{
  const {aggregateCells}=require('../server/v3/lib/age-gender-cohort-core')._internals;
  const cells={};for(const key of COHORT_KEYS)cells[key]={value:null,status:'LIMITED_SIGNAL',confidence:null};
  cells['18_29_m']={value:20,status:'VALID_SIGNAL',confidence:80};cells['18_29_f']={value:null,status:'LIMITED_SIGNAL',confidence:null};
  const age=aggregateCells(cells,Array(12).fill(1/12));
  assert.equal(age.age['18-29'].value,20);
  assert.notEqual(age.age['18-29'].value,10);
});

test('movement caps apply to a healthy prior, while a compressed prior is eligible for structural rebase',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const priorValues=[18,15,13,11,8,6,3,1,-2,-4,-7,-9];
  const previous={cohorts:{cells:Object.fromEntries(COHORT_KEYS.map((k,i)=>[k,{value:priorValues[i],status:'VALID_SIGNAL',confidence:80}]))}};
  const ordinary=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView([{title:'청년 정책 발표',source:'A'}]),history:validHistory(),evidence:{sources:[]},previous});
  COHORT_KEYS.forEach((k,i)=>assert.ok(Math.abs(ordinary.cells[k].value-priorValues[i])<=5,`ordinary cap ${k}:${ordinary.cells[k].value}`));
  const aligned=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView([{title:'청년 주거 정책 성과 확대',source:'A'},{title:'청년 취업 정책 지지 상승',source:'B'},{title:'청년 주택 정책 호평',source:'C'}]),history:validHistory(),evidence:{sources:[{fingerprint:'x1',values:{age2030:30}},{fingerprint:'x2',values:{age2030:32}}]},previous});
  COHORT_KEYS.forEach((k,i)=>assert.ok(Math.abs(aligned.cells[k].value-priorValues[i])<=10,`aligned cap ${k}:${aligned.cells[k].value}`));
  const anchored=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView(),history:validHistory(),evidence:{sources:[{fingerprint:'anchor',sourceType:'POLL_AGE_GENDER_SUPPORT',observedAt:'2026-08-20',values:{'18_29_m':45,'18_29_f':40}}]},previous,asOf:'2026-08-30T00:00:00.000Z'});
  assert.ok(Math.abs(anchored.cells['18_29_m'].value-priorValues[0])<=15);
});

test('duplicate headlines from one event count as propagation, not independent causal events',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const one=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView([{title:'청년 주거 정책 발표',source:'A'}]),history:validHistory(),evidence:{sources:[]}});
  const many=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView([{title:'청년 주거 정책 발표',source:'A'},{title:'청년 주거 정책 발표',source:'B'},{title:'청년 주거 정책 발표',source:'C'}]),history:validHistory(),evidence:{sources:[]}});
  assert.equal(many.validity.independentEventCount,one.validity.independentEventCount);
});

test('direct baseline receives more confidence than proxy baseline under identical evidence',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const direct=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView(),history:validHistory(),evidence:{sources:[]}});
  const proxy=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:{...directBaseline(),baselineKind:'REGIONAL_PARTY_PROXY',baselineQuality:40},view:validView(),history:validHistory(),evidence:{sources:[]}});
  assert.ok((direct.cells['18_29_m'].confidence||0)>(proxy.cells['18_29_m'].confidence||0));
});

test('V2 wrapper preserves V1 analysis while adding cohort intelligence and version metadata',()=>{
  const {derivePoliticalIntelligenceV2,VERSION}=require('../server/v3/lib/political-intelligence-v2');
  const v1={version:'JCS_POLITICAL_INTELLIGENCE_V1_2',diagnosis:{label:'테스트 진단',condition:5},support:{ageMomentum:{age2030:3,age4050:-1,age60plus:2}},media:{},strategicSolution:{priorities:[]},evidence:{external:[]}};
  const result=derivePoliticalIntelligenceV2({v1,view:validView(),history:validHistory(),evidence:{sources:[]},baseline:directBaseline(),asOf:'2026-08-30T00:00:00.000Z'});
  assert.equal(VERSION,'JCS_POLITICAL_INTELLIGENCE_V2');
  assert.equal(result.version,VERSION);
  assert.equal(result.engineVersion,'JCS_AGE_GENDER_INTELLIGENCE_V2');
  assert.equal(result.diagnosis.label,'테스트 진단');
  assert.ok(result.cohorts&&result.cohorts.cells);
});

test('party, regional, and competitor-relative context remain separate explainable cohort components',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const out=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView(),history:validHistory(),evidence:{sources:[]},marketContext:{partyMovement:6,regionalMovement:-4,competitorMovement:-3}});
  const c=out.cells['18_29_m'];
  assert.notEqual(c.components.partyEffect,0);
  assert.notEqual(c.components.regionalEffect,0);
  assert.notEqual(c.components.competitorEffect,0);
});

test('market context derives conservative relative party, region, and competitor movements from the current roster views',()=>{
  const {deriveMarketContextV2}=require('../server/v3/lib/age-gender-cohort-core');
  const mk=(id,party,jurisdiction,score,rankDelta=0)=>({row:{person:{id,name:id,party,type:'assembly',jurisdiction},news:{headlines:[]}},rankDelta,analysis:{scores:{overallInterest:score,highEngagement:score,massExpansion:score,issueHeat:score,mediaSpread:score}}});
  const self=mk('self','A','서울 갑',60,2);self.related=[{person:{id:'comp'}}];
  const views=[self,mk('a2','A','부산 갑',65,1),mk('a3','A','경기 갑',64,1),mk('comp','B','서울 을',70,3),mk('b2','B','경기 을',50,-1)];
  const context=deriveMarketContextV2({view:self,allViews:views});
  for(const key of ['partyMovement','regionalMovement','competitorMovement']) assert.ok(Number.isFinite(context[key]),key);
  assert.ok(Math.abs(context.partyMovement)<=8);
  assert.ok(Math.abs(context.regionalMovement)<=8);
  assert.ok(Math.abs(context.competitorMovement)<=8);
  assert.ok(context.competitorMovement<0,'stronger competitor should create negative relative pressure');
});

test('summary does not mislabel the immediately previous snapshot as a 30-day change or volatility proof',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const previous={cohorts:{cells:Object.fromEntries(COHORT_KEYS.map(k=>[k,{value:2,status:'VALID_SIGNAL',confidence:80}]))}};
  const out=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView(),history:validHistory(),evidence:{sources:[]},previous});
  assert.equal(out.summary.fastest30dChange,null);
  assert.equal(out.summary.mostStableCohort,null);
});

test('similar syndicated headlines are clustered as one causal event rather than counted independently',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const out=deriveAgeGenderCohortsV2({person:validView().row.person,baseline:directBaseline(),view:validView([
    {title:'이준석 청년 주거 정책 발표',source:'A',ts:Date.parse('2026-08-30T01:00:00Z')},
    {title:'청년 주거 정책, 이준석 발표',source:'B',ts:Date.parse('2026-08-30T02:00:00Z')},
    {title:'이준석, 청년 주거 정책을 발표했다',source:'C',ts:Date.parse('2026-08-30T03:00:00Z')}
  ]),history:validHistory(),evidence:{sources:[]}});
  assert.equal(out.validity.independentEventCount,1);
});

test('conflicting external cohort anchors reduce confidence compared with aligned anchors',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const base={person:validView().row.person,baseline:directBaseline(),view:validView(),history:validHistory(),asOf:'2026-08-30T00:00:00.000Z'};
  const aligned=deriveAgeGenderCohortsV2({...base,evidence:{sources:[{fingerprint:'a',observedAt:'2026-08-20',values:{'18_29_m':45}},{fingerprint:'b',observedAt:'2026-08-22',values:{'18_29_m':42}}]}});
  const conflict=deriveAgeGenderCohortsV2({...base,evidence:{sources:[{fingerprint:'c',observedAt:'2026-08-20',values:{'18_29_m':45}},{fingerprint:'d',observedAt:'2026-08-22',values:{'18_29_m':10}}]}});
  assert.ok((aligned.cells['18_29_m'].confidence||0)>(conflict.cells['18_29_m'].confidence||0));
});

test('official direct age-gender baseline with complete current NOW inputs is usable immediately without waiting for HISTORY',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const baseline={...directBaseline(),baselineQuality:70,cohortAffinity:Array(12).fill(0),sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:12};
  const view=validView();view.row.news={state:'READY',headlines:[],count24:4};
  const out=deriveAgeGenderCohortsV2({person:view.row.person,baseline,view,history:{summary:{dailySampleSize:0,coreDeltas:{}}},evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'});
  assert.equal(out.validity.validCellCount,12);
  for(const key of COHORT_KEYS){assert.equal(out.cells[key].status,'VALID_SIGNAL',key);assert.ok(Number.isFinite(out.cells[key].value),key);}
});

test('official proportional party ecological proxy can expose all 12 cells with lower confidence than direct evidence',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const view=validView();view.row.news={state:'READY',headlines:[],count24:4};
  const common={person:view.row.person,view,history:{summary:{dailySampleSize:0,coreDeltas:{}}},evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'};
  const direct=deriveAgeGenderCohortsV2({...common,baseline:{...directBaseline(),baselineQuality:75,cohortAffinity:Array(12).fill(0),sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:18}});
  const party=deriveAgeGenderCohortsV2({...common,baseline:{...directBaseline(),baselineKind:'PARTY_PROXY',baselineQuality:60,cohortAffinity:Array(12).fill(0),sourceState:'OFFICIAL_PROPORTIONAL_ECOLOGICAL_ESTIMATE',matchedGeoUnits:120,proxyReferenceCount:120}});
  assert.equal(party.validity.validCellCount,12);
  assert.ok(party.cells['18_29_m'].confidence<direct.cells['18_29_m'].confidence);
  assert.ok(party.cells['18_29_m'].confidence>=55);
});

test('regional structural proxy always returns estimates while confidence distinguishes stronger and weaker evidence',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const view=validView();view.row.news={state:'READY',headlines:[],count24:4};
  const common={person:view.row.person,view,history:{summary:{dailySampleSize:0,coreDeltas:{}}},evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'};
  const official=deriveAgeGenderCohortsV2({...common,baseline:{...directBaseline(),baselineKind:'REGIONAL_PARTY_PROXY',baselineQuality:56,cohortAffinity:Array(12).fill(0),sourceState:'OFFICIAL_FILE_REGIONAL_STRUCTURAL_PROXY',proxyReferenceCount:24}});
  const weak=deriveAgeGenderCohortsV2({...common,baseline:{...directBaseline(),baselineKind:'REGIONAL_PARTY_PROXY',baselineQuality:25,cohortAffinity:Array(12).fill(0),sourceState:'GENERIC_PROXY',proxyReferenceCount:1}});
  assert.equal(official.validity.validCellCount,12);
  assert.equal(weak.validity.validCellCount,12);
  assert.ok(weak.cells['18_29_m'].confidence<official.cells['18_29_m'].confidence);
  assert.ok(Number.isFinite(weak.cells['18_29_m'].value));
});

test('official 12-dimensional age-gender ecological baseline is treated as sex-specific evidence even when a fitted cell is neutral',()=>{
  const {cellConfidence}=require('../server/v3/lib/age-gender-cohort-core')._internals;
  const view=validView();view.row.news={state:'READY',headlines:[],count24:4};
  const baseline={...directBaseline(),baselineQuality:70,cohortAffinity:Array(12).fill(0),sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:10};
  const c=cellConfidence({baseline,view,history:{summary:{dailySampleSize:0}},events:[],evidence:{sources:[]},cellIndex:0,detailedAnchor:null,anchorAgreement:1,anchorFreshness:0});
  assert.ok(c>=55,`official neutral-sex cell confidence ${c}`);
});

test('high common momentum does not flatten a non-flat official age-gender baseline into one repeated score',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const baseline={...directBaseline(),sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:12};
  const view=validView([
    {title:'청년 주거 정책 성과 확대',source:'A'},
    {title:'청년 취업 정책 지지 상승',source:'B'},
    {title:'청년 주택 정책 호평',source:'C'}
  ]);
  view.rankDelta=10;
  view.analysis.scores={overallInterest:90,highEngagement:88,massExpansion:85,activity:80,issueHeat:92,mediaSpread:90};
  const history={daily:Array.from({length:60},()=>({})),summary:{dailySampleSize:60,coreDeltas:{overallInterest:20,highEngagement:18,massExpansion:16,mediaSpread:20,issueHeat:22}}};
  const out=deriveAgeGenderCohortsV2({person:view.row.person,baseline,view,history,evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'});
  const cellValues=COHORT_KEYS.map(k=>out.cells[k].value).filter(Number.isFinite);
  const ageValues=Object.values(out.age).map(x=>x.value).filter(Number.isFinite);
  assert.ok(new Set(cellValues).size>=3,`cohort cells flattened: ${cellValues.join(',')}`);
  assert.ok(new Set(ageValues).size>=2,`age aggregates flattened: ${ageValues.join(',')}`);
});

test('a previously flattened V2 snapshot does not permanently lock later official cohort values together',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const baseline={...directBaseline(),sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:12};
  const view=validView([{title:'청년 주거 정책 성과 확대',source:'A'}]);
  const previous={cohorts:{cells:Object.fromEntries(COHORT_KEYS.map(k=>[k,{value:10,status:'VALID_SIGNAL',confidence:80}]))}};
  const out=deriveAgeGenderCohortsV2({person:view.row.person,baseline,view,history:validHistory(),evidence:{sources:[]},previous,asOf:'2026-08-30T00:00:00.000Z'});
  const cellValues=COHORT_KEYS.map(k=>out.cells[k].value).filter(Number.isFinite);
  assert.ok(new Set(cellValues).size>=2,`flattened prior remained locked: ${cellValues.join(',')}`);
});

test('JCS cohort interpretation preserves a materially different age profile instead of compressing every age into adjacent integers',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const baseline={...directBaseline(),baselineQuality:82,sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:24,
    cohortAffinity:[.16,.13,.11,.09,.025,.015,-.025,-.035,-.07,-.08,-.12,-.13]};
  const view=validView([{title:'청년 일자리 주거 정책 지지 상승',source:'A'}]);
  const out=deriveAgeGenderCohortsV2({person:view.row.person,baseline,view,history:validHistory(),evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'});
  const ages=Object.fromEntries(Object.entries(out.age).map(([k,v])=>[k,v.value]));
  const values=Object.values(ages);
  assert.equal(values.every(Number.isFinite),true,JSON.stringify(ages));
  assert.ok(new Set(values).size>=4,`age profile still compressed: ${JSON.stringify(ages)}`);
  assert.ok(Math.max(...values)-Math.min(...values)>=12,`age spread too small: ${JSON.stringify(ages)}`);
  assert.ok(ages['18-29']-ages['70+']>=12,`structural direction lost: ${JSON.stringify(ages)}`);
});

test('low-confidence JCS estimates remain numeric; confidence describes uncertainty instead of hiding the data',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const baseline={...directBaseline(),baselineKind:'REGIONAL_PARTY_PROXY',baselineQuality:24,sourceState:'OFFICIAL_FILE_NATIONAL_STRUCTURAL_PROXY',proxyReferenceCount:3,
    cohortAffinity:[.10,.07,.08,.05,.02,.00,-.02,-.04,-.05,-.07,-.08,-.10]};
  const out=deriveAgeGenderCohortsV2({person:validView().row.person,baseline,view:validView(),history:{summary:{dailySampleSize:0,coreDeltas:{}}},evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'});
  for(const key of COHORT_KEYS){
    assert.ok(Number.isFinite(out.cells[key].value),`${key} hidden`);
    assert.ok(Number.isFinite(out.cells[key].confidence),`${key} confidence hidden`);
  }
  assert.equal(out.validity.validCellCount,12);
});
