const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {compactCurrentForStorage}=require('../server/v3/lib/now-storage-compact');

const hugeLink='https://example.com/'+('x'.repeat(18000));
const ranked=Array.from({length:542},(_,i)=>({
  rank:i+1,score:50,person:{id:`p-${i}`,name:`정치인${i}`,party:'정당',jurisdiction:'대한민국'},
  search:{monthlyTotalQcCnt:12345},
  news:{count6:3,count24:9,count7d:25,sources24:4,latest:Date.now(),headlines:Array.from({length:12},(_,j)=>({title:`정치인${i} 뉴스 ${j}`,source:'news.example',ts:Date.now()-j*1000,link:hugeLink}))}
}));
const current={schemaVersion:1,draftId:'draft',publishedAt:new Date().toISOString(),weights:{search:50,news:50},ranked};
const originalBytes=Buffer.byteLength(JSON.stringify(current));
assert(originalBytes>10_485_760,'fixture must reproduce an over-10MiB current snapshot');
const compact=compactCurrentForStorage(current);
const compactBytes=Buffer.byteLength(JSON.stringify(compact));
assert(compactBytes<7_500_000,`compacted current must stay safely below request limit, got ${compactBytes}`);
assert.strictEqual(compact.ranked.length,542);
assert.strictEqual(compact.ranked[0].news.headlines.length,8);
assert.deepStrictEqual(Object.keys(compact.ranked[0].news.headlines[0]).sort(),['source','title','ts']);
assert.strictEqual(compact.ranked[0].news.headlines[0].link,undefined);
assert.strictEqual(compact.ranked[0].news.latest,current.ranked[0].news.latest);

const route=fs.readFileSync(path.join(__dirname,'../server/v3/routes/admin/now-data.js'),'utf8');
assert(route.includes("const { compactCurrentForStorage } = require('../../lib/now-storage-compact');"));
assert(route.includes('const storageCurrent=compactCurrentForStorage(current);'));
assert(route.includes('[CURRENT,storageCurrent]'));
console.log(`PASS now-storage-current-compaction original=${originalBytes} compact=${compactBytes}`);
