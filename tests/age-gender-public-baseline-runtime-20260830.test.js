const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const builderPath='../server/v3/tools/build-age-gender-baseline-v2';

function vector(seed=1){return Array.from({length:12},(_,i)=>seed+(i%3));}
function popRow({sido='경기',sgg='화성시',dong='가동',young=50,old=20}={}){
  return {시도명:sido,시군구명:sgg,읍면동명:dong,'18세남자':String(young),'18세여자':String(young+2),'30세남자':'40','30세여자':'42','40세남자':'35','40세여자':'37','50세남자':'30','50세여자':'32','60세남자':'25','60세여자':'27','70세남자':String(old),'100세이상여자':'3'};
}

test('data.go.kr keyless file client resolves detail metadata and downloads raw file',async()=>{
  const {downloadDataGoFile}=require('../server/v3/lib/public-baseline-source-client');
  const calls=[];
  const response=(body,{status=200,headers={}}={})=>({ok:status>=200&&status<300,status,headers:{get:k=>headers[String(k).toLowerCase()]||null},text:async()=>String(body),json:async()=>typeof body==='string'?JSON.parse(body):body,arrayBuffer:async()=>Buffer.isBuffer(body)?body:Buffer.from(String(body))});
  const fetchImpl=async(url)=>{
    calls.push(String(url));
    if(String(url).includes('/data/15025527/fileData.do'))return response(`<button onclick="fn_fileDataDown('15025527','uddi:abc-123','1')">down</button>`);
    if(String(url).includes('/tcs/dss/selectFileDataDownload.do'))return response({atchFileId:'FILE-1',fileDetailSn:1,dataSetFileDetailInfo:{dataNm:'선거.csv'}});
    if(String(url).includes('/cmm/cmm/fileDownload.do'))return response(Buffer.from('a,b\n1,2\n'),{headers:{'content-type':'text/csv'}});
    throw new Error(`unexpected ${url}`);
  };
  const out=await downloadDataGoFile({publicDataPk:'15025527',fetchImpl});
  assert.equal(out.publicDataDetailPk,'uddi:abc-123');
  assert.equal(out.fileName,'선거.csv');
  assert.equal(out.bytes.toString('utf8'),'a,b\n1,2\n');
  assert.equal(calls.length,3);
});

test('public text decoder supports CP949/EUC-KR and UTF-8',()=>{
  const {decodePublicText}=require('../server/v3/lib/public-baseline-source-client');
  assert.equal(decodePublicText(Buffer.from([0xB0,0xA1]),'text/csv; charset=euc-kr'),'가');
  assert.equal(decodePublicText(Buffer.from('\ufeff가','utf8'),'text/csv; charset=utf-8'),'가');
});

test('population aggregation recognizes official suffix sex headers including 100-plus',()=>{
  const {aggregatePopulationRow}=require(builderPath);
  const row={'18세남자':'10','18세여자':'11','29세남자':'12','29세여자':'13','30세남자':'20','30세여자':'21','40세남자':'30','40세여자':'31','50세남자':'40','50세여자':'41','60세남자':'50','60세여자':'51','70세남자':'60','100세이상여자':'7'};
  const v=aggregatePopulationRow(row);
  assert.deepEqual(v,[22,24,20,21,30,31,40,41,50,51,60,7]);
});

