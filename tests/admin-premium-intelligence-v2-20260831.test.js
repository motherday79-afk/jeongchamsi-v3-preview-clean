'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const zlib=require('node:zlib');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function gzSnapshot(value){return `gz2:${zlib.gzipSync(Buffer.from(JSON.stringify(value)),{level:9}).toString('base64')}`;}

function samplePacked(value){
  return {a:'2026-08-31T00:00:00.000Z',b:['PARTY_PROXY',72,'OFFICIAL_TEST',[]],v:Array(12).fill(value),c:Array(12).fill(80),s:4095,l:Array(12).fill(null),r:Array(12).fill(null),x:{personalEffect:Array(12).fill(0),partyEffect:Array(12).fill(0),regionalEffect:Array(12).fill(0),competitorEffect:Array(12).fill(0),issueEffect:Array(12).fill(0),externalAnchorEffect:Array(12).fill(0),historyPriorEffect:Array(12).fill(0)},e:[2,2,30,55],ag:[['18-29'],['30-39'],['40-49'],['50-59'],['60-69'],['70+']].map(()=>[value,80,1]),gg:[[value,80,1],[value,80,1]],sm:{},vc:12};
}

test('premium v2 uses a classified executive report hierarchy rather than another flat dashboard',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  for(const token of ['admin-pi-classification','admin-pi-executive-ribbon','admin-pi-kpi-strip','admin-pi-report-index']){
    assert.ok(source.includes(token),token);
    assert.ok(css.includes(`.${token}`),`${token} css`);
  }
  assert.match(source,/CLASSIFIED · INTERNAL ADMIN/);
  assert.match(source,/EXECUTIVE INTELLIGENCE SUMMARY/);
});

test('AGE x GENDER detail is rendered as a real historical market tape with male and female series',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  for(const token of ['admin-pi-cohort-market','admin-pi-cohort-ticker','admin-pi-cohort-market-svg','admin-pi-cohort-heatmap']){
    assert.ok(source.includes(token),token);
    assert.ok(css.includes(`.${token}`),`${token} css`);
  }
  assert.match(source,/AGE × GENDER MARKET TAPE/);
  assert.match(source,/history\?\.cohortSeries|history\.cohortSeries/);
  assert.match(source,/MALE/);
  assert.match(source,/FEMALE/);
});

test('political intelligence v2 store exposes chronological cohort history without changing persistence schema',async()=>{
  const {createPoliticalIntelligenceV2Store}=require('../server/v3/lib/political-intelligence-v2-store');
  const snapshots={
    d3:{schemaVersion:2,draftId:'d3',publishedAt:'2026-08-31T03:00:00.000Z',people:{p1:samplePacked(13)}},
    d2:{schemaVersion:2,draftId:'d2',publishedAt:'2026-08-30T03:00:00.000Z',people:{p1:samplePacked(7)}},
    d1:{schemaVersion:2,draftId:'d1',publishedAt:'2026-08-29T03:00:00.000Z',people:{p1:samplePacked(-2)}}
  };
  const calls=[];
  const store=createPoliticalIntelligenceV2Store({command:async command=>{
    calls.push(command);
    if(command[0]==='ZREVRANGE')return ['d3','d2','d1'];
    if(command[0]==='GET'){
      const id=Object.keys(snapshots).find(x=>String(command[1]).includes(`snapshot:${x}`));
      return id?gzSnapshot(snapshots[id]):null;
    }
    return null;
  }});
  assert.equal(typeof store.readPoliticalIntelligenceCohortSeriesV2,'function');
  const series=await store.readPoliticalIntelligenceCohortSeriesV2('p1',{limit:8});
  assert.deepEqual(series.map(x=>x.draftId),['d1','d2','d3']);
  assert.deepEqual(series.map(x=>x.cells['18_29_m']),[-2,7,13]);
  assert.ok(calls.filter(x=>x[0]==='GET').length<=3);
});

test('support dynamics and resilience use different visual grammar',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  assert.match(source,/NET SUPPORT FLOW/);
  assert.match(source,/admin-pi-support-waterfall/);
  assert.match(source,/RECOVERY CURVE/);
  assert.match(source,/admin-pi-recovery-curve/);
  assert.doesNotMatch(source,/adminPiMetric\('POLITICAL RESILIENCE'/);
  assert.ok(css.includes('.admin-pi-support-waterfall'));
  assert.ok(css.includes('.admin-pi-recovery-curve'));
});

