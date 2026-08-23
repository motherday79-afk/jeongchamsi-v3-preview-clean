const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {derivePersonView}=require('../server/v3/lib/now-public-signals');

function row(id,{pc=0,mobile=0,c6=0,c24=0,c7=0,sources=0,score=0,rank=1}={}){
  return {rank,score,searchScore:0,newsScore:0,person:{id,name:`인물${id}`,party:'정당',jurisdiction:'서울'},search:{monthlyPcQcCnt:pc,monthlyMobileQcCnt:mobile,monthlyTotalQcCnt:pc+mobile},news:{count6:c6,count24:c24,count7d:c7,sources24:sources,headlines:[]}};
}

const current={draftId:'now-test',publishedAt:'2026-08-23T12:00:00.000Z',ranked:[
  row('a',{pc:8000,mobile:90000,c6:24,c24:40,c7:70,sources:18,score:92,rank:1}),
  row('b',{pc:45000,mobile:25000,c6:4,c24:18,c7:95,sources:10,score:78,rank:2}),
  row('c',{pc:15000,mobile:18000,c6:1,c24:6,c7:30,sources:5,score:55,rank:3}),
  row('d',{pc:5000,mobile:6000,c6:0,c24:1,c7:8,sources:1,score:20,rank:4}),
  row('e',{pc:1000,mobile:1500,c6:0,c24:0,c7:2,sources:0,score:8,rank:5})
]};

test('person view derives professional intelligence scores from search and news data',()=>{
  const view=derivePersonView(current,{items:[]},'a',Date.parse(current.publishedAt));
  assert.ok(view.analysis,'analysis object should exist');
  const a=view.analysis;
  for(const key of ['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread','audienceExpansion','mobileResponse','massPenetration','coreRetention','activityAcceleration','activityConcentration','activityPersistence','newsAcceleration','issueFreshness','issuePersistence','mediaDiversity','newsSearchTransition','issueInflux','mediaPublicGap','issueExplosiveness']){
    assert.equal(typeof a.scores[key],'number',key);
    assert.ok(a.scores[key]>=0&&a.scores[key]<=100,`${key} must be 0..100`);
  }
  assert.ok(a.signal?.label);
  assert.ok(a.signal?.diagnosis);
  assert.ok(a.audience?.label);
  assert.ok(['media-led','public-led','balanced'].includes(a.mediaPublic?.direction));
});

test('mobile-heavy fast-news person reads as stronger mass expansion than high engagement',()=>{
  const a=derivePersonView(current,{items:[]},'a').analysis;
  assert.ok(a.scores.massExpansion>a.scores.highEngagement);
  assert.ok(a.scores.issueHeat>=70);
  assert.ok(a.scores.issueExplosiveness>=70);
});

test('PC-heavy sustained-news person preserves high-engagement distinction',()=>{
  const b=derivePersonView(current,{items:[]},'b').analysis;
  assert.ok(b.scores.highEngagement>b.scores.massExpansion);
  assert.ok(b.audience.position<50,'audience position should lean toward high-engagement side');
});

test('detail UI consumes intelligence scores instead of placeholder dashes',()=>{
  const people=fs.readFileSync('src/views/people.js','utf8');
  assert.match(people,/live\?\.analysis/);
  assert.match(people,/analysisMetric\("종합 관심"[\s\S]*scores\.overallInterest/);
  assert.match(people,/analysisAxis\("활동 가속도"[\s\S]*scores\.activityAcceleration/);
  assert.doesNotMatch(people,/function analysisMetric\(label,desc,tone="mint"\)\{[\s\S]*<strong>—<\/strong>/);
});

test('legacy published person entry is recomputed when analysis is missing',()=>{
  const route=fs.readFileSync('server/v3/routes/now-data.js','utf8');
  assert.match(route,/!person\?\.analysis/);
  assert.match(route,/derivePersonView\(current,history,id/);
});
