const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const root = path.resolve(__dirname, '..');

function loadWithMocks(file, mocks) {
  const resolved = path.resolve(file);
  delete require.cache[resolved];
  const original = Module._load;
  Module._load = function(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) return mocks[request];
    return original.apply(this, arguments);
  };
  try { return require(resolved); }
  finally { Module._load = original; }
}

test('home route exposes published NOW top30 and signals to the real home render path', async () => {
  const nowAdmin = { draftId:'d1', publishedAt:'2026-08-31T00:00:00.000Z', weights:{search:50,news:50}, total:30,
    top30:Array.from({length:30},(_,i)=>({rank:i+1,score:100-i,person:{id:`p${i+1}`,name:`P${i+1}`}})) };
  const nowHome = { draftId:'d1', signals:{source:'published-now',keywords:[{label:'k'}],rising:[{title:'r'}]} };
  const domains = {};
  const contentDomains = ['columns','community','news','polls','academy','generation','nationalEvaluation','itsme','keywords','trending','president','brand'];
  for (const d of contentDomains) domains[d] = {items:[]};
  domains.nowDataPublicAdmin = nowAdmin;
  domains.nowDataPublicHome = nowHome;
  const redis = { mgetJSON: async keys => keys.map(k => domains[k] ?? null) };
  const handler = loadWithMocks(path.join(root,'server/v3/routes/home.js'), {
    '../../../lib/v3/redis': redis,
    '../../../lib/v3/schema': { defaultDomain: d => ({items:[],domain:d}) },
    '../../../lib/v3/users': { listUsers: async () => [] }
  });
  let status=0, body=null;
  const res={setHeader(){},status(v){status=v;return this;},json(v){body=v;return v;}};
  await handler({method:'GET'},res);
  assert.equal(status,200);
  assert.equal(body.data.nowRank.ranked.length,30);
  assert.equal(body.data.nowRank.ranked[29].rank,30);
  assert.equal(body.data.nowSignals.source,'published-now');
});

test('publish compactor keeps source intact, preserves essential numeric/person data, and fits a large MSET request under 9.5 MiB', () => {
  const { fitNowPublishEntries, requestBytes, TARGET_BYTES } = require(path.join(root,'server/v3/lib/now-publish-payload.js'));
  const longUrl='https://news.example.com/article/'+'x'.repeat(420);
  const longDesc='d'.repeat(520);
  const ranked=Array.from({length:542},(_,i)=>({
    rank:i+1,score:80,searchScore:70,newsScore:90,state:'success',
    person:{id:`p${i}`,name:`person-${i}`,type:'assembly',party:'party',jurisdiction:'region'},
    search:{state:'OBSERVED',monthlyPcQcCnt:100,monthlyMobileQcCnt:200,monthlyTotalQcCnt:300,ambiguousName:false},
    news:{state:'OBSERVED',count6:3,count24:7,count7d:20,sources24:5,
      latest:{title:'latest',desc:longDesc,link:longUrl,source:'news',ts:123,provider:'naver-news'},
      headlines:Array.from({length:12},(_,j)=>({title:`headline-${i}-${j}`,source:'news',ts:100+j,link:longUrl}))},
    providers:['naver-search-ads','naver-news']
  }));
  const current={schemaVersion:1,draftId:'d',publishedAt:'now',weights:{search:50,news:50},ranked,batchCount:55,batches:Array.from({length:55},(_,i)=>[`p${i}`]),providers:['naver-search-ads','naver-news']};
  const filler='z'.repeat(6_900_000);
  const entries=[['nowDataCurrent',current],['other',{filler}]];
  const before=JSON.parse(JSON.stringify(current));
  assert.ok(requestBytes(entries) > TARGET_BYTES, 'fixture must exceed target before compaction');
  const result=fitNowPublishEntries(entries);
  assert.ok(result.bytes <= TARGET_BYTES, `${result.bytes} should be <= ${TARGET_BYTES}`);
  assert.deepEqual(current,before,'source current must not be mutated');
  const storedCurrent=result.entries.find(([k])=>k==='nowDataCurrent')[1];
  assert.equal(storedCurrent.ranked.length,542);
  assert.equal(storedCurrent.ranked[0].person.id,'p0');
  assert.equal(storedCurrent.ranked[0].score,80);
  assert.equal(storedCurrent.ranked[0].search.monthlyTotalQcCnt,300);
  assert.equal(storedCurrent.ranked[0].news.count7d,20);
});

test('app owns NOW rank hydration locally and uses a fresh cache revision', () => {
  const app=fs.readFileSync(path.join(root,'src/app.js'),'utf8');
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(app,/function hydrateHomeNowRank\s*\(/);
  assert.doesNotMatch(app,/import\("\.\/views\/home\.js[^\n]+hydrateHomeNowRank/);
  assert.match(app,/setInterval\([^\n]*4000/);
  assert.match(app,/data-now-rank-prev/);
  assert.match(app,/data-now-rank-next/);
  assert.match(index,/jcs-plan-a-r1/);
});