test('direct baseline geography matcher disambiguates duplicate dong names with province and municipality context',()=>{
  const {buildDirectBaselines}=require(builderPath);
  const roster=[{id:'p',name:'김철수',jurisdiction:'경기 화성시을',region:'경기',type:'assembly',party:'A'}];
  const electionRows=[];
  for(const [dong,share] of [['가동',70],['나동',60],['다동',40],['라동',30]]){
    electionRows.push({시도명:'경기',선거구명:'화성시을',법정읍면동명:dong,후보자:'A당 김철수',득표수:String(share)});
    electionRows.push({시도명:'경기',선거구명:'화성시을',법정읍면동명:dong,후보자:'B당 상대',득표수:String(100-share)});
  }
  const populationRows=[
    popRow({sido:'서울특별시',sgg:'중구',dong:'가동',young:1,old:100}),
    popRow({sido:'경기도',sgg:'화성시',dong:'가동',young:100,old:1}),
    popRow({sido:'경기도',sgg:'화성시',dong:'나동',young:80,old:20}),
    popRow({sido:'경기도',sgg:'화성시',dong:'다동',young:30,old:70}),
    popRow({sido:'경기도',sgg:'화성시',dong:'라동',young:10,old:90})
  ];
  const built=buildDirectBaselines({electionRows,populationRows,roster,electionDate:'2024-04-10'});
  assert.ok(built.people.p,'candidate with party-prefixed field should resolve');
  assert.equal(built.people.p.matchedGeoUnits,4);
  assert.ok(built.people.p.cohortAffinity[0]>built.people.p.cohortAffinity[10]);
});

test('proportional party ecological profiles are derived from official party vote rows',()=>{
  const {buildPartyBaselines}=require(builderPath);
  const populationRows=[popRow({sido:'경기',sgg:'화성시',dong:'가동',young:100,old:10}),popRow({sido:'경기',sgg:'화성시',dong:'나동',young:70,old:30}),popRow({sido:'경기',sgg:'화성시',dong:'다동',young:30,old:70}),popRow({sido:'경기',sgg:'화성시',dong:'라동',young:10,old:100})];
  const rows=[];for(const [dong,a] of [['가동',75],['나동',65],['다동',35],['라동',25]]){rows.push({시도명:'경기',구시군명:'화성시',읍면동명:dong,정당:'미래당',득표수:String(a)});rows.push({시도명:'경기',구시군명:'화성시',읍면동명:dong,정당:'다른당',득표수:String(100-a)});}
  const profiles=buildPartyBaselines({electionRows:rows,populationRows,partyAliases:{'미래당':'현재당'},electionDate:'2024-04-10'});
  assert.ok(profiles.현재당);
  assert.equal(profiles.현재당.baselineKind,'PARTY_PROXY');
  assert.ok(profiles.현재당.cohortAffinity[0]>profiles.현재당.cohortAffinity[10]);
});

test('proxy builder crosses politician types and gives independents an explicit regional/national official proxy',()=>{
  const {applyProxyBaselines}=require(builderPath);
  const v=Array(12).fill(1/12),a=Array(12).fill(.05);
  const directPeople={d:{personId:'d',name:'직접',type:'assembly',party:'A',jurisdiction:'서울 종로구',baselineKind:'DIRECT_CANDIDATE',baselineQuality:78,populationWeights:v,cohortAffinity:a,sourceState:'TEST'}};
  const rows=[directPeople.d,{personId:'m',name:'광역',type:'metropolitan',party:'A',jurisdiction:'서울',baselineKind:'LIMITED',baselineQuality:0},{personId:'i',name:'무소속',type:'basic',party:'무소속',jurisdiction:'서울 중구',baselineKind:'LIMITED',baselineQuality:0}];
  const partyProfiles={A:{party:'A',baselineKind:'PARTY_PROXY',baselineQuality:60,populationWeights:v,cohortAffinity:a,sourceState:'OFFICIAL_PROPORTIONAL'}};
  const out=applyProxyBaselines({rows,directPeople,partyProfiles,electionDate:'2024-04-10'});const by=Object.fromEntries(out.map(x=>[x.personId,x]));
  assert.equal(by.m.baselineKind,'PARTY_PROXY');
  assert.notEqual(by.i.baselineKind,'LIMITED');
  assert.ok(by.i.baselineQuality>=20);
});

