'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');

const LIMIT=10_485_760;
const redisPath=path.resolve(__dirname,'../lib/v3/redis-now-safe-20260830.js');

function setupMock(){
  process.env.JCV3_REDIS_REST_URL='https://example.upstash.test';
  process.env.JCV3_REDIS_REST_TOKEN='test-token';
  const store=new Map();
  const bodies=[];
  global.fetch=async(url,opts={})=>{
    const body=String(opts.body||'');
    const bytes=Buffer.byteLength(body,'utf8');
    bodies.push({url:String(url),bytes,body});
    if(bytes>LIMIT){
      return {ok:false,status:400,json:async()=>({error:`ERR max request size exceeded. Limit: ${LIMIT} bytes, Actual: ${bytes} bytes.`})};
    }
    const parsed=JSON.parse(body||'[]');
    const run=(cmd)=>{
      const op=String(cmd?.[0]||'').toUpperCase();
      if(op==='PING')return 'PONG';
      if(op==='SET'){store.set(String(cmd[1]),String(cmd[2]));return 'OK';}
      if(op==='GET')return store.get(String(cmd[1]))??null;
      if(op==='MSET'){for(let i=1;i<cmd.length;i+=2)store.set(String(cmd[i]),String(cmd[i+1]));return 'OK';}
      if(op==='MGET')return cmd.slice(1).map(k=>store.get(String(k))??null);
      if(op==='DEL'){let n=0;for(const k of cmd.slice(1))if(store.delete(String(k)))n++;return n;}
      if(op==='SCAN')return ['0',[]];
      if(op==='ZADD')return 1;
      return 'OK';
    };
    if(String(url).endsWith('/pipeline')) return {ok:true,status:200,json:async()=>parsed.map(cmd=>({result:run(cmd)}))};
    return {ok:true,status:200,json:async()=>({result:run(parsed)})};
  };
  delete require.cache[redisPath];
  const redis=require(redisPath);
  return {redis,store,bodies};
}

test('single 10.5MB+ JSON value is stored below provider request ceiling and round-trips',async()=>{
  const {redis,bodies}=setupMock();
  const payload={marker:'large-current',blob:'가'.repeat(3_600_000)}; // >10 MiB as UTF-8 JSON
  const serializedBytes=Buffer.byteLength(JSON.stringify(payload),'utf8');
  assert.ok(serializedBytes>LIMIT,`fixture must exceed provider limit: ${serializedBytes}`);
  await redis.msetJSON([['nowDataCurrent',payload]]);
  assert.ok(bodies.length>=3,'large value should require multiple requests');
  assert.ok(Math.max(...bodies.map(x=>x.bytes))<LIMIT,'every request must stay under provider ceiling');
  const restored=await redis.getJSON('nowDataCurrent');
  assert.deepEqual(restored,payload);
});

test('large mixed MSET preserves all keys and never rebuilds an oversized request',async()=>{
  const {redis,bodies}=setupMock();
  const huge={blob:'x'.repeat(10_700_000)};
  const small={ok:true,n:1};
  await redis.msetJSON([['huge',huge],['small',small],['small2',{v:'ok'}]]);
  assert.ok(Math.max(...bodies.map(x=>x.bytes))<LIMIT);
  assert.deepEqual(await redis.getJSON('huge'),huge);
  assert.deepEqual(await redis.getJSON('small'),small);
});

test('pipeline auto-splits aggregate request bodies by byte budget',async()=>{
  const {redis,bodies}=setupMock();
  const commands=[];
  for(let i=0;i<8;i++)commands.push(['SET',`raw:${i}`,'z'.repeat(1_600_000)]);
  const result=await redis.pipeline(commands);
  assert.equal(result.length,8);
  assert.ok(bodies.filter(x=>x.url.endsWith('/pipeline')).length>=2,'oversized pipeline should split');
  assert.ok(Math.max(...bodies.map(x=>x.bytes))<LIMIT);
});

test('cleanup compatibility exports remain available',()=>{
  const {redis}=setupMock();
  assert.equal(typeof redis.scanDomains,'function');
  assert.equal(typeof redis.deleteDomains,'function');
});
