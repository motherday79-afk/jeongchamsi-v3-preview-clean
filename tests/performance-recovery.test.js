const test=require('node:test');
const assert=require('node:assert/strict');

const {buildHomePublicSnapshot,compactPreviewRow}=require('../server/v3/lib/now-public-snapshot');

function row(rank,id){
  return {
    rank,score:80-rank,state:'success',searchScore:70,newsScore:60,
    person:{id,name:`인물${rank}`,party:'테스트당',jurisdiction:'서울 테스트구',office:'국회의원'},
    search:{state:'OK',monthlyPcQcCnt:1000,monthlyMobileQcCnt:3000,monthlyTotalQcCnt:4000},
    news:{state:'OK',count6:2,count24:5,count7d:20,sources24:4,headlines:[{title:`인물${rank} 혁신안 발표`,link:'https://example.com',source:'테스트뉴스',ts:Date.parse('2026-08-22T23:00:00Z')}]}
  };
}

test('home public snapshot contains only top10 plus derived signals, never all 542 rows',()=>{
  const ranked=Array.from({length:542},(_,i)=>row(i+1,`p${i+1}`));
  const current={draftId:'d2',publishedAt:'2026-08-23T00:00:00Z',weights:{search:50,news:50},ranked};
  const history={items:[]};
  const out=buildHomePublicSnapshot(current,history,Date.parse('2026-08-23T00:00:00Z'));
  assert.equal(out.top10.length,10);
  assert.equal(out.total,542);
  assert.equal(out.top10[0].person.id,'p1');
  assert.ok(Array.isArray(out.signals.keywords));
  assert.ok(Array.isArray(out.signals.rising));
  assert.equal(JSON.stringify(out).includes('p542'),false);
});

test('compact preview row strips headline payload',()=>{
  const out=compactPreviewRow(row(1,'p1'));
  assert.equal(out.person.id,'p1');
  assert.equal(out.news.count24,5);
  assert.equal('headlines' in out.news,false);
  assert.equal('latest' in out.news,false);
});

test('person public entries are one politician per key and related rows stay compact',()=>{
  const {buildPersonPublicEntries}=require('../server/v3/lib/now-public-snapshot');
  const current={draftId:'d2',publishedAt:'2026-08-23T00:00:00Z',ranked:[row(1,'p1'),row(2,'p2'),row(3,'p3')]};
  const entries=buildPersonPublicEntries(current,{items:[]},Date.parse('2026-08-23T00:00:00Z'));
  assert.equal(entries.length,3);
  assert.equal(entries[0][0],'nowDataPersonPublic:p1');
  assert.equal(entries[0][1].row.person.id,'p1');
  const related=entries[0][1].related[0];
  assert.equal('news' in related,false);
  assert.equal('search' in related,false);
});

test('compact home NOW snapshot is at least 20x smaller than full 542-row source fixture',()=>{
  const ranked=Array.from({length:542},(_,i)=>{
    const x=row(i+1,`p${i+1}`);
    x.news.headlines=Array.from({length:12},(_,j)=>({title:`인물${i+1} 정치 현안 관련 긴 뉴스 제목 ${j} 정책 논의와 지역 현안 보도`,link:`https://example.com/${i}/${j}`,source:'테스트뉴스',ts:Date.parse('2026-08-22T23:00:00Z')-j*3600000}));
    return x;
  });
  const current={draftId:'d2',publishedAt:'2026-08-23T00:00:00Z',weights:{search:50,news:50},ranked};
  const compact=buildHomePublicSnapshot(current,{items:[]},Date.parse('2026-08-23T00:00:00Z'));
  const fullBytes=Buffer.byteLength(JSON.stringify(current));
  const compactBytes=Buffer.byteLength(JSON.stringify(compact));
  assert.ok(compactBytes < fullBytes/20,`expected compact ${compactBytes} < full/20 ${fullBytes/20}`);
});