test('runtime Redis baseline bundle round-trips compressed data and falls back only when absent',async()=>{
  const {createAgeGenderBaselineV2Store}=require('../server/v3/lib/age-gender-baseline-v2-store');
  const db=new Map();const command=async args=>{if(args[0]==='GET')return db.get(args[1])||null;if(args[0]==='SET'){db.set(args[1],args[2]);return 'OK';}throw new Error(args[0]);};
  const fallback={schemaVersion:2,baselineVersion:'JCS_AGE_GENDER_BASELINE_V2',manifest:{trustedBaselineReady:false},people:{}};
  const store=createAgeGenderBaselineV2Store({command,staticBundle:fallback});
  assert.equal((await store.readAgeGenderBaselineBundleV2()).manifest.trustedBaselineReady,false);
  const bundle={schemaVersion:2,baselineVersion:'JCS_AGE_GENDER_BASELINE_V2',generatedAt:'2026-08-30T00:00:00.000Z',manifest:{trustedBaselineReady:true,rosterTotal:1,directCount:1,limitedCount:0},people:{p:{personId:'p',baselineKind:'DIRECT_CANDIDATE',baselineQuality:80,populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(0)}}};
  await store.writeAgeGenderBaselineBundleV2(bundle);
  const got=await store.readAgeGenderBaselineBundleV2({fresh:true});
  assert.equal(got.people.p.baselineQuality,80);assert.equal(got.manifest.trustedBaselineReady,true);
});

test('V2 snapshot store consumes one trusted runtime bundle instead of static registry',async()=>{
  const {createPoliticalIntelligenceV2Store}=require('../server/v3/lib/political-intelligence-v2-store');
  const db=new Map();const command=async args=>{const [op,key,...rest]=args;if(op==='GET')return db.get(key)||null;if(op==='SET'){db.set(key,rest[0]);return 'OK';}if(op==='ZADD'){db.set('last',rest[1]);return 1;}if(op==='ZREVRANGE')return db.has('last')?[db.get('last')]:[];throw new Error(op);};
  const runtimeBundle={manifest:{trustedBaselineReady:true},people:{p:{personId:'p',baselineKind:'DIRECT_CANDIDATE',baselineQuality:80,populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(0),sourceState:'RUNTIME',limitedReasons:[]}}};
  const fakeView={row:{person:{id:'p',name:'P'},news:{headlines:[]}},analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50}},trend:{points:[]}};
  const cells=Object.fromEntries(['18_29_m','18_29_f','30_39_m','30_39_f','40_49_m','40_49_f','50_59_m','50_59_f','60_69_m','60_69_f','70_plus_m','70_plus_f'].map(k=>[k,{key:k,value:1,status:'VALID_SIGNAL',confidence:70,components:{}}]));
  const store=createPoliticalIntelligenceV2Store({command,readAgeGenderBaselineBundleV2:async()=>runtimeBundle,derivePersonView:()=>fakeView,getPoliticalIntelligenceEvidence:()=>({sources:[]}),derivePoliticalIntelligenceV1:()=>({validity:{state:'VALID'}}),derivePoliticalIntelligenceV2:()=>({cohorts:{asOf:'2026-08-30T00:00:00.000Z',baseline:{kind:'DIRECT_CANDIDATE',quality:80},cells,age:{},gender:{},summary:{},validity:{validCellCount:12}}})});
  const result=await store.recordPoliticalIntelligenceSnapshotV2({current:{draftId:'r1',publishedAt:'2026-08-30T00:00:00.000Z',ranked:[{person:{id:'p',name:'P'}}]},personViews:[fakeView],legacyHistory:{items:[]}});
  assert.equal(result.created,true);assert.equal(result.rosterTotal,1);
});

test('admin full refresh includes official age-gender baseline collection before finalize',()=>{
  const route=fs.readFileSync(path.join(__dirname,'../server/v3/routes/admin/now-data.js'),'utf8');
  const ui=fs.readFileSync(path.join(__dirname,'../src/views/admin.js'),'utf8');
  assert.match(route,/collect-age-gender-baseline/);
  const ext=ui.indexOf('collect-external-evidence'),base=ui.indexOf('collect-age-gender-baseline'),fin=ui.indexOf('action:"finalize"');
  assert.ok(ext>=0&&base>ext&&fin>base,`order ${ext}/${base}/${fin}`);
});

