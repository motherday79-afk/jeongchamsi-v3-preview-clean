const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function sampleView(overrides={}){
  return {
    row:{
      person:{id:'assembly-023',name:'이준석',type:'assembly',party:'개혁신당',jurisdiction:'경기 화성시을'},
      rank:11,score:72,searchScore:68,newsScore:77,
      search:{state:'READY',monthlyPcQcCnt:21000,monthlyMobileQcCnt:69000,monthlyTotalQcCnt:90000},
      news:{state:'READY',count6:28,count24:44,count7d:68,sources24:19,headlines:[
        {title:'이준석, 당대표직 내려놓겠다…당내 충격 확산',source:'테스트뉴스',ts:Date.now()},
        {title:'사퇴 배경 놓고 커뮤니티·SNS 갑론을박',source:'테스트뉴스',ts:Date.now()-1000}
      ]}
    },
    rankDelta:8,categoryRank:4,categoryLabel:'국회의원',
    related:[{rank:12,score:70,person:{id:'assembly-024',name:'경쟁A',party:'개혁신당',jurisdiction:'경기'}}],
    analysis:{
      scores:{overallInterest:72,highEngagement:66,massExpansion:81,activity:75,issueHeat:88,mediaSpread:84,audienceExpansion:79,mobileResponse:86,massPenetration:76,coreRetention:58,activityAcceleration:83,activityConcentration:82,activityPersistence:55,newsAcceleration:91,issueFreshness:89,issuePersistence:48,mediaDiversity:76,newsSearchTransition:69,issueInflux:84,mediaPublicGap:21,issueExplosiveness:91},
      audience:{position:68,label:'대중 확산 우세'},mediaPublic:{direction:'media-led',label:'미디어 반응 우세'},signal:{label:'이슈폭발형',diagnosis:'단기 이슈가 빠르게 확산되는 흐름'}
    },
    ...overrides
  };
}

const sampleHistory={
  observations:[
    {publishedAt:'2026-08-20T00:00:00.000Z',intelligence:{scores:{overallInterest:61,highEngagement:70,massExpansion:62,activity:58,issueHeat:40,mediaSpread:44,coreRetention:72,activityPersistence:68,issuePersistence:65}}},
    {publishedAt:'2026-08-28T00:00:00.000Z',intelligence:{scores:{overallInterest:68,highEngagement:64,massExpansion:74,activity:70,issueHeat:72,mediaSpread:73,coreRetention:62,activityPersistence:60,issuePersistence:55}}}
  ],
  daily:[{date:'2026-08-20'},{date:'2026-08-28'}],
  summary:{rawSampleSize:2,dailySampleSize:2,coreDeltas:{overallInterest:7,highEngagement:-6,massExpansion:12,activity:12,issueHeat:32,mediaSpread:29},rankDelta:{global:6}}
};

test('NOW admin progress uses JCS intelligent collection copy instead of Naver-branded copy',()=>{
  const source=read('src/views/admin.js');
  assert.match(source,/JCS INTELLIGENT DATA COLLECTION IN PROGRESS/);
  assert.doesNotMatch(source,/네이버 데이터 수집 중/);
  assert.doesNotMatch(source,/네이버 데이터 수집 시작/);
});

