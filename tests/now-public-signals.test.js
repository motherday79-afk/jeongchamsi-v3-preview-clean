const test=require('node:test');
const assert=require('node:assert/strict');
const {derivePublicSignals,derivePersonView}=require('../server/v3/lib/now-public-signals');

function row(rank,name,id,opts={}){
  return {
    rank,score:opts.score||80,
    person:{id,name,party:opts.party||'테스트당',jurisdiction:opts.jurisdiction||'서울 테스트구',office:'국회의원'},
    search:{monthlyPcQcCnt:opts.pc||1000,monthlyMobileQcCnt:opts.mobile||3000,monthlyTotalQcCnt:(opts.pc||1000)+(opts.mobile||3000)},
    news:{count6:opts.count6||0,count24:opts.count24||0,count7d:opts.count7d||0,sources24:opts.sources24||0,headlines:opts.headlines||[]}
  };
}

test('derives live political keywords from published NOW headlines',()=>{
  const current={draftId:'d2',publishedAt:'2026-08-23T00:00:00Z',ranked:[
    row(1,'김가','a',{headlines:[{title:'김가 전당대회 혁신안 발표',ts:Date.parse('2026-08-22T23:00:00Z'),source:'A'}]}),
    row(2,'이가','b',{headlines:[{title:'이가 전당대회 지도부 혁신안 논의',ts:Date.parse('2026-08-22T22:00:00Z'),source:'B'}]})
  ]};
  const signals=derivePublicSignals(current,{items:[]},Date.parse('2026-08-23T00:00:00Z'));
  assert.equal(signals.source,'published-now');
  assert.ok(signals.keywords.some(x=>x.label==='전당대회'));
  assert.ok(signals.keywords.some(x=>x.label==='혁신안'));
  assert.ok(!signals.keywords.some(x=>x.label==='김가'));
});

test('rising politicians prefer positive rank movement from previous published snapshot',()=>{
  const current={draftId:'d2',publishedAt:'2026-08-23T00:00:00Z',ranked:[row(1,'상승','a'),row(2,'유지','b'),row(3,'하락','c')]};
  const history={items:[
    {draftId:'d2',publishedAt:'2026-08-23T00:00:00Z',top30:current.ranked},
    {draftId:'d1',publishedAt:'2026-08-22T18:00:00Z',top30:[row(8,'상승','a'),row(2,'유지','b'),row(1,'하락','c')]}
  ]};
  const signals=derivePublicSignals(current,history,Date.parse('2026-08-23T00:00:00Z'));
  assert.equal(signals.rising[0].id,'a');
  assert.equal(signals.rising[0].rankDelta,7);
  assert.equal(signals.rising[0].trendLabel,'▲ 7');
});

test('person view exposes current row, trend, related politicians and why-now text',()=>{
  const current={draftId:'d2',publishedAt:'2026-08-23T00:00:00Z',ranked:[
    row(1,'김가','a',{party:'같은당',count6:4,count24:8,count7d:30,headlines:[{title:'김가 혁신안 발표',ts:Date.parse('2026-08-22T23:00:00Z'),source:'A',link:'https://example.com/a'}]}),
    row(2,'이가','b',{party:'같은당'}),row(3,'박가','c',{party:'다른당'})
  ]};
  const history={items:[{draftId:'d2',top30:current.ranked},{draftId:'d1',top30:[row(5,'김가','a')]}]};
  const view=derivePersonView(current,history,'a',Date.parse('2026-08-23T00:00:00Z'));
  assert.equal(view.row.person.id,'a');
  assert.equal(view.rankDelta,4);
  assert.match(view.whyNow,/혁신안|뉴스/);
  assert.equal(view.related[0].person.id,'b');
});
