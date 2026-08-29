const test=require('node:test');
const assert=require('node:assert/strict');
const {applyProxyBaselines}=require('../server/v3/tools/build-age-gender-baseline-v2');

const nonflat=[.16,.13,.11,.09,.03,.01,-.02,-.04,-.07,-.08,-.11,-.13];
const weights=[.08,.08,.09,.09,.09,.09,.09,.09,.08,.08,.07,.07];
function spread(v){const a=v.map(Number);const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/a.length);}
function direct(id,name,party='A',jurisdiction='서울 테스트구',aff=nonflat,q=80){return {personId:id,name,type:'assembly',party,jurisdiction,baselineKind:'DIRECT_CANDIDATE',baselineQuality:q,populationWeights:weights,cohortAffinity:aff,sourceState:'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE',limitedReasons:[],matchedGeoUnits:20};}

test('high-quality but flat direct fit is structurally refined from real party evidence instead of staying 12 identical cells',()=>{
  const target=direct('p1','대상','A','서울 테스트구',Array(12).fill(0),82);
  const partyProfiles={A:{party:'A',baselineKind:'PARTY_PROXY',baselineQuality:62,populationWeights:weights,cohortAffinity:nonflat,sourceState:'OFFICIAL_PROPORTIONAL_ECOLOGICAL_ESTIMATE',matchedGeoUnits:120}};
  const rows=applyProxyBaselines({rows:[target],directPeople:{p1:target},partyProfiles,electionDate:'2024-04-10',allowUniversalProxy:true});
  assert.ok(spread(rows[0].cohortAffinity)>.01,JSON.stringify(rows[0].cohortAffinity));
  assert.match(rows[0].sourceState,/SHRINKAGE|REFIN/);
});

test('flat party profile does not lock a politician to one cohort value when informative same-party official direct references exist',()=>{
  const refs=[direct('r1','참조1'),direct('r2','참조2','A','서울 다른구',nonflat.map((v,i)=>v+(i%2?-.01:.01)),76),direct('r3','참조3','A','경기 테스트시',nonflat.map(v=>v*.8),72)];
  const target={personId:'p2',name:'비지역구',type:'assembly',party:'A',jurisdiction:'',baselineKind:'LIMITED',baselineQuality:0,populationWeights:Array(12).fill(null),cohortAffinity:Array(12).fill(null),sourceState:'REGISTRY_ONLY',limitedReasons:[]};
  const flatParty={A:{party:'A',baselineKind:'PARTY_PROXY',baselineQuality:64,populationWeights:weights,cohortAffinity:Array(12).fill(0),sourceState:'OFFICIAL_PROPORTIONAL_ECOLOGICAL_ESTIMATE',matchedGeoUnits:120}};
  const rows=applyProxyBaselines({rows:[...refs,target],directPeople:Object.fromEntries(refs.map(r=>[r.personId,r])),partyProfiles:flatParty,electionDate:'2024-04-10',allowUniversalProxy:true});
  const out=rows.find(r=>r.personId==='p2');
  assert.ok(spread(out.cohortAffinity)>.01,JSON.stringify(out.cohortAffinity));
  assert.match(out.sourceState,/PARTY|STRUCTURAL/);
});


test('542-person scale: every politician remains numeric and flat source paths are refined when independent official structure exists',()=>{
  const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
  const registry=require('../server/v3/data/age-gender-baseline-v2.json');
  const people=Object.values(registry.people||{}).slice(0,542);
  assert.equal(people.length,542);
  const parties=[...new Set(people.map(p=>p.party).filter(Boolean))];
  const profiles=Object.fromEntries(parties.map((party,pi)=>[party,{party,baselineKind:'PARTY_PROXY',baselineQuality:60,populationWeights:weights,cohortAffinity:nonflat.map((v,i)=>v*(1-(pi%4)*.08)+(i%2?-.004:.004)),sourceState:'OFFICIAL_PROPORTIONAL_ECOLOGICAL_ESTIMATE',matchedGeoUnits:80}]));
  const rows=people.map((p,i)=>({...p,baselineKind:i<48?'DIRECT_CANDIDATE':'LIMITED',baselineQuality:i<48?78:0,populationWeights:i<48?weights:Array(12).fill(null),cohortAffinity:i<48?(i%5===0?Array(12).fill(0):nonflat.map((v,j)=>v+(j%2?-.002:.002))):Array(12).fill(null),sourceState:i<48?'OFFICIAL_FILE_ECOLOGICAL_ESTIMATE':'REGISTRY_ONLY',matchedGeoUnits:i<48?20:0}));
  const directPeople=Object.fromEntries(rows.filter(r=>r.baselineKind==='DIRECT_CANDIDATE').map(r=>[r.personId,r]));
  const refined=applyProxyBaselines({rows,directPeople,partyProfiles:profiles,electionDate:'2024-04-10',allowUniversalProxy:true});
  let numeric=0;
  for(const baseline of refined){
    const person={id:baseline.personId,name:baseline.name,type:baseline.type,party:baseline.party,jurisdiction:baseline.jurisdiction};
    const view={row:{person,search:{state:'READY',monthlyTotalQcCnt:100},news:{state:'READY',headlines:[{title:'경제 일자리 정책 발표',source:'A'}],count24:4}},rankDelta:1,analysis:{scores:{overallInterest:56,highEngagement:54,massExpansion:53,activity:52,issueHeat:57,mediaSpread:55}}};
    const out=deriveAgeGenderCohortsV2({person,baseline,view,history:{summary:{dailySampleSize:30,coreDeltas:{overallInterest:2,highEngagement:1,massExpansion:1,issueHeat:2,mediaSpread:1}}},evidence:{sources:[]},asOf:'2026-08-30T00:00:00.000Z'});
    for(const cell of Object.values(out.cells)){assert.ok(Number.isFinite(cell.value),`${baseline.name}/${cell.key}`);numeric++;}
  }
  assert.equal(numeric,542*12);
});
