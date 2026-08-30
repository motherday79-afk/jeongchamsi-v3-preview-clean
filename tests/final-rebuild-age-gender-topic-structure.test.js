'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {deriveAgeGenderCohortsV2,ENGINE_VERSION}=require('../server/v3/lib/age-gender-cohort-core');

function baseline(){return {baselineKind:'DIRECT_CANDIDATE',baselineQuality:88,sourceState:'OFFICIAL_TEST',populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(0)};}
function view(headlines){return {rankDelta:8,row:{person:{id:'assembly-001',type:'assembly',party:'테스트당',jurisdiction:'경기'},search:{state:'READY',monthlyTotalQcCnt:1000},news:{state:'READY',headlines}},analysis:{scores:{overallInterest:66,highEngagement:64,massExpansion:62,activity:60,issueHeat:65,mediaSpread:63}}};}

test('topic-bearing real news can differentiate cohorts even when sentiment words and baseline affinity are flat',()=>{
  const out=deriveAgeGenderCohortsV2({baseline:baseline(),view:view([{title:'청년 주거 대책 국회 논의',source:'뉴스A',ts:Date.now()}]),history:{summary:{dailySampleSize:40,coreDeltas:{overallInterest:5,highEngagement:4,massExpansion:5,issueHeat:4,mediaSpread:5}}},evidence:{sources:[]},marketContext:{}});
  const vals=Object.values(out.cells).map(x=>x.value);
  assert.match(ENGINE_VERSION,/AGGRESSIVE_R2/);
  assert.ok(new Set(vals).size>=3,`expected cohort differentiation from collected issue structure, got ${vals.join(',')}`);
});

test('non cohort-specific news is not artificially forced to differ',()=>{
  const out=deriveAgeGenderCohortsV2({baseline:baseline(),view:view([{title:'국회 본회의 일정 안내',source:'뉴스A',ts:Date.now()}]),history:{summary:{dailySampleSize:40,coreDeltas:{overallInterest:5,highEngagement:4,massExpansion:5,issueHeat:4,mediaSpread:5}}},evidence:{sources:[]},marketContext:{}});
  const vals=Object.values(out.cells).map(x=>x.value);
  assert.equal(new Set(vals).size,1);
});
