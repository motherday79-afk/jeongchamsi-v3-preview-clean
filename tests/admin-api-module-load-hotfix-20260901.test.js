'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const {mock}=require('node:test');

function responseCapture(){
  return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
}

function clearNowAdminCache(){
  for(const key of Object.keys(require.cache)){
    if(key.includes(path.join('server','v3','routes','admin','now-data'))||key.includes(path.join('server','v3','lib','age-gender-public-baseline-collector'))) delete require.cache[key];
  }
}

test('gateway keeps admin/history loader statically traceable for Vercel bundle',()=>{
  const src=fs.readFileSync(path.join(__dirname,'..','api','gateway.js'),'utf8');
  assert.match(src,/"admin\/history"\s*:\s*\(\)\s*=>\s*require\("\.\.\/server\/v3\/routes\/admin\/history"\)/);
  assert.doesNotMatch(src,/require\("\.\.\/server\/v3\/routes\/admin\/"\s*\+\s*"history"\)/);
});

test('admin NOW status GET can load even when action-only age/gender collector is unavailable',async()=>{
  const redis=require('../lib/v3/redis');
  const access=require('../lib/v3/access');
  mock.method(redis,'getJSON',async()=>null);
  mock.method(redis,'setJSON',async()=>null);
  mock.method(redis,'mgetJSON',async()=>[]);
  mock.method(access,'requireAdmin',async()=>({id:'admin',role:'admin'}));

  const originalLoad=Module._load;
  Module._load=function(request,parent,isMain){
    if(String(request).includes('age-gender-public-baseline-collector')){
      const err=new Error('simulated Vercel trace omission');
      err.code='MODULE_NOT_FOUND';
      throw err;
    }
    return originalLoad.apply(this,arguments);
  };

  try{
    clearNowAdminCache();
    const handler=require('../server/v3/routes/admin/now-data');
    const res=responseCapture();
    await handler({method:'GET',query:{},body:{}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.ok,true);
    assert.equal(res.body.rosterTotal,542);
  }finally{
    Module._load=originalLoad;
    mock.restoreAll();
    clearNowAdminCache();
  }
});