test('curated external evidence is source-attributed and respects as-of filtering',()=>{
  const {getPoliticalIntelligenceEvidence}=require('../server/v3/data/political-intelligence-evidence');
  const before=getPoliticalIntelligenceEvidence('assembly-023',{asOf:'2024-01-01T00:00:00.000Z'});
  const beforeIngest=getPoliticalIntelligenceEvidence('assembly-023',{asOf:'2026-08-28T23:59:59.000Z'});
  const after=getPoliticalIntelligenceEvidence('assembly-023',{asOf:'2026-08-29T00:00:00.000Z'});
  assert.equal(before.sources.length,0);
  assert.equal(beforeIngest.sources.length,0,'later-curated evidence must not rewrite an older JCS analysis');
  assert.ok(after.sources.length>=1);
  assert.ok(after.sources.some(x=>/한국갤럽/.test(x.institution)));
  assert.ok(after.sources.every(x=>/^https:\/\//.test(x.url)));
  assert.ok(Number(after.demographic?.age2030)>Number(after.demographic?.age4050));
});

test('Political Intelligence V1 derives bounded admin estimates and transparent confidence',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const evidence=require('../server/v3/data/political-intelligence-evidence').getPoliticalIntelligenceEvidence('assembly-023',{asOf:'2026-08-29T00:00:00.000Z'});
  const result=derivePoliticalIntelligenceV1({view:sampleView(),history:sampleHistory,evidence,asOf:'2026-08-29T00:00:00.000Z'});
  assert.equal(result.version,'JCS_POLITICAL_INTELLIGENCE_V1');
  for(const value of Object.values(result.support.ageMomentum))assert.ok(value>=-50&&value<=50);
  for(const key of ['news','youtube','sns','community'])assert.ok(result.media.momentum[key]>=-50&&result.media.momentum[key]<=50);
  assert.ok(result.support.coreAttritionPct>=0&&result.support.coreAttritionPct<=20);
  assert.ok(result.support.newSupportInflowPct>=0&&result.support.newSupportInflowPct<=20);
  assert.equal(Object.values(result.support.quality).reduce((a,b)=>a+b,0),100);
  assert.ok(result.confidence.score>=40&&result.confidence.score<=95);
  assert.equal(result.confidence.externalEvidenceCount,evidence.sources.length);
  assert.equal(result.confidence.observedDays,2);
  assert.ok(result.issueImpacts.length>=1);
  assert.ok(result.riskOpportunity.risks.length+result.riskOpportunity.opportunities.length>=1);
});

test('Political Intelligence does not invent external evidence when none exists',()=>{
  const {derivePoliticalIntelligenceV1}=require('../server/v3/lib/political-intelligence-v1');
  const result=derivePoliticalIntelligenceV1({view:sampleView({row:{...sampleView().row,person:{id:'assembly-999',name:'테스트',type:'assembly'}}}),history:sampleHistory,evidence:{sources:[],demographic:null},asOf:'2026-08-29T00:00:00.000Z'});
  assert.equal(result.confidence.externalEvidenceCount,0);
  assert.equal(result.evidence.external.length,0);
  assert.match(result.evidence.basis,/JCS/);
});

test('existing admin History person response exposes politicalIntelligence without a new route',()=>{
  const route=read('server/v3/routes/admin/history.js');
  const store=read('server/v3/lib/history-v2-store.js');
  const gateway=read('api/gateway.js');
  assert.match(route,/politicalIntelligence/);
  assert.match(store,/readPoliticalIntelligenceV2/);
  assert.equal((gateway.match(/admin\/political-intelligence/g)||[]).length,0);
});

test('admin politician detail renders the approved English intelligence sections with concise Korean meanings',()=>{
  const source=read('src/views/people.js');
  const labels=[
    ['JCS POLITICAL INTELLIGENCE','관리자 전용'],
    ['JCS CURRENT DIAGNOSIS','현재 정치상태 진단'],
    ['SUPPORT BASE MOVEMENT','연령별 지지 흐름'],
    ['CORE SUPPORT DYNAMICS','강성지지층 변화'],
    ['SUPPORT QUALITY','지지 기반의 질'],
    ['MEDIA PROPAGATION','미디어 확산 흐름'],
    ['ISSUE IMPACT MAP','이슈별 영향'],
    ['RISK & OPPORTUNITY','위험·기회 신호'],
    ['POLITICAL RESILIENCE','정치적 회복력'],
    ['ATTENTION → SUPPORT GAP','관심 대비 지지전환'],
    ['EVIDENCE BASE','분석 근거']
  ];
  for(const [en,ko] of labels){assert.ok(source.includes(en),en);assert.ok(source.includes(ko),ko);}
  assert.match(source,/isAdmin\?adminPoliticalIntelligence\(history,p\):""/);
  assert.match(source,/JCS EST\./);
});

test('public NOW serving contracts stay isolated from Political Intelligence admin module',()=>{
  for(const file of ['server/v3/routes/now-data.js','server/v3/lib/now-public-signals.js','server/v3/lib/now-public-snapshot.js','src/core/repository.js']){
    assert.doesNotMatch(read(file),/political-intelligence/i,file);
  }
});

test('admin Political Intelligence axis uses the existing green-to-red intensity band names',()=>{
  const css=read('css/pages.css');
  for(const band of ['green','yellow','amber','orange','red']){
    assert.match(css,new RegExp(`\\.admin-pi-axis\\.intensity-${band}\\{`),band);
  }
});

test('History V2 Political Intelligence reader combines current state, passed history, and as-of external evidence',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  const calls={};
  const current={draftId:'now-test',publishedAt:'2026-08-29T09:00:00.000Z',ranked:[{id:'assembly-023'}]};
  const legacy={items:[]};
  const store=createHistoryV2Store({
    getJSON:async key=>key==='nowDataCurrent'?current:key==='nowDataHistory'?legacy:null,
    derivePersonView:(cur,hist,id)=>{calls.view={cur,hist,id};return sampleView();},
    getPoliticalIntelligenceEvidence:(id,{asOf})=>{calls.evidence={id,asOf};return {personId:id,sources:[],demographic:null};},
    derivePoliticalIntelligenceV1:input=>{calls.derive=input;return {version:'JCS_POLITICAL_INTELLIGENCE_V1',marker:'ok'};}
  });
  const result=await store.readPoliticalIntelligenceV2('assembly-023',sampleHistory);
  assert.deepEqual(result,{version:'JCS_POLITICAL_INTELLIGENCE_V1',marker:'ok'});
  assert.equal(calls.view.id,'assembly-023');
  assert.equal(calls.evidence.asOf,current.publishedAt);
  assert.equal(calls.derive.history,sampleHistory);
  assert.equal(calls.derive.asOf,current.publishedAt);
});
