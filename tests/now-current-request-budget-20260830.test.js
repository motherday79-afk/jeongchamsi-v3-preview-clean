const assert=require('assert');
const path=require('path');
const {compactCurrentForStorage}=require('../server/v3/lib/now-storage-compact');
(async()=>{
  process.env.JCV3_REDIS_REST_URL='https://example.invalid';
  process.env.JCV3_REDIS_REST_TOKEN='token';
  let maxBody=0;
  global.fetch=async (_url,opts)=>{maxBody=Math.max(maxBody,Buffer.byteLength(String(opts.body||'')));return {ok:true,status:200,json:async()=>({result:'OK'})};};
  const redis=require(path.resolve(__dirname,'../lib/v3/redis.js'));
  const huge='x'.repeat(50000);
  const current={draftId:'d',publishedAt:new Date().toISOString(),weights:{search:50,news:50},ranked:Array.from({length:542},(_,i)=>({rank:i+1,score:50,state:'success',searchScore:50,newsScore:50,person:{id:`p${i}`,type:'assembly',name:`name${i}`,party:'party',jurisdiction:'region',office:'office',extraRaw:huge},search:{state:'OBSERVED',monthlyPcQcCnt:1,monthlyMobileQcCnt:2,monthlyTotalQcCnt:3,providerRaw:huge},news:{state:'OBSERVED',count6:1,count24:2,count7d:3,sources24:2,providerRaw:huge,headlines:Array.from({length:12},(_,j)=>({title:`headline ${j} ${huge}`,source:'news',ts:Date.now(),link:'https://example.com/'+huge}))},providerRaw:huge}))};
  const compact=compactCurrentForStorage(current);
  await redis.setJSON('nowDataCurrent',compact);
  assert(maxBody<3_000_000,`CURRENT request too large: ${maxBody}`);
  console.log(`PASS currentRequestBytes=${maxBody}`);
})().catch(e=>{console.error(e);process.exit(1)});
