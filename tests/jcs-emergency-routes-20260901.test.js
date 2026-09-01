'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {mock}=require('node:test');

function responseCapture(){
  return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};
}
function fresh(p){delete require.cache[require.resolve(p)];return require(p);}

test('HOME route returns 30 ranked people and 542 total even with no stored NOW publication',async()=>{
  const redis=require('../lib/v3/redis');
  const users=require('../lib/v3/users');
  const badges=require('../lib/v3/badge-celebrations');
  mock.method(redis,'mgetJSON',async domains=>domains.map(()=>null));
  mock.method(redis,'getJSON',async()=>null);
  mock.method(users,'listUsers',async()=>[]);
  mock.method(badges,'getRecentBadgeCelebrations',async()=>[]);
  try{
    const handler=fresh('../server/v3/routes/home');const res=responseCapture();
    await handler({method:'GET',query:{}},res);
    assert.equal(res.statusCode,200);
    assert.equal(res.body.ok,true);
    assert.equal(res.body.data.nowRank.total,542);
    assert.equal(res.body.data.nowRank.ranked.length,30);
    assert.equal(res.body.data.nowRank.modeled,true);
  }finally{mock.restoreAll();delete require.cache[require.resolve('../server/v3/routes/home')];}
});

test('public NOW route returns full category totals and person intelligence without stored publication',async()=>{
  const redis=require('../lib/v3/redis');
  mock.method(redis,'getJSON',async()=>null);
  mock.method(redis,'setJSON',async()=>{throw new Error('bootstrap path must not persist');});
  try{
    let handler=fresh('../server/v3/routes/now-data');let res=responseCapture();
    await handler({method:'GET',query:{type:'assembly',offset:'0',limit:'30'}},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.category.total,299);assert.equal(res.body.category.rows.length,30);assert.equal(res.body.category.modeled,true);
    res=responseCapture();
    await handler({method:'GET',query:{id:'assembly-001'}},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.current.modeled,true);assert.equal(res.body.person.row.person.id,'assembly-001');assert.ok(res.body.person.analysis);
  }finally{mock.restoreAll();delete require.cache[require.resolve('../server/v3/routes/now-data')];}
});

test('admin NOW GET reports a modeled top30 instead of an empty/failed dashboard when no publish exists',async()=>{
  const redis=require('../lib/v3/redis');
  const access=require('../lib/v3/access');
  mock.method(redis,'getJSON',async()=>null);
  mock.method(redis,'setJSON',async()=>null);
  mock.method(redis,'mgetJSON',async()=>[]);
  mock.method(access,'requireAdmin',async()=>({id:'admin',role:'admin'}));
  try{
    const handler=fresh('../server/v3/routes/admin/now-data');const res=responseCapture();
    await handler({method:'GET',query:{},body:{}},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.ok,true);assert.equal(res.body.rosterTotal,542);assert.equal(res.body.current.top30.length,30);assert.equal(res.body.current.modeled,true);assert.equal(res.body.fallbackReady,true);
  }finally{mock.restoreAll();delete require.cache[require.resolve('../server/v3/routes/admin/now-data')];}
});

test('user badge endpoint returns earned badge status instead of gateway module-load failure',async()=>{
  const access=require('../lib/v3/access');
  const activity=require('../lib/v3/activity');
  const engine=require('../lib/v3/badge-engine');
  const users=require('../lib/v3/users');
  const celebrations=require('../lib/v3/badge-celebrations');
  mock.method(access,'currentUser',async()=>({id:'u1',role:'member'}));
  mock.method(activity,'getActivity',async()=>({grantedBadges:[],badgeRecognition:{initialized:true,knownBadgeKeys:[]}}));
  mock.method(activity,'setActivity',async(_id,value)=>value);
  mock.method(engine,'loadBadgeStatus',async()=>({earnedBadges:['first-step'],metrics:{actionTotal:1},progress:{}}));
  mock.method(users,'getReferralStatus',async()=>({recruitedCount:0}));
  mock.method(celebrations,'reconcileBadgeRecognition',()=>({recognition:{initialized:true,knownBadgeKeys:['first-step']},newBadgeKeys:['first-step']}));
  mock.method(celebrations,'recordBadgeCelebrations',async()=>[]);
  try{
    const handler=fresh('../server/v3/routes/user/badges');const res=responseCapture();
    await handler({method:'GET'},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.ok,true);assert.deepEqual(res.body.status.earnedBadges,['first-step']);
  }finally{mock.restoreAll();delete require.cache[require.resolve('../server/v3/routes/user/badges')];}
});

test('admin badge endpoint returns badge-center summary instead of missing-route failure',async()=>{
  const access=require('../lib/v3/access');
  const users=require('../lib/v3/users');
  const activity=require('../lib/v3/activity');
  const redis=require('../lib/v3/redis');
  const celebrations=require('../lib/v3/badge-celebrations');
  mock.method(access,'requireAdmin',async()=>({id:'admin',role:'admin'}));
  mock.method(users,'listUsers',async()=>[{id:'u1',name:'User',role:'member',referralNumber:1}]);
  mock.method(users,'referralCountMap',()=>({}));
  mock.method(activity,'getActivities',async()=>({u1:{grantedBadges:[],badgeEvents:{}}}));
  mock.method(redis,'getJSON',async()=>({items:[]}));
  mock.method(celebrations,'getCelebrationConfig',async()=>({enabledBadgeKeys:[]}));
  mock.method(celebrations,'getRecentBadgeCelebrations',async()=>[]);
  try{
    const handler=fresh('../server/v3/routes/admin/badges');const res=responseCapture();
    await handler({method:'GET',body:{}},res);
    assert.equal(res.statusCode,200);assert.equal(res.body.ok,true);assert.equal(res.body.summary.members,1);assert.ok(res.body.summary.totalBadges>0);assert.equal(res.body.records.length,1);
  }finally{mock.restoreAll();delete require.cache[require.resolve('../server/v3/routes/admin/badges')];}
});
