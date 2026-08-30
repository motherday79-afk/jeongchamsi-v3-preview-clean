const assert = require('assert');
const path = require('path');

(async()=>{
  process.env.JCV3_REDIS_REST_URL='https://example.invalid';
  process.env.JCV3_REDIS_REST_TOKEN='token';
  const bodies=[];
  global.fetch=async (_url,opts)=>{
    bodies.push(Buffer.byteLength(String(opts.body||''),'utf8'));
    return {ok:true,status:200,json:async()=>({result:'OK'})};
  };
  const redis=require(path.resolve(__dirname,'../lib/v3/redis.js'));
  const large='x'.repeat(5_200_000);
  await redis.msetJSON([
    ['one',{value:large}],
    ['two',{value:large}],
    ['small',{ok:true}]
  ]);
  assert.ok(bodies.length >= 2, `expected chunked writes, got ${bodies.length}`);
  assert.ok(Math.max(...bodies) < 9_000_000, `request too large: ${Math.max(...bodies)}`);
  console.log(`PASS requests=${bodies.length} maxBytes=${Math.max(...bodies)}`);
})().catch(err=>{console.error(err);process.exit(1)});
