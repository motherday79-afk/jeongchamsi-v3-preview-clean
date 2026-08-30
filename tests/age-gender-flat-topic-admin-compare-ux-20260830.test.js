'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {deriveAgeGenderCohortsV2}=require('../server/v3/lib/age-gender-cohort-core');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function flatBaseline(){return {personId:'p-flat',baselineKind:'PARTY_PROXY',baselineQuality:72,sourceState:'OFFICIAL_PROPORTIONAL_ECOLOGICAL_ESTIMATE',populationWeights:Array(12).fill(1/12),cohortAffinity:Array(12).fill(.04),proxyReferenceCount:120};}
function viewWithNeutralYouthTopics(){return {row:{person:{id:'p-flat',name:'테스트',party:'A',jurisdiction:'경기 테스트시'},search:{state:'READY'},news:{state:'READY',headlines:[
  {title:'청년 주거 정책 발표',source:'A'},
  {title:'청년 일자리 대책 공개',source:'B'},
  {title:'스타트업 AI 산업 정책 토론',source:'C'}
]}},rankDelta:7,analysis:{scores:{overallInterest:78,highEngagement:74,massExpansion:79,activity:70,issueHeat:82,mediaSpread:77}}};}
function risingHistory(){return {summary:{dailySampleSize:45,coreDeltas:{overallInterest:12,highEngagement:10,massExpansion:11,issueHeat:13,mediaSpread:9}}};}

test('flat official proxy still gets cohort shape from observed issue mix instead of copying one global score to every age',()=>{
  const out=deriveAgeGenderCohortsV2({baseline:flatBaseline(),view:viewWithNeutralYouthTopics(),history:risingHistory(),evidence:{sources:[]},marketContext:{partyMovement:3,regionalMovement:2,competitorMovement:1},asOf:'2026-08-30T00:00:00.000Z'});
  const ages=['18-29','30-39','40-49','50-59','60-69','70+'].map(k=>out.age[k].value);
  assert.equal(ages.every(Number.isFinite),true,ages.join(','));
  assert.ok(new Set(ages).size>=3,`flat issue-shaped result: ${ages.join(',')}`);
  assert.ok(ages[0]-ages[5]>=6,`youth issue signal did not survive JCS interpretation: ${ages.join(',')}`);
});

test('admin compare picker uses one search box and dynamic selected chips instead of rendering five permanent slots',()=>{
  const s=read('src/views/features.js');
  const start=s.indexOf('function adminComparePicker');
  const end=s.indexOf('async function renderAdminCompare',start);
  assert.ok(start>=0&&end>start);
  const block=s.slice(start,end);
  assert.match(block,/data-admin-compare-search/);
  assert.match(block,/data-admin-compare-selected-list/);
  assert.match(block,/data-admin-compare-chip/);
  assert.doesNotMatch(block,/Array\.from\(\{length:5\}/);
  assert.doesNotMatch(block,/POLITICIAN \$\{i\+1\}/);
});

test('admin compare selection client logic adds and removes dynamic people and enforces maximum five',()=>{
  const s=read('src/app.js');
  assert.match(s,/data-admin-compare-search/);
  assert.match(s,/data-admin-compare-chip-remove/);
  assert.match(s,/data-admin-compare-selected-list/);
  assert.match(s,/selectedIds\.length\s*>?=\s*5/);
  assert.match(s,/name\s*=\s*["']p["']/);
});
