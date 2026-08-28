const test=require('node:test');
const assert=require('node:assert/strict');

function core(){return require('../server/v3/lib/history-v2-core');}

const sampleView={
  draftId:'draft-1',publishedAt:'2026-08-29T01:00:00.000Z',categoryRank:2,categoryLabel:'국회의원',whyNow:'뉴스와 검색 관심이 함께 증가했습니다.',
  row:{rank:7,score:84.3,searchScore:71.1,newsScore:92.4,person:{id:'assembly-001',name:'김테스트',type:'assembly',party:'테스트당',jurisdiction:'서울 테스트구',office:'국회의원'},search:{state:'OK',monthlyPcQcCnt:100,monthlyMobileQcCnt:300,monthlyTotalQcCnt:400,ambiguousName:false},news:{state:'OK',count6:4,count24:12,count7d:40,sources24:7,latest:{title:'최신 기사',link:'https://example.com/latest'},headlines:[{title:'기사 A',link:'https://example.com/a',source:'언론A',ts:1787960000000}]},providers:['naver-search-ads','naver-news']},
  analysis:{scores:{overallInterest:80,highEngagement:65,massExpansion:91,activity:74,issueHeat:88,mediaSpread:83,audienceExpansion:90,mobileResponse:92,massPenetration:87,coreRetention:68,activityAcceleration:79,activityConcentration:81,activityPersistence:70,newsAcceleration:86,issueFreshness:84,issuePersistence:72,mediaDiversity:77,newsSearchTransition:82,issueInflux:85,mediaPublicGap:21,issueExplosiveness:89},grades:{overallInterest:'높음'},audience:{position:73,label:'대중 확산형'},signal:{label:'대중확산형',diagnosis:'모바일 관심과 뉴스 확산이 함께 증가 중입니다.'},mediaPublic:{direction:'media-led'}}
};

test('v2 contracts use independent prefix and version names',()=>{
  const c=core();
  assert.equal(c.V2_PREFIX,'jcv3:history:v2');
  assert.equal(c.V2_VERSIONS.pipeline,'JCS_HISTORY_PIPELINE_V2');
  assert.equal(c.V2_VERSIONS.derived,'JCS_DERIVED_V2');
  assert.equal(c.V2_ACCESS,'INTERNAL_ADMIN');
});

test('v2 deterministic keys do not overlap v1',()=>{
  const c=core();
  assert.equal(c.v2SnapshotKey('draft-1'),'jcv3:history:v2:snapshot:draft-1');
  assert.equal(c.v2ObservationKey('assembly-001','draft-1'),'jcv3:history:v2:observation:assembly-001:draft-1');
  assert.equal(c.v2ObservationIndexKey('assembly-001'),'jcv3:history:v2:observations:assembly-001');
});

test('full observation freezes complete intelligence and evidence without rerunning later',()=>{
  const o=core().buildFullObservation(sampleView,{draftId:'draft-1',publishedAt:sampleView.publishedAt,weights:{search:50,news:50},providers:['naver-search-ads','naver-news']});
  assert.equal(o.source,'FULL_SNAPSHOT');
  assert.equal(o.completeness,'FULL');
  assert.equal(o.person.id,'assembly-001');
  assert.equal(o.rank.global,7);
  assert.equal(o.rank.category,2);
  assert.equal(o.calculated.nowIndex,84.3);
  assert.equal(o.intelligence.scores.issueExplosiveness,89);
  assert.equal(o.intelligence.signal.label,'대중확산형');
  assert.equal(o.intelligence.whyNow,'뉴스와 검색 관심이 함께 증가했습니다.');
  assert.equal(o.external.search.monthlyMobileQcCnt,300);
  assert.equal(o.external.news.count24,12);
  assert.equal(o.external.news.headlines[0].title,'기사 A');
  assert.ok(o.coverage.sections.includes('intelligence'));
});

test('full observation strips member identity and raw search term fields',()=>{
  const dirty=structuredClone(sampleView);
  dirty.row.userId='u';dirty.row.email='e';dirty.row.ip='1.2.3.4';dirty.row.search.query='김테스트';dirty.row.search.keyword='김테스트';
  const text=JSON.stringify(core().buildFullObservation(dirty,{draftId:'d',publishedAt:dirty.publishedAt}));
  assert.doesNotMatch(text,/"(?:userId|email|nickname|ip|query|keyword|searchTerm)"/i);
});

test('legacy partial observation never invents absent intelligence as zero',()=>{
  const o=core().buildLegacyPartialObservation({personId:'assembly-001',draftId:'legacy-1',publishedAt:'2026-08-20T00:00:00.000Z',globalRank:11,categoryRank:4,scores:{overallInterest:62,issueHeat:70}});
  assert.equal(o.source,'LEGACY_PARTIAL');
  assert.equal(o.completeness,'PARTIAL');
  assert.equal(o.intelligence.scores.overallInterest,62);
  assert.equal(o.intelligence.scores.issueHeat,70);
  assert.equal(Object.hasOwn(o.intelligence.scores,'mediaSpread'),false);
  assert.equal(Object.hasOwn(o.calculated,'nowIndex'),false);
  assert.deepEqual(o.coverage.coreScores.sort(),['issueHeat','overallInterest']);
});

test('window summary computes deltas only from available values',()=>{
  const c=core();
  const rows=[
    c.buildLegacyPartialObservation({personId:'assembly-001',draftId:'a',publishedAt:'2026-08-01T00:00:00.000Z',globalRank:20,scores:{overallInterest:40,issueHeat:50}}),
    c.buildLegacyPartialObservation({personId:'assembly-001',draftId:'b',publishedAt:'2026-08-10T00:00:00.000Z',globalRank:12,scores:{overallInterest:55}}),
    c.buildLegacyPartialObservation({personId:'assembly-001',draftId:'c',publishedAt:'2026-08-20T00:00:00.000Z',globalRank:8,scores:{overallInterest:70,issueHeat:80}})
  ];
  const s=c.deriveWindowSummary(rows);
  assert.equal(s.sampleSize,3);
  assert.equal(s.coreDeltas.overallInterest,30);
  assert.equal(s.coreDeltas.issueHeat,30);
  assert.equal(s.coreDeltas.mediaSpread,null);
  assert.equal(s.rankDelta.global,12);
  assert.equal(s.latest.globalRank,8);
});

test('window summary exposes deterministic momentum and volatility from available numeric samples only',()=>{
  const c=core();
  const rows=[
    c.buildLegacyPartialObservation({personId:'assembly-001',draftId:'a',publishedAt:'2026-08-01T00:00:00.000Z',scores:{overallInterest:40,issueHeat:50}}),
    c.buildLegacyPartialObservation({personId:'assembly-001',draftId:'b',publishedAt:'2026-08-10T00:00:00.000Z',scores:{overallInterest:60}}),
    c.buildLegacyPartialObservation({personId:'assembly-001',draftId:'c',publishedAt:'2026-08-20T00:00:00.000Z',scores:{overallInterest:70,issueHeat:80}})
  ];
  const s=c.deriveWindowSummary(rows);
  assert.equal(s.momentum.overallInterest,30);
  assert.equal(s.volatility.overallInterest,5);
  assert.equal(s.momentum.issueHeat,30);
  assert.equal(s.volatility.issueHeat,0);
  assert.equal(s.momentum.mediaSpread,null);
  assert.equal(s.volatility.mediaSpread,null);
});
