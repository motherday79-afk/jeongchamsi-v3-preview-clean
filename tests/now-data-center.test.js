const test = require('node:test');
const assert = require('node:assert/strict');
const {
  makeBatches,
  scoreSnapshot,
  resultState,
  aggregateBatchSummaries
} = require('../server/v3/lib/now-data-engine');

test('makeBatches preserves every politician id exactly once', () => {
  const ids = Array.from({length: 542}, (_, i) => `person-${i + 1}`);
  const batches = makeBatches(ids, 10);
  assert.equal(batches.length, 55);
  assert.deepEqual(batches.flat(), ids);
  assert.ok(batches.every(batch => batch.length <= 10));
});

test('resultState distinguishes success partial and failure', () => {
  assert.equal(resultState({ search:{state:'OBSERVED'}, news:{state:'OBSERVED'} }), 'success');
  assert.equal(resultState({ search:{state:'ERROR'}, news:{state:'OBSERVED'} }), 'partial');
  assert.equal(resultState({ search:{state:'ERROR'}, news:{state:'ERROR'} }), 'failed');
});

test('scoreSnapshot ranks using only Naver search and Naver news signals', () => {
  const rows = [
    { person:{id:'a',name:'A'}, search:{monthlyTotalQcCnt:10000}, news:{count6:40,count24:80,count7d:200,sources24:25,latest:Date.now()} },
    { person:{id:'b',name:'B'}, search:{monthlyTotalQcCnt:5000}, news:{count6:10,count24:30,count7d:100,sources24:12,latest:Date.now()} },
    { person:{id:'c',name:'C'}, search:{monthlyTotalQcCnt:100}, news:{count6:0,count24:1,count7d:5,sources24:1,latest:Date.now()} }
  ];
  const ranked = scoreSnapshot(rows, {searchWeight:50, newsWeight:50});
  assert.deepEqual(ranked.map(x => x.person.id), ['a','b','c']);
  assert.equal(ranked[0].rank, 1);
  assert.ok(ranked[0].score > ranked[1].score);
  assert.ok(ranked[1].score > ranked[2].score);
  assert.deepEqual(ranked[0].providers, ['naver-search-ads','naver-news']);
});

test('aggregateBatchSummaries totals batch outcomes', () => {
  const summary = aggregateBatchSummaries([
    {results:[{search:{state:'OBSERVED'},news:{state:'OBSERVED'}},{search:{state:'ERROR'},news:{state:'OBSERVED'}}]},
    {results:[{search:{state:'ERROR'},news:{state:'ERROR'}}]}
  ], 542);
  assert.equal(summary.completed, 3);
  assert.equal(summary.success, 1);
  assert.equal(summary.partial, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.remaining, 539);
});
