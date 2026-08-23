const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const signals=require('../server/v3/lib/now-public-signals');
const snapshot=require('../server/v3/lib/now-public-snapshot');

function row(rank,id,type,pc,mobile,c6,c24,c7,sources){
  return {rank,score:90-rank,state:'success',person:{id,name:id,type,party:'테스트당',jurisdiction:'테스트'},search:{monthlyPcQcCnt:pc,monthlyMobileQcCnt:mobile,monthlyTotalQcCnt:pc+mobile},news:{count6:c6,count24:c24,count7d:c7,sources24:sources,headlines:[]}};
}

const current={draftId:'d2',publishedAt:'2026-08-24T01:00:00.000Z',ranked:[
  row(1,'m1','metropolitan',100,200,3,9,30,4),
  row(2,'a1','assembly',90,180,4,12,36,5),
  row(3,'b1','basic',70,140,1,5,20,3),
  row(4,'a2','assembly',60,120,2,6,22,3)
]};

const history={items:[
  {draftId:'d1',publishedAt:'2026-08-23T18:00:00.000Z',top30:[{rank:4,person:{id:'a1'}}]}
]};

test('person view exposes global/category rank and recoverable prior global-rank history',()=>{
  const view=signals.derivePersonView(current,history,'a1');
  assert.equal(view.row.rank,2);
  assert.equal(view.categoryRank,1);
  assert.equal(view.categoryLabel,'국회의원');
  assert.equal(view.draftId,'d2');
  assert.deepEqual(view.rankHistory.map(x=>[x.draftId,x.globalRank]),[['d1',4],['d2',2]]);
});

test('compact trend point stores derived analysis only, not raw search/news payloads',()=>{
  const view=signals.derivePersonView(current,history,'a1');
  const point=snapshot.personTrendPoint(view);
  assert.equal(point.draftId,'d2');
  assert.equal(point.globalRank,2);
  assert.equal(point.categoryRank,1);
  assert.ok(Number.isFinite(point.scores.overallInterest));
  assert.ok(Number.isFinite(point.scores.issueExplosiveness));
  assert.equal('search' in point,false);
  assert.equal('news' in point,false);
});

test('trend merge seeds previous public snapshot, de-duplicates publish id, and caps rolling history',()=>{
  const view=signals.derivePersonView(current,history,'a1');
  const previous={...view,draftId:'d1',publishedAt:'2026-08-23T18:00:00.000Z',row:{...view.row,rank:4},categoryRank:2,trend:{points:Array.from({length:59},(_,i)=>({draftId:`old-${i}`,publishedAt:`2026-08-${String(i%23+1).padStart(2,'0')}T00:00:00.000Z`,globalRank:i+1,categoryRank:i+1,scores:{overallInterest:i}}))}};
  const merged=snapshot.mergePersonTrend(view,previous,60);
  assert.equal(merged.trend.points.length,60);
  assert.equal(merged.trend.points.at(-1).draftId,'d2');
  assert.equal(merged.trend.points.filter(x=>x.draftId==='d2').length,1);
});

test('publish route batch-reads prior person entries before writing official trend snapshots',()=>{
  const admin=fs.readFileSync('server/v3/routes/admin/now-data.js','utf8');
  assert.match(admin,/mgetJSON\(personEntries\.map\(\(\[key\]\)=>key\)\)/);
  assert.match(admin,/mergePersonTrend/);
  assert.match(admin,/action==='publish'/);
});

test('detail trend area renders real trend data instead of static placeholder copy',()=>{
  const people=fs.readFileSync('src/views/people.js','utf8');
  assert.match(people,/trend\.points/);
  assert.match(people,/person-analysis-trend-chart/);
  assert.match(people,/전체 NOW 이력/);
  assert.doesNotMatch(people,/관측 이력이 누적될수록 현재 분석지표와 순위 변화의 시간축을 확장할 수 있습니다/);
});
