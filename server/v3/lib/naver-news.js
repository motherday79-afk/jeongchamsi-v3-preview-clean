const { URL } = require('url');

const NEWS_URL='https://openapi.naver.com/v1/search/news.json';
const GOOGLE_RSS_URL='https://news.google.com/rss/search';

function credentials(){
  const id=String(process.env.NAVER_NEWS_CLIENT_ID||process.env.NAVER_CLIENT_ID||'').trim();
  const secret=String(process.env.NAVER_NEWS_CLIENT_SECRET||process.env.NAVER_CLIENT_SECRET||'').trim();
  return {configured:Boolean(id&&secret),id,secret};
}
function availability(){
  const c=credentials();
  return {available:true,provider:c.configured?'naver-news-search-api':'google-news-rss-fallback',naverConfigured:c.configured};
}
function decodeXml(s=''){
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&#39;/g,"'")
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function cleanHtml(s=''){return decodeXml(String(s)).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function sourceDomain(link=''){try{return new URL(link).hostname.replace(/^www\./,'')}catch(_){return '';}}
function normalizeTitle(s=''){return cleanHtml(s).toLowerCase().replace(/\[[^\]]+\]/g,' ').replace(/[^0-9a-z가-힣]+/g,' ').replace(/\s+/g,' ').trim();}
function buildNewsQuery(person){
  const parts=[person.name,person.office];
  if(person.ambiguousName){const clue=(person.disambiguation||[]).find(x=>x&&x!==person.office&&x!==person.region);if(clue)parts.push(clue);}
  return parts.filter(Boolean).join(' ');
}
function contextTerms(person){
  const generic=person.entityType==='assembly'?['국회의원','의원','국회']:person.entityType==='metropolitan'?['시장','도지사','지방정부']:['시장','군수','구청장','기초단체장','지방정부'];
  return [...new Set([person.office,person.party,person.jurisdiction,person.region,...(person.disambiguation||[]),...generic,'정치','정당','선거','정책','정부'].map(x=>String(x||'').trim()).filter(x=>x.length>=2))];
}
function mentionsPerson(item,person){
  const text=cleanHtml(`${item.title||''} ${item.desc||''}`);if(!text.includes(person.name))return false;
  if(person.ambiguousName){const clues=(person.disambiguation||[]).filter(x=>x&&x!==person.region);return clues.some(x=>text.includes(x));}
  return contextTerms(person).some(x=>text.includes(x));
}
function parseItems(json){return (json?.items||[]).map(x=>({title:cleanHtml(x.title),desc:cleanHtml(x.description),link:x.originallink||x.link||'',source:sourceDomain(x.originallink||x.link||''),ts:Date.parse(x.pubDate||''),provider:'naver-news-search-api'})).filter(x=>Number.isFinite(x.ts));}
function tag(xml,tagName){const m=String(xml).match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`,'i'));return m?decodeXml(m[1]).trim():'';}
function parseGoogleRss(xml){
  const blocks=String(xml).match(/<item>[\s\S]*?<\/item>/gi)||[];
  return blocks.map(item=>{
    const title=cleanHtml(tag(item,'title'));
    const link=cleanHtml(tag(item,'link'));
    const desc=cleanHtml(tag(item,'description'));
    const pubDate=cleanHtml(tag(item,'pubDate'));
    const source=cleanHtml(tag(item,'source'))||sourceDomain(link);
    return {title,desc,link,source,ts:Date.parse(pubDate),provider:'google-news-rss-fallback'};
  }).filter(x=>Number.isFinite(x.ts));
}
function dedupe(items){const seen=new Set(),out=[];for(const x of items){const linkKey=x.link?String(x.link).split('?')[0]:'';const key=linkKey||normalizeTitle(x.title);if(!key||seen.has(key))continue;seen.add(key);out.push(x);}return out;}
function summarize(items,person,nowMs,total,query,provider='naver-news-search-api'){
  const rows=dedupe(items).filter(x=>mentionsPerson(x,person)),h=n=>n*3600000;
  const recent7=rows.filter(x=>nowMs>=x.ts&&nowMs-x.ts<=h(168)),recent24=recent7.filter(x=>nowMs-x.ts<=h(24)),recent6=recent24.filter(x=>nowMs-x.ts<=h(6));
  const latest=recent7.length?Math.max(...recent7.map(x=>x.ts)):null;
  return {provider,configured:true,state:recent7.length?'OBSERVED':'ZERO',query,totalCount:Number(total||rows.length||0),count6:recent6.length,count24:recent24.length,count7d:recent7.length,sources6:new Set(recent6.map(x=>x.source).filter(Boolean)).size,sources24:new Set(recent24.map(x=>x.source).filter(Boolean)).size,latest,headlines:recent7.slice(0,12).map(x=>({title:x.title,source:x.source,ts:x.ts,link:x.link})),fetchedAt:new Date().toISOString()};
}
async function fetchWithTimeout(url,options={},timeoutMs=6500){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:ctl.signal});}finally{clearTimeout(timer);}
}
async function collectGoogleNews(person,{nowMs=Date.now()}={}){
  const query=buildNewsQuery(person);
  const params=new URLSearchParams({q:query,hl:'ko',gl:'KR',ceid:'KR:ko'});
  const r=await fetchWithTimeout(`${GOOGLE_RSS_URL}?${params}`,{headers:{'User-Agent':'Mozilla/5.0 Jeongchamsi/3'}},6500);
  const text=await r.text();
  if(!r.ok)throw new Error(`Google News RSS HTTP ${r.status}: ${text.slice(0,160)}`);
  const items=parseGoogleRss(text);
  return summarize(items,person,nowMs,items.length,query,'google-news-rss-fallback');
}
async function collectNaverNews(person,{nowMs=Date.now()}={}){
  const c=credentials();
  if(!c.configured)return collectGoogleNews(person,{nowMs});
  const query=buildNewsQuery(person),params=new URLSearchParams({query,display:'100',start:'1',sort:'date'}),url=`${NEWS_URL}?${params}`;
  try{
    const r=await fetchWithTimeout(url,{headers:{'X-Naver-Client-Id':c.id,'X-Naver-Client-Secret':c.secret}},6500);
    const text=await r.text();let json={};try{json=JSON.parse(text);}catch(_){json={};}
    if(!r.ok)throw new Error(`NAVER News HTTP ${r.status}: ${text.slice(0,160)}`);
    return summarize(parseItems(json),person,nowMs,json.total,query,'naver-news-search-api');
  }catch(error){
    const fallback=await collectGoogleNews(person,{nowMs});
    fallback.fallbackReason=String(error?.message||error||'NAVER_NEWS_FAILED');
    return fallback;
  }
}
module.exports={NEWS_URL,GOOGLE_RSS_URL,credentials,availability,cleanHtml,buildNewsQuery,mentionsPerson,parseItems,parseGoogleRss,summarize,collectGoogleNews,collectNaverNews};
