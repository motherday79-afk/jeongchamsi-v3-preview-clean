'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function block(source,start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing ${start}`);
  return source.slice(a,b>0?b:source.length);
}

function activeView(){
  return {
    row:{person:{id:'p1',name:'A'},rank:30,score:55,search:{state:'READY',monthlyPcQcCnt:5000,monthlyMobileQcCnt:8000},news:{state:'READY',count24:4,sources24:3,headlines:[]}},
    rankDelta:0,
    related:[
      {rank:28,score:56,person:{id:'p2',name:'B'}},
      {rank:34,score:53,person:{id:'p3',name:'C'}}
    ],
    analysis:{scores:{overallInterest:62,highEngagement:58,massExpansion:59,activity:57,issueHeat:61,mediaSpread:60,audienceExpansion:58,coreRetention:74,activityPersistence:70,newsAcceleration:59,issueExplosiveness:60,issuePersistence:58,mediaDiversity:55,newsSearchTransition:57,mobileResponse:58}}
  };
}

test('admin compare keeps the very first repeated p selection visible instead of discarding it until a second person is added',()=>{
  const source=read('src/views/features.js');
  const render=block(source,'async function renderAdminCompare','export async function renderCompare');
  assert.doesNotMatch(render,/if\s*\(\s*ids\.length\s*<\s*2\s*\)\s*ids\s*=\s*\[params\.get\(["']a["']\),params\.get\(["']b["']\)\]/);
  assert.match(render,/if\s*\(\s*!ids\.length\s*\)|if\s*\(\s*ids\.length\s*===\s*0\s*\)/);
});

test('admin compare result is packaged as a premium intelligence comparison report, not only person cards plus tables',()=>{
  const source=read('src/views/features.js');
  const css=read('css/pages.css');
  for(const token of ['admin-compare-report-shell','admin-compare-executive','admin-compare-leaderboard','admin-compare-signal-matrix','admin-compare-position-strip']){
    assert.ok(source.includes(token),token);
    assert.ok(css.includes(`.${token}`),`${token} css`);
  }
  assert.match(source,/EXECUTIVE COMPARISON SUMMARY/);
  assert.match(source,/JCS INTELLIGENCE COMPARISON REPORT/);
  assert.match(source,/SIGNAL LEADERS/);
});

test('AGE x GENDER detail uses one-glance diverging bars with male and female on opposite sides of a zero axis',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  const section=block(source,'function adminPiDemographicSection','function adminPiConsultingClose');
  for(const token of ['admin-pi-cohort-diverging','admin-pi-cohort-diverging-row','admin-pi-cohort-diverging-axis','admin-pi-cohort-summary-ribbon']){
    assert.ok(source.includes(token),token);
    assert.ok(css.includes(`.${token}`),`${token} css`);
  }
  assert.match(section,/adminPiCohortDivergingRow/);
  assert.match(section,/MALE/);
  assert.match(section,/FEMALE/);
  assert.match(section,/0/);
  assert.doesNotMatch(section,/AGE × GENDER MARKET TAPE/);
  assert.doesNotMatch(section,/admin-pi-cohort-ticker/);
});

test('competitor flow surfaces low single-digit movement for real moderate competitive energy rather than rounding it near zero',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const history={summary:{dailySampleSize:4,coreDeltas:{overallInterest:2,highEngagement:2,massExpansion:2,mediaSpread:2,issueHeat:2,activity:2}},observations:[]};
  const result=derivePoliticalIntelligenceV1({view:activeView(),history,evidence:{sources:[],demographic:null},asOf:'2026-08-31T00:00:00.000Z'});
  assert.equal(result.support.coreAttritionPct,0,'fixture intentionally has no core attrition');
  assert.ok(result.competitorFlow.length>=2);
  assert.ok(result.competitorFlow.every(x=>x.estimatedShare>=1&&x.estimatedShare<10),JSON.stringify(result.competitorFlow));
});


test('competitor flow treats a small but real active signal as competitive movement instead of effectively zero',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const view=activeView();
  Object.assign(view.analysis.scores,{overallInterest:54,highEngagement:53,massExpansion:54,activity:52,issueHeat:54,mediaSpread:54,newsAcceleration:53,issueExplosiveness:54});
  const history={summary:{dailySampleSize:4,coreDeltas:{overallInterest:1,highEngagement:1,massExpansion:1,mediaSpread:1,issueHeat:1,activity:1}},observations:[]};
  const result=derivePoliticalIntelligenceV1({view,history,evidence:{sources:[],demographic:null},asOf:'2026-08-31T00:00:00.000Z'});
  assert.ok(result.competitorFlow[0].estimatedShare>=1,JSON.stringify(result.competitorFlow));
});
test('competitor flow still permits exact zero only for genuinely neutral/no-movement input',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const view={row:{person:{id:'p1',name:'A'},rank:20,score:50,search:{state:'READY',monthlyPcQcCnt:1000,monthlyMobileQcCnt:1000},news:{state:'READY',count24:0,sources24:0,headlines:[]}},rankDelta:0,related:[{rank:20,score:50,person:{id:'p2',name:'B'}}],analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50,audienceExpansion:50,coreRetention:70,activityPersistence:70,newsAcceleration:50,issueExplosiveness:50,issuePersistence:50,mediaDiversity:50,newsSearchTransition:50,mobileResponse:50}}};
  const result=derivePoliticalIntelligenceV1({view,history:{summary:{dailySampleSize:2,coreDeltas:{}}},evidence:{sources:[],demographic:null}});
  assert.equal(result.competitorFlow[0].estimatedShare,0);
});
