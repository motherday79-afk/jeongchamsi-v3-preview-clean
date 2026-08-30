const assert = require('assert');
const path = require('path');
(async()=>{
  process.env.JCV3_REDIS_REST_URL='https://example.invalid';
  process.env.JCV3_REDIS_REST_TOKEN='token';
  const calls=[];
  global.fetch=async (_url,opts)=>{
    const args=JSON.parse(opts.body||'[]'); calls.push(args);
    const cursor=String(args[1]||'0');
    const result=cursor==='0'
      ? ['7',['jcv3:content:v4:nowDataBatch:a:0','jcv3:content:v4:nowDataBatch:a:1']]
      : ['0',['jcv3:content:v4:nowDataDraftMeta']];
    return {ok:true,status:200,json:async()=>({result})};
  };
  const redis=require(path.resolve(__dirname,'../lib/v3/redis.js'));
  assert.strictEqual(typeof redis.scanDomains,'function');
  const domains=await redis.scanDomains('nowData*');
  assert.deepStrictEqual(domains,['nowDataBatch:a:0','nowDataBatch:a:1','nowDataDraftMeta']);
  assert.strictEqual(calls.length,2);
  assert.strictEqual(calls[0][0],'SCAN');
  assert.ok(calls[0].includes('jcv3:content:v4:nowData*'));
  console.log('PASS scanDomains export + paged SCAN');
})().catch(e=>{console.error(e);process.exit(1)});