test('strategic conclusion closes with a premium consulting service catalogue and CTA',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  for(const text of ['JCS STRATEGIC CONSULTING','정치인 이미지·브랜드 전략','세대·성별 타깃 전략','지역별 메시지 전략','핵심 지지층 관리','경쟁자 대응 전략','이슈·위기 대응','언론·온라인 확산 전략','선거·캠페인 데이터 전략','정참시와 함께하기'])assert.ok(source.includes(text),text);
  assert.ok(source.includes('admin-pi-consulting-menu'));
  assert.ok(css.includes('.admin-pi-consulting-menu'));
  assert.match(source,/DATA TELLS YOU WHERE/);
});

test('competitor flow can express low single digit movement when real pressure exists even with zero core attrition',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const view={
    row:{person:{id:'p1',name:'A'},rank:20,score:64,search:{state:'READY',monthlyPcQcCnt:18000,monthlyMobileQcCnt:42000},news:{state:'READY',count24:12,sources24:5,headlines:[]}},
    rankDelta:0,
    related:[
      {rank:18,score:66,person:{id:'p2',name:'B',party:'X',jurisdiction:'서울'}},
      {rank:23,score:61,person:{id:'p3',name:'C',party:'X',jurisdiction:'서울'}}
    ],
    analysis:{scores:{overallInterest:82,highEngagement:50,massExpansion:48,activity:58,issueHeat:79,mediaSpread:76,audienceExpansion:45,coreRetention:70,activityPersistence:68,newsAcceleration:65,issueExplosiveness:72,issuePersistence:60,mediaDiversity:58,newsSearchTransition:62,mobileResponse:66}}
  };
  const history={observations:[
    {publishedAt:'2026-08-20T00:00:00.000Z',intelligence:{scores:{overallInterest:56}}},
    {publishedAt:'2026-08-25T00:00:00.000Z',intelligence:{scores:{overallInterest:73}}},
    {publishedAt:'2026-08-30T00:00:00.000Z',intelligence:{scores:{overallInterest:59}}}
  ],summary:{dailySampleSize:3,coreDeltas:{overallInterest:12,highEngagement:0,massExpansion:-2,mediaSpread:8,issueHeat:7}}};
  const result=derivePoliticalIntelligenceV1({view,history,evidence:{sources:[],demographic:null},asOf:'2026-08-31T00:00:00.000Z'});
  assert.equal(result.support.coreAttritionPct,0,'fixture intentionally isolates non-attrition competitive pressure');
  assert.ok(result.attentionSupportGap.gap>=8,`gap=${result.attentionSupportGap.gap}`);
  assert.ok(result.competitorFlow.some(x=>x.estimatedShare>=1&&x.estimatedShare<10),JSON.stringify(result.competitorFlow));
});

test('competitor flow is still allowed to remain zero when there is genuinely no movement pressure',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const view={row:{person:{id:'p1',name:'A'},rank:20,score:50,search:{state:'READY',monthlyPcQcCnt:1000,monthlyMobileQcCnt:1000},news:{state:'READY',count24:0,sources24:0,headlines:[]}},rankDelta:0,related:[{rank:20,score:50,person:{id:'p2',name:'B'}}],analysis:{scores:{overallInterest:50,highEngagement:50,massExpansion:50,activity:50,issueHeat:50,mediaSpread:50,audienceExpansion:50,coreRetention:70,activityPersistence:70,newsAcceleration:50,issueExplosiveness:50,issuePersistence:50,mediaDiversity:50,newsSearchTransition:50,mobileResponse:50}}};
  const result=derivePoliticalIntelligenceV1({view,history:{summary:{dailySampleSize:2,coreDeltas:{}}},evidence:{sources:[],demographic:null}});
  assert.equal(result.competitorFlow[0].estimatedShare,0);
});

test('premium v2 cache revisions are wired through stylesheet and dynamic person view import',()=>{
  assert.match(read('index.html'),/admin-premium-intelligence-v2/);
  assert.match(read('src/app.js'),/people\.js\?v=[^"']*admin-premium-intelligence-v2/);
});