test('synthetic official collector can produce usable coverage for every roster person',async()=>{
  const {collectOfficialAgeGenderBaseline}=require('../server/v3/lib/age-gender-public-baseline-collector');
  const roster=[{id:'a',name:'김철수',type:'assembly',party:'현재당',jurisdiction:'경기 화성시을',region:'경기'},{id:'b',name:'시장',type:'basic',party:'현재당',jurisdiction:'경기 화성시',region:'경기'},{id:'c',name:'무소속',type:'basic',party:'무소속',jurisdiction:'경기 수원시',region:'경기'}];
  const election=['시도명,선거구명,법정읍면동명,후보자,득표수'];
  for(const [dong,share] of [['가동',70],['나동',60],['다동',40],['라동',30]]){election.push(`경기,화성시을,${dong},현재당 김철수,${share}`);election.push(`경기,화성시을,${dong},다른당 상대,${100-share}`);}
  const pop=['시도명,시군구명,읍면동명,18세남자,18세여자,30세남자,30세여자,40세남자,40세여자,50세남자,50세여자,60세남자,60세여자,70세남자,70세여자'];
  for(const [dong,y,o] of [['가동',100,10],['나동',70,30],['다동',30,70],['라동',10,100]])pop.push(`경기도,화성시,${dong},${y},${y},40,40,35,35,30,30,25,25,${o},${o}`);
  const proportional=['시도명,구시군명,읍면동명,정당,득표수'];for(const [dong,share] of [['가동',65],['나동',60],['다동',40],['라동',35]]){proportional.push(`경기,화성시,${dong},미래당,${share}`);proportional.push(`경기,화성시,${dong},다른당,${100-share}`);}
  const files={population:Buffer.from(pop.join('\n')),constituency:Buffer.from(election.join('\n')),proportional:Buffer.from(proportional.join('\n'))};
  const result=await collectOfficialAgeGenderBaseline({people:roster,downloadSource:async def=>({bytes:files[def.id],fileName:`${def.id}.csv`,url:`https://example.test/${def.id}`,contentType:'text/csv'}),partyAliases:{미래당:'현재당'}});
  assert.equal(result.manifest.rosterTotal,3);assert.equal(result.manifest.limitedCount,0);assert.equal(result.manifest.trustedBaselineReady,true);
  assert.equal(Object.keys(result.people).length,3);
});

