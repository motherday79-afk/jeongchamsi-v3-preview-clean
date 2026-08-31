const {URL}=require('url');

function credentials(){const id=String(process.env.NAVER_API_HUB_CLIENT_ID||'').trim(),secret=String(process.env.NAVER_API_HUB_CLIENT_SECRET||'').trim();return {configured:Boolean(id&&secret),id,secret};}
function availability(){const c=credentials();return {available:c.configured,provider:'naver-news'};}
function cleanHtml(s=''){return String(s).replace(/<[^>]+>/g,' ').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\s+/g,' ').trim();}
function sourceDomain(link=''){try{return new URL(link).hostname.replace(/^www\./,'')}catch(_){return '';}}
function normalizeTitle(s=''){return cleanHtml(s).toLowerCase().replace(/\[[^\]]+\]/g,' ').replace(/[^0-9a-z가-힣]+/g,' ').replace(/\s+/g,' ').trim();}
function buildNewsQuery(person){
  const parts=[person.name,person.office];if(person.ambiguousName){const clue=(person.disambiguation||[]).find(x=>x&&x!==person.office&&x!==person.region);if(clue)parts.push(clue);}
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
function parseItems(json){return (json?.items||[]).map(x=>({title:cleanHtml(x.title),desc:cleanHtml(x.description),link:x.originallink||x.link||'',source:sourceDomain(x.originallink||x.link||''),ts:Date.parse(x.pubDate||''),provider:'naver-news'})).filter(x=>Number.isFinite(x.ts));}
function dedupe(items){const seen=new Set(),out=[];for(const x of items){const linkKey=x.link?String(x.link).split('?')[0]:'';const key=linkKey||normalizeTitle(x.title);if(!key||seen.has(key))continue;seen.add(key);out.push(x);}return out;}
function summarize(items,person,nowMs,total,query){
  const rows=dedupe(items).filter(x=>mentionsPerson(x,person)),h=n=>n*3600000;
  const recent7=rows.filter(x=>nowMs>=x.ts&&nowMs-x.ts<=h(168)),recent24=recent7.filter(x=>nowMs-x.ts<=h(24)),recent6=recent24.filter(x=>nowMs-x.ts<=h(6));
  const latest=recent7.length?Math.max(...recent7.map(x=>x.ts)):null;
  return {provider:'naver-news',configured:true,state:recent7.length?'OBSERVED':'ZERO',query,totalCount:Number(total||0),count6:recent6.length,count24:recent24.length,count7d:recent7.length,sources6:new Set(recent6.map(x=>x.source).filter(Boolean)).size,sources24:new Set(recent24.map(x=>x.source).filter(Boolean)).size,latest,headlines:recent7.slice(0,12).map(x=>({title:x.title,source:x.source,ts:x.ts,link:x.link})),fetchedAt:new Date().toISOString()};
}
async function collectNaverNews(person,{nowMs=Date.now()}={}){
  const c=credentials();if(!c.configured)return {provider:'naver-news',configured:false,state:'MISSING',detail:'NAVER API HUB credentials not configured',count6:0,count24:0,count7d:0,sources6:0,sources24:0,headlines:[]};
  const query=buildNewsQuery(person),url=`https://naverapihub.apigw.ntruss.com/search/v1/news?query=${encodeURIComponent(query)}&display=100&sort=date`;
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6500);let r;
  try{r=await fetch(url,{headers:{'X-NCP-APIGW-API-KEY-ID':c.id,'X-NCP-APIGW-API-KEY':c.secret},signal:ctl.signal});}finally{clearTimeout(timer);}
  const text=await r.text();let json={};try{json=JSON.parse(text);}catch(_){json={};}
  if(!r.ok)throw new Error(`NAVER News HTTP ${r.status}: ${text.slice(0,160)}`);
  return summarize(parseItems(json),person,nowMs,json.total,query);
}
module.exports={credentials,availability,cleanHtml,buildNewsQuery,mentionsPerson,parseItems,summarize,collectNaverNews};
