const assert=require('assert');
const fs=require('fs');
const path=require('path');
const {compactCurrentForStorage}=require('../server/v3/lib/now-storage-compact');

const route=fs.readFileSync(path.join(__dirname,'../server/v3/routes/admin/now-data.js'),'utf8');

// Storage CURRENT must discard provider/raw baggage and cap headline/link payloads.
const huge='x'.repeat(50000);
const current={draftId:'d',publishedAt:new Date().toISOString(),weights:{search:50,news:50},ranked:Array.from({length:542},(_,i)=>({
  rank:i+1,score:50,state:'success',searchScore:50,newsScore:50,
  person:{id:`p${i}`,type:'assembly',name:`name${i}`,party:'party',jurisdiction:'region',office:'office',extraRaw:huge},
  search:{state:'OBSERVED',monthlyPcQcCnt:1,monthlyMobileQcCnt:2,monthlyTotalQcCnt:3,providerRaw:huge},
  news:{state:'OBSERVED',count6:1,count24:2,count7d:3,sources24:2,providerRaw:huge,headlines:Array.from({length:12},(_,j)=>({title:`headline ${j} ${huge}`,source:'news',ts:Date.now(),link:'https://example.com/'+huge}))},
  providerRaw:huge
}))};
const compact=compactCurrentForStorage(current);
const bytes=Buffer.byteLength(JSON.stringify(compact));
assert(bytes < 3_000_000,`compact CURRENT too large: ${bytes}`);
assert(!JSON.stringify(compact).includes(huge.slice(0,10000)),'raw baggage leaked into compact CURRENT');

// Publish must not bundle the full snapshot family into one MSET request.
const publishBlock=route.slice(route.indexOf("if(action==='publish')"));
assert(!/await\s+msetJSON\(\[\s*\[CURRENT/.test(publishBlock),'publish still bundles CURRENT + snapshots in a single MSET');

// Person writes must use deliberately small chunks (<=10) so even an older redis adapter cannot hit 10 MiB.
const chunkMatch=route.match(/for\(let i=0;i<entries\.length;i\+=(\d+)\)/);
assert(chunkMatch,'person write chunk size not found');
assert(Number(chunkMatch[1])<=10,`person write chunk too large: ${chunkMatch[1]}`);

console.log('PASS now publish storage rootfix contract');