test('universal fallback labels national structural evidence correctly when no same-region direct references exist',()=>{
  const {applyProxyBaselines}=require(builderPath);
  const v=Array(12).fill(1/12),a=Array(12).fill(.02);
  const directPeople={d:{personId:'d',name:'타지역',type:'assembly',party:'A',jurisdiction:'부산 해운대구',baselineKind:'DIRECT_CANDIDATE',baselineQuality:80,populationWeights:v,cohortAffinity:a,sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE'}};
  const rows=[directPeople.d,{personId:'i',name:'무소속',type:'basic',party:'무소속',jurisdiction:'서울 중구',baselineKind:'LIMITED',baselineQuality:0}];
  const out=applyProxyBaselines({rows,directPeople,partyProfiles:{},electionDate:'2024-04-10',allowUniversalProxy:true});
  const proxy=out.find(x=>x.personId==='i');
  assert.equal(proxy.baselineKind,'REGIONAL_PARTY_PROXY');
  assert.equal(proxy.sourceState,'OFFICIAL_FILE_NATIONAL_STRUCTURAL_PROXY');
  assert.equal(proxy.proxyReferenceCount,1);
});

test('universal structural proxy prefers a stronger national reference pool over a single thin regional reference',()=>{
  const {applyProxyBaselines}=require(builderPath);
  const v=Array(12).fill(1/12),a=Array(12).fill(.03);
  const refs=[
    ['r','서울 종로구'],['n1','부산 해운대구'],['n2','경기 수원시'],['n3','인천 남동구'],['n4','대전 서구'],['n5','광주 북구']
  ].map(([id,jurisdiction])=>({personId:id,name:id,type:'assembly',party:'A',jurisdiction,baselineKind:'DIRECT_CANDIDATE',baselineQuality:78,populationWeights:v,cohortAffinity:a,sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:8}));
  const directPeople=Object.fromEntries(refs.map(x=>[x.personId,x]));
  const target={personId:'i',name:'무소속',type:'basic',party:'무소속',jurisdiction:'서울 중구',baselineKind:'LIMITED',baselineQuality:0};
  const out=applyProxyBaselines({rows:[...refs,target],directPeople,partyProfiles:{},electionDate:'2024-04-10',allowUniversalProxy:true});
  const proxy=out.find(x=>x.personId==='i');
  assert.equal(proxy.sourceState,'OFFICIAL_FILE_NATIONAL_STRUCTURAL_PROXY');
  assert.ok(proxy.proxyReferenceCount>=6);
  assert.ok(proxy.baselineQuality>=50);
});

test('synthetic full-refresh baseline makes every covered politician produce age-gender values with complete NOW inputs',async()=>{
  const {collectOfficialAgeGenderBaseline}=require('../server/v3/lib/age-gender-public-baseline-collector');
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const roster=[{id:'a',name:'김철수',type:'assembly',party:'현재당',jurisdiction:'경기 화성시을',region:'경기'},{id:'b',name:'시장',type:'basic',party:'현재당',jurisdiction:'경기 화성시',region:'경기'},{id:'c',name:'무소속',type:'basic',party:'무소속',jurisdiction:'경기 수원시',region:'경기'}];
  const units=Array.from({length:30},(_,i)=>({dong:`${i+1}동`,share:Math.max(22,78-i*2),young:180-i*4,old:20+i*4}));
  const election=['시도명,선거구명,법정읍면동명,후보자,득표수'];for(const {dong,share} of units){election.push(`경기,화성시을,${dong},현재당 김철수,${share}`);election.push(`경기,화성시을,${dong},다른당 상대,${100-share}`);}
  const pop=['시도명,시군구명,읍면동명,18세남자,18세여자,30세남자,30세여자,40세남자,40세여자,50세남자,50세여자,60세남자,60세여자,70세남자,70세여자'];for(const {dong,young,old} of units)pop.push(`경기도,화성시,${dong},${young},${young+2},80,82,65,67,50,52,35,37,${old},${old+2}`);
  const proportional=['시도명,구시군명,읍면동명,정당,득표수'];for(const {dong,share} of units){const p=Math.max(20,Math.min(80,share-5));proportional.push(`경기,화성시,${dong},미래당,${p}`);proportional.push(`경기,화성시,${dong},다른당,${100-p}`);}
  const files={population:Buffer.from(pop.join('\n')),constituency:Buffer.from(election.join('\n')),proportional:Buffer.from(proportional.join('\n'))};
  const bundle=await collectOfficialAgeGenderBaseline({people:roster,downloadSource:async def=>({bytes:files[def.id],fileName:`${def.id}.csv`,url:`https://example.test/${def.id}`,contentType:'text/csv'}),partyAliases:{미래당:'현재당'}});
  for(const person of roster){
    const view={row:{person,search:{state:'READY',monthlyTotalQcCnt:100},news:{state:'READY',headlines:[],count24:4}},rankDelta:0,analysis:{scores:{overallInterest:55,highEngagement:54,massExpansion:53,activity:52,issueHeat:56,mediaSpread:55}}};
    const out=deriveAgeGenderCohortsV2({person,baseline:bundle.people[person.id],view,history:{summary:{dailySampleSize:0,coreDeltas:{}}},evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'});
    assert.equal(out.validity.validCellCount,12,`${person.id}/${bundle.people[person.id].baselineKind}/${bundle.people[person.id].baselineQuality}/${bundle.people[person.id].sourceState}`);
  }
});

test('low-quality direct candidate estimate is stabilized by a strong official party profile instead of being left as a weak direct fit',()=>{
  const {applyProxyBaselines}=require(builderPath);
  const v=Array(12).fill(1/12),directAffinity=Array(12).fill(.08),partyAffinity=Array(12).fill(.02);
  const low={personId:'d',name:'직접',type:'assembly',party:'A',jurisdiction:'서울 갑',baselineKind:'DIRECT_CANDIDATE',baselineQuality:35,populationWeights:v,cohortAffinity:directAffinity,sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',matchedGeoUnits:4};
  const partyProfiles={A:{party:'A',baselineKind:'PARTY_PROXY',baselineQuality:64,populationWeights:v,cohortAffinity:partyAffinity,sourceState:'OFFICIAL_PROPORTIONAL_ECOLOGICAL_ESTIMATE',matchedGeoUnits:120}};
  const out=applyProxyBaselines({rows:[low],directPeople:{d:low},partyProfiles,electionDate:'2024-04-10',allowUniversalProxy:true});
  const row=out[0];
  assert.equal(row.baselineKind,'DIRECT_CANDIDATE');
  assert.match(row.sourceState,/DIRECT_PLUS_PARTY_SHRINKAGE/);
  assert.ok(row.baselineQuality>=55,`quality ${row.baselineQuality}`);
  assert.ok(row.cohortAffinity[0]<directAffinity[0]&&row.cohortAffinity[0]>partyAffinity[0]);
});

test('official structural baseline plus complete current analysis can publish all 12 cohort values even when raw source readiness is absent',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const person={id:'proxy',name:'프록시',type:'basic',party:'A',jurisdiction:'경기 수원시'};
  const baseline={personId:'proxy',baselineKind:'REGIONAL_PARTY_PROXY',baselineQuality:50,populationWeights:Array(12).fill(1/12),cohortAffinity:Array.from({length:12},(_,i)=>(i%2?-.01:.01)),sourceState:'OFFICIAL_FILE_NATIONAL_STRUCTURAL_PROXY',proxyReferenceCount:25,proxyEvidenceUnitCount:180};
  const view={row:{person},rankDelta:0,analysis:{scores:{overallInterest:52,highEngagement:53,massExpansion:51,activity:52,issueHeat:54,mediaSpread:53}}};
  const out=deriveAgeGenderCohortsV2({person,baseline,view,history:{summary:{dailySampleSize:0,coreDeltas:{}}},evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'});
  assert.equal(out.validity.validCellCount,12,JSON.stringify(out.validity));
  for(const cell of Object.values(out.cells))assert.equal(cell.status,'VALID_SIGNAL');
});

test('runtime official source registry uses verified keyless public file datasets',()=>{
  const {SOURCE_DEFS}=require('../server/v3/lib/age-gender-public-baseline-collector');
  assert.equal(SOURCE_DEFS.population.publicDataPk,'15099158');
  assert.equal(SOURCE_DEFS.constituency.publicDataPk,'15025527');
  assert.equal(SOURCE_DEFS.proportional.publicDataPk,'15144273');
});

test('external baseline refresh cache-busts app shell and every admin module dynamic import',()=>{
  const index=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  const app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
  assert.match(index,/official-age-gender-baseline-v1/);
  const imports=[...app.matchAll(/\.\/views\/admin\.js\?v=([^"']+)/g)].map(m=>m[1]);
  assert.ok(imports.length>5,'admin dynamic imports should exist');
  assert.ok(imports.every(v=>v.includes('official-age-gender-baseline-v1')),new Set(imports));
});
