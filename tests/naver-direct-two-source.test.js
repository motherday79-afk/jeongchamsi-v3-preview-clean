const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('path');
const newsPath=path.resolve(__dirname,'../server/v3/lib/naver-news.js');
function fresh(){delete require.cache[newsPath];return require(newsPath);}
function withEnv(values,fn){const before={};for(const [k,v] of Object.entries(values)){before[k]=process.env[k];if(v==null)delete process.env[k];else process.env[k]=v;}return Promise.resolve().then(fn).finally(()=>{for(const [k,v] of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});}

test('official Naver News Search API is used directly',async()=>{
  let seen;
  const oldFetch=global.fetch;
  global.fetch=async(url,opts={})=>{seen={url:String(url),headers:opts.headers||{}};return {ok:true,status:200,text:async()=>JSON.stringify({total:1,items:[{title:'김민석 국회의원 현안',description:'더불어민주당 국회',originallink:'https://news.example/a',link:'https://news.example/a',pubDate:new Date().toUTCString()}]})};};
  try{
    await withEnv({NAVER_NEWS_CLIENT_ID:'id',NAVER_NEWS_CLIENT_SECRET:'secret',NAVER_CLIENT_ID:null,NAVER_CLIENT_SECRET:null},async()=>{
      const {collectNaverNews}=fresh();
      const person={name:'김민석',office:'국회의원',party:'더불어민주당',jurisdiction:'서울 영등포구을',region:'서울',entityType:'assembly',ambiguousName:false,disambiguation:[]};
      const r=await collectNaverNews(person,{nowMs:Date.now()});
      assert.match(seen.url,/^https:\/\/openapi\.naver\.com\/v1\/search\/news\.json\?/);
      assert.equal(seen.headers['X-Naver-Client-Id'],'id');
      assert.equal(seen.headers['X-Naver-Client-Secret'],'secret');
      assert.equal(r.provider,'naver-news-search-api');
    });
  } finally {global.fetch=oldFetch;}
});

test('news module contains no API HUB endpoint or credential name',()=>{
  const fs=require('fs');
  const s=fs.readFileSync(newsPath,'utf8');
  assert.equal(/naverapihub|NAVER_API_HUB|X-NCP-APIGW/i.test(s),false);
});


test('missing Naver news credentials falls back to Google News RSS',async()=>{
  let seen='';
  const oldFetch=global.fetch;
  global.fetch=async(url)=>{seen=String(url);return {ok:true,status:200,text:async()=>`<?xml version="1.0"?><rss><channel><item><title>김민석 국회의원 현안 - 테스트신문</title><link>https://news.google.com/rss/articles/x</link><pubDate>${new Date().toUTCString()}</pubDate><description>김민석 국회의원 국회 현안</description><source url="https://example.com">테스트신문</source></item></channel></rss>`};};
  try{
    await withEnv({NAVER_NEWS_CLIENT_ID:null,NAVER_NEWS_CLIENT_SECRET:null,NAVER_CLIENT_ID:null,NAVER_CLIENT_SECRET:null},async()=>{
      const {collectNaverNews}=fresh();
      const person={name:'김민석',office:'국회의원',party:'더불어민주당',jurisdiction:'서울 영등포구을',region:'서울',entityType:'assembly',ambiguousName:false,disambiguation:[]};
      const r=await collectNaverNews(person,{nowMs:Date.now()});
      assert.match(seen,/^https:\/\/news\.google\.com\/rss\/search\?/);
      assert.equal(r.provider,'google-news-rss-fallback');
      assert.equal(r.configured,true);
    });
  } finally {global.fetch=oldFetch;}
});
