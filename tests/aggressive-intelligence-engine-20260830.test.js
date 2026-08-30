'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');

test('aggressive engine always emits JCS numeric estimates even when core analysis is sparse',()=>{
  const result=derivePoliticalIntelligenceV1({
    view:{row:{person:{id:'p1',name:'테스트'},search:{state:'READY',monthlyPcQcCnt:4200,monthlyMobileQcCnt:7800},news:{state:'READY',count6:12,count24:37,sources24:9,headlines:[{title:'청년 주거 정책 지지 확대',source:'TEST'}]}},rankDelta:4,related:[],analysis:{scores:{}}},
    history:{summary:{dailySampleSize:9,coreDeltas:{overallInterest:7,highEngagement:4,massExpansion:6,mediaSpread:8,issueHeat:10}}},
    evidence:{sources:[],demographic:{age2030:62,age4050:43,age60plus:28}}
  });
  assert.notEqual(result.validity.state,'INSUFFICIENT_DATA');
  for(const value of Object.values(result.support.ageMomentum))assert.equal(Number.isFinite(value),true);
  for(const value of Object.values(result.media.momentum))assert.equal(Number.isFinite(value),true);
  assert.equal(Number.isFinite(result.resilience.score),true);
  assert.equal(Number.isFinite(result.resilience.recoveryDays),true);
  assert.equal(Number.isFinite(result.confidence.score),true);
});

test('aggressive cohort engine lets aligned profile issue and external evidence create a decisive spread',()=>{
  const baseline={baselineKind:'DIRECT_CANDIDATE',baselineQuality:88,sourceState:'OFFICIAL_TEST',populationWeights:Array(12).fill(1/12),cohortAffinity:[.16,.14,.10,.08,.02,0,-.03,-.04,-.08,-.09,-.13,-.14],matchedGeoUnits:30};
  const view={row:{person:{id:'p1',name:'테스트'},search:{state:'READY'},news:{state:'READY',headlines:[{title:'청년 취업 주거 정책 지지 확대',source:'A'},{title:'청년 일자리 공약 호평 상승',source:'B'}]}},rankDelta:7,analysis:{scores:{overallInterest:78,highEngagement:74,massExpansion:80,activity:70,issueHeat:84,mediaSpread:82}}};
  const evidence={sources:[{fingerprint:'e1',observedAt:new Date().toISOString(),values:{age2030:64,age4050:41,age60plus:24}}]};
  const r=deriveAgeGenderCohortsV2({baseline,view,history:{summary:{dailySampleSize:20,coreDeltas:{overallInterest:12,highEngagement:10,massExpansion:13,issueHeat:14,mediaSpread:11}}},evidence,marketContext:{partyMovement:4,regionalMovement:2,competitorMovement:5},asOf:new Date().toISOString()});
  const vals=Object.values(r.cells).map(x=>x.value);
  assert.ok(Math.max(...vals)-Math.min(...vals)>=25,`spread=${Math.max(...vals)-Math.min(...vals)} values=${vals.join(',')}`);
  assert.match(r.engineVersion,/AGGRESSIVE/);
});

test('aggressive calculation revision prevents reuse of the prior conservative cohort snapshot index',()=>{
  const fs=require('node:fs'),path=require('node:path');
  const source=fs.readFileSync(path.join(__dirname,'../server/v3/lib/political-intelligence-v2-store.js'),'utf8');
  assert.match(source,/JCS_AGGRESSIVE_INTELLIGENCE_20260830_R2_TOPIC_SHAPE/);
  assert.doesNotMatch(source,/COHORT_JCS_STRUCTURAL_REFINEMENT_20260830_R4/);
});

test('542-person synthetic sweep emits no hidden demographic values under mixed sparse and strong inputs',()=>{
  for(let i=0;i<542;i++){
    const scores=i%4===0?{}:{overallInterest:45+(i%31),highEngagement:43+(i%29),massExpansion:44+(i%27),activity:46+(i%23),issueHeat:42+(i%35),mediaSpread:41+(i%37)};
    const view={row:{person:{id:`p${i}`,name:`P${i}`},search:{state:'READY',monthlyPcQcCnt:800+i*9,monthlyMobileQcCnt:1200+i*13},news:{state:'READY',count24:i%41,sources24:2+(i%9),headlines:[{title:i%2?'청년 일자리 정책 지지 확대':'연금 의료 정책 논란 비판',source:'T'}]}},rankDelta:(i%15)-7,analysis:{scores}};
    const v1=derivePoliticalIntelligenceV1({view,history:{summary:{dailySampleSize:i%21,coreDeltas:{overallInterest:(i%13)-6,highEngagement:(i%11)-5,massExpansion:(i%9)-4,issueHeat:(i%17)-8,mediaSpread:(i%15)-7}}},evidence:{sources:[],demographic:{age2030:30+(i%30),age4050:25+(i%26),age60plus:20+(i%22)}}});
    for(const value of Object.values(v1.support.ageMomentum))assert.equal(Number.isFinite(value),true);
    const affinity=Array.from({length:12},(_,j)=>((j<4?.12:j<8?.02:-.08)+((i+j)%5-2)*.005));
    const v2=deriveAgeGenderCohortsV2({baseline:{baselineKind:'PARTY_PROXY',baselineQuality:55+(i%20),sourceState:'OFFICIAL_SYNTH',populationWeights:Array(12).fill(1/12),cohortAffinity:affinity},view,history:{summary:{dailySampleSize:i%21,coreDeltas:{overallInterest:(i%13)-6,highEngagement:(i%11)-5,massExpansion:(i%9)-4,issueHeat:(i%17)-8,mediaSpread:(i%15)-7}}},evidence:{sources:[]}});
    for(const cell of Object.values(v2.cells))assert.equal(Number.isFinite(cell.value),true);
  }
});
