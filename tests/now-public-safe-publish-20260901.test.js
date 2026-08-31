'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');

function store(initial={}){
  const map=new Map(Object.entries(initial));
  const calls=[];
  return {
    calls,map,
    async getJSON(key){return map.has(key)?JSON.parse(JSON.stringify(map.get(key))):null;},
    async setJSON(key,value){calls.push(key);map.set(key,JSON.parse(JSON.stringify(value)));return true;}
  };
}

test('safe public publisher writes every large person payload as its own Redis request and commits metadata last',async()=>{
  const { createSafePublicPublisher }=require('../server/v3/lib/safe-public-publish');
  const db=store({'meta':{status:'preview'},'p:a':{v:'old-a'},'p:b':{v:'old-b'}});
  const pub=createSafePublicPublisher({getJSON:db.getJSON,setJSON:db.setJSON},{concurrency:2,maxEntryBytes:9_000_000});
  await pub.publish({personEntries:[['p:a',{v:'new-a'}],['p:b',{v:'new-b'}]],controlEntries:[['home',{v:1}],['admin',{v:1}]],commitEntry:['meta',{status:'published'}]});
  assert.deepEqual(db.calls,['p:a','p:b','home','admin','meta']);
  assert.equal(db.map.get('meta').status,'published');
});

test('safe public publisher rolls back person payloads and never flips commit metadata when a write fails',async()=>{
  const { createSafePublicPublisher }=require('../server/v3/lib/safe-public-publish');
  const map=new Map([['meta',{status:'preview'}],['p:a',{v:'old-a'}],['p:b',{v:'old-b'}]]);const calls=[];
  let failed=false;
  const deps={
    async getJSON(key){return map.has(key)?JSON.parse(JSON.stringify(map.get(key))):null;},
    async setJSON(key,value){calls.push(key);if(key==='p:b'&&!failed){failed=true;throw new Error('request too large');}map.set(key,JSON.parse(JSON.stringify(value)));}
  };
  const pub=createSafePublicPublisher(deps,{concurrency:1,maxEntryBytes:9_000_000});
  await assert.rejects(()=>pub.publish({personEntries:[['p:a',{v:'new-a'}],['p:b',{v:'new-b'}]],controlEntries:[['home',{v:1}]],commitEntry:['meta',{status:'published'}]}));
  assert.deepEqual(map.get('p:a'),{v:'old-a'});
  assert.deepEqual(map.get('p:b'),{v:'old-b'});
  assert.equal(map.get('meta').status,'preview');
  assert.ok(!calls.includes('home'));
});

test('safe public publisher rejects one oversized value before sending it to Redis',async()=>{
  const { createSafePublicPublisher }=require('../server/v3/lib/safe-public-publish');
  const db=store();const pub=createSafePublicPublisher({getJSON:db.getJSON,setJSON:db.setJSON},{concurrency:1,maxEntryBytes:100});
  await assert.rejects(()=>pub.publish({personEntries:[['p:a',{blob:'x'.repeat(500)}]],controlEntries:[],commitEntry:['meta',{status:'published'}]}),err=>err&&err.code==='NOW_PUBLIC_ENTRY_TOO_LARGE');
  assert.equal(db.calls.length,0);
});
