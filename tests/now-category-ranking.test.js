const test=require('node:test');
const assert=require('node:assert/strict');

const snapshot=require('../server/v3/lib/now-public-snapshot');

function row(rank,id,type,score){
  return {rank,score,state:'success',person:{id,name:id,type,party:'테스트당',jurisdiction:'테스트'},search:{},news:{}};
}

test('buildCategoryPublicSnapshots preserves NOW score order and re-numbers within each category',()=>{
  assert.equal(typeof snapshot.buildCategoryPublicSnapshots,'function');
  const current={draftId:'d1',publishedAt:'2026-08-24T00:00:00.000Z',weights:{search:50,news:50},ranked:[
    row(1,'m1','metropolitan',99),
    row(2,'a1','assembly',95),
    row(3,'b1','basic',92),
    row(4,'a2','assembly',90),
    row(5,'b2','basic',88),
    row(6,'a3','assembly',80)
  ]};
  const groups=snapshot.buildCategoryPublicSnapshots(current);
  assert.deepEqual(groups.assembly.rows.map(x=>[x.categoryRank,x.globalRank,x.person.id]),[[1,2,'a1'],[2,4,'a2'],[3,6,'a3']]);
  assert.deepEqual(groups.metropolitan.rows.map(x=>[x.categoryRank,x.globalRank,x.person.id]),[[1,1,'m1']]);
  assert.deepEqual(groups.basic.rows.map(x=>[x.categoryRank,x.globalRank,x.person.id]),[[1,3,'b1'],[2,5,'b2']]);
  assert.equal(groups.assembly.total,3);
});

test('category rows stay compact and omit raw search/news payloads',()=>{
  const current={draftId:'d2',publishedAt:'2026-08-24T00:00:00.000Z',ranked:[{
    ...row(1,'a1','assembly',91),
    search:{monthlyPcQcCnt:123456,monthlyMobileQcCnt:999999},
    news:{count6:99,headlines:Array.from({length:12},(_,i)=>({title:`headline-${i}`}))}
  }]};
  const groups=snapshot.buildCategoryPublicSnapshots(current);
  const item=groups.assembly.rows[0];
  assert.equal('search' in item,false);
  assert.equal('news' in item,false);
  assert.deepEqual(Object.keys(item).sort(),['categoryRank','globalRank','person','score','state'].sort());
});
