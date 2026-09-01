const test=require('node:test');
const assert=require('node:assert/strict');

const rosterPath='../server/v3/lib/politician-live-roster';
const searchPath='../server/v3/lib/naver-searchad';
const newsPath='../server/v3/lib/google-news-rss';

function fresh(mod){ delete require.cache[require.resolve(mod)]; return require(mod); }

function withEnv(values,fn){
  const before={};
  for(const [k,v] of Object.entries(values)){ before[k]=process.env[k]; if(v===undefined)delete process.env[k]; else process.env[k]=v; }
  return Promise.resolve().then(fn).finally(()=>{for(const [k,v] of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
}

test('current roster exposes 542 real politicians and marks duplicate names',()=>{
  const {allPeople,getPersonById}=fresh(rosterPath);
  const people=allPeople();
  assert.equal(people.length,542);
  assert.equal(getPersonById('assembly-001').name,'김민석');
  assert.equal(getPersonById('assembly-026').ambiguousName,true);
  assert.equal(getPersonById('assembly-211').ambiguousName,true);
  assert.equal(getPersonById('assembly-115').ambiguousName,true);
  assert.equal(getPersonById('basic-111').ambiguousName,true);
});

test('current roster derives offices for assembly, metro, city, district and county leaders',()=>{
  const {getPersonById}=fresh(rosterPath);
  assert.equal(getPersonById('assembly-001').office,'국회의원');
  assert.equal(getPersonById('metropolitan-001').office,'서울특별시장');
  assert.equal(getPersonById('metropolitan-009').office,'경기도지사');
  assert.equal(getPersonById('basic-001').office,'종로구청장');
  assert.equal(getPersonById('basic-111').office,'부여군수');
});

test('search-ad parser preserves PC/mobile counts and handles NAVER low-volume marker',()=>{
  const {parseKeywordResponse}=fresh(searchPath);
  const r=parseKeywordResponse('김민석',{keywordList:[
    {relKeyword:'김민석',monthlyPcQcCnt:1234,monthlyMobileQcCnt:5678},
    {relKeyword:'다른키워드',monthlyPcQcCnt:'< 10',monthlyMobileQcCnt:'< 10'}
  ]});
  assert.equal(r.found,true);
  assert.equal(r.monthlyPcQcCnt,1234);
  assert.equal(r.monthlyMobileQcCnt,5678);
  assert.equal(r.monthlyTotalQcCnt,6912);
  const low=parseKeywordResponse('다른키워드',{keywordList:[{relKeyword:'다른키워드',monthlyPcQcCnt:'< 10',monthlyMobileQcCnt:'< 10'}]});
  assert.equal(low.monthlyPcQcCnt,5);
  assert.equal(low.monthlyMobileQcCnt,5);
});

test('local Search Ads uses office-qualified term first and unique-name fallback only when needed',async()=>{
  const {getPersonById}=fresh(rosterPath);
  const {collectSearchPulse}=fresh(searchPath);
  const person=getPersonById('basic-001');
  const calls=[];
  const oldFetch=global.fetch;
  global.fetch=async url=>{
    calls.push(String(url));
    const q=new URL(String(url)).searchParams.get('hintKeywords');
    const row=q==='유찬종종로구청장'
      ? {keywordList:[]}
      : {keywordList:[{relKeyword:'유찬종',monthlyPcQcCnt:100,monthlyMobileQcCnt:300}]};
    return {ok:true,status:200,text:async()=>JSON.stringify(row)};
  };
  try{
    await withEnv({NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},async()=>{
      const r=await collectSearchPulse(person);
      assert.equal(r.queryTerm,'유찬종');
      assert.equal(r.qualificationMode,'unique-name-fallback');
      assert.equal(r.monthlyPcQcCnt,100);
      assert.equal(r.monthlyMobileQcCnt,300);
      assert.equal(r.monthlyTotalQcCnt,400);
      assert.equal(r.confidenceFactor,0.72);
      assert.equal(calls.length,2);
    });
  }finally{global.fetch=oldFetch;}
});

test('ambiguous Search Ads never assigns shared name volume to an individual politician',async()=>{
  const {getPersonById}=fresh(rosterPath);
  const {collectSearchPulse}=fresh(searchPath);
  const person=getPersonById('assembly-026');
  const oldFetch=global.fetch;
  global.fetch=async()=>({ok:true,status:200,text:async()=>JSON.stringify({keywordList:[{relKeyword:'박지원',monthlyPcQcCnt:1000,monthlyMobileQcCnt:2000}]})});
  try{
    await withEnv({NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},async()=>{
      const r=await collectSearchPulse(person);
      assert.equal(r.ambiguousName,true);
      assert.equal(r.monthlyPcQcCnt,0);
      assert.equal(r.monthlyMobileQcCnt,0);
      assert.equal(r.monthlyTotalQcCnt,0);
      assert.equal(r.sharedNameMonthlyTotalQcCnt,3000);
    });
  }finally{global.fetch=oldFetch;}
});

test('Google News RSS keeps politician context, dedupes, and summarizes 6h/24h/7d',async()=>{
  const {getPersonById}=fresh(rosterPath);
  const {collectGoogleNews}=fresh(newsPath);
  const person=getPersonById('assembly-001');
  const now=Date.now();
  const dt=h=>new Date(now-h*3600000).toUTCString();
  const xml=`<?xml version="1.0"?><rss><channel>
    <item><title>김민석 국회의원 정책 발표 - 연합뉴스</title><link>https://news.google.com/rss/articles/1</link><pubDate>${dt(1)}</pubDate><description>더불어민주당 서울 영등포</description><source url="https://yna.co.kr">연합뉴스</source></item>
    <item><title>김민석 국회의원 정책 발표 - 연합뉴스</title><link>https://news.google.com/rss/articles/1</link><pubDate>${dt(1)}</pubDate><description>중복 기사</description><source url="https://yna.co.kr">연합뉴스</source></item>
    <item><title>김민석 의원 국회 토론회 - KBS</title><link>https://news.google.com/rss/articles/2</link><pubDate>${dt(12)}</pubDate><description>정치 현안</description><source url="https://kbs.co.kr">KBS</source></item>
    <item><title>김민석 의원 인터뷰 - MBC</title><link>https://news.google.com/rss/articles/3</link><pubDate>${dt(72)}</pubDate><description>국회 현안</description><source url="https://imnews.imbc.com">MBC</source></item>
    <item><title>김민석 셰프 신메뉴 - 푸드뉴스</title><link>https://news.google.com/rss/articles/4</link><pubDate>${dt(1)}</pubDate><description>요리 프로그램</description><source url="https://food.example">푸드뉴스</source></item>
  </channel></rss>`;
  const oldFetch=global.fetch;
  global.fetch=async url=>{
    assert.match(String(url),/^https:\/\/news\.google\.com\/rss\/search\?/);
    return {ok:true,status:200,text:async()=>xml};
  };
  try{
    const r=await collectGoogleNews(person,{nowMs:now});
    assert.equal(r.provider,'google-news-rss');
    assert.equal(r.count6,1);
    assert.equal(r.count24,2);
    assert.equal(r.count7d,3);
    assert.equal(r.sources6,1);
    assert.equal(r.sources24,2);
    assert.equal(r.headlines.length,3);
    assert.match(r.query,/김민석/);
    assert.match(r.query,/국회의원/);
  }finally{global.fetch=oldFetch;}
});

test('live data combines NAVER Search Ads with Google News RSS',async()=>{
  const {getLiveDataById}=fresh('../server/v3/lib/politician-live-data');
  const now=Date.now();
  const oldFetch=global.fetch;
  global.fetch=async url=>{
    const u=String(url);
    if(u.includes('api.searchad.naver.com')) return {ok:true,status:200,text:async()=>JSON.stringify({keywordList:[{relKeyword:'김민석',monthlyPcQcCnt:5000,monthlyMobileQcCnt:15000}]})};
    if(u.includes('news.google.com/rss/search')) return {ok:true,status:200,text:async()=>`<?xml version=\"1.0\"?><rss><channel><item><title>김민석 국회의원 현안 - 연합뉴스</title><link>https://news.google.com/rss/articles/1</link><pubDate>${new Date(now-3600000).toUTCString()}</pubDate><description>더불어민주당 국회</description><source url=\"https://yna.co.kr\">연합뉴스</source></item></channel></rss>`};
    throw new Error(`unexpected source ${u}`);
  };
  try{
    await withEnv({NAVER_AD_ACCESS_LICENSE:'a',NAVER_AD_SECRET_KEY:'b',NAVER_AD_CUSTOMER_ID:'c'},async()=>{
      const r=await getLiveDataById('assembly-001',{nowMs:now});
      assert.equal(r.ok,true);
      assert.equal(r.person.id,'assembly-001');
      assert.equal(r.search.monthlyPcQcCnt,5000);
      assert.equal(r.search.monthlyMobileQcCnt,15000);
      assert.equal(r.news.count6,1);
      assert.deepEqual(r.providers,['naver-search-ads','google-news-rss']);
    });
  }finally{global.fetch=oldFetch;}
});
