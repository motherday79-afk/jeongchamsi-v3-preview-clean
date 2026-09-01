const {URL}=require('url');

function availability(){return {available:true,provider:'google-news-rss'};}
function cleanHtml(s=''){return decodeXml(String(s).replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();}
function decodeXml(s=''){return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)||32));}
function sourceDomain(link=''){try{return new URL(link).hostname.replace(/^www\./,'')}catch(_){return '';}}
function normalizeTitle(s=''){return cleanHtml(s).toLowerCase().replace(/\[[^\]]+\]/g,' ').replace(/[^0-9a-z가-힣]+/g,' ').replace(/\s+/g,' ').trim();}
function buildNewsQuery(person){
  const parts=[person.name,person.office];
  if(person.ambiguousName){const clue=(person.disambiguation||[]).find(x=>x&&x!==person.office&&x!==person.region);if(clue)parts.push(clue);}
  return parts.filter(Boolean).join(' ');
}
function contextTerms(person){
  const type=person.entityType||person.type;
  const generic=type==='assembly'?['국회의원','의원','국회']:type==='metropolitan'?['시장','도지사','지방정부']:['시장','군수','구청장','기초단체장','지방정부'];
  return [...new Set([person.office,person.party,person.jurisdiction,person.region,...(person.disambiguation||[]),...generic,'정치','정당','선거','정책','정부'].map(x=>String(x||'').trim()).filter(x=>x.length>=2))];
}
function mentionsPerson(item,person){
  const text=cleanHtml(`${item.title||''} ${item.desc||''}`);
  if(!text.includes(person.name))return false;
  if(person.ambiguousName){const clues=(person.disambiguation||[]).filter(x=>x&&x!==person.region);return clues.some(x=>text.includes(x));}
  return contextTerms(person).some(x=>text.includes(x));
}
function tag(block,name){const m=String(block).match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return m?decodeXml(m[1]).trim():'';}
function sourceTag(block){const m=String(block).match(/<source(?:\s+url=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/source>/i);return m?{url:decodeXml(m[1]||''),name:cleanHtml(m[2]||'')}:{url:'',name:''};}
function parseItems(xml=''){
  const blocks=String(xml).match(/<item\b[\s\S]*?<\/item>/gi)||[];
  return blocks.map(block=>{
    const source=sourceTag(block),link=tag(block,'link'),ts=Date.parse(tag(block,'pubDate'));
    return {title:cleanHtml(tag(block,'title')),desc:cleanHtml(tag(block,'description')),link,source:source.name||sourceDomain(source.url),sourceUrl:source.url,ts,provider:'google-news-rss'};
  }).filter(x=>Number.isFinite(x.ts));
}
function dedupe(items){const seen=new Set(),out=[];for(const x of items){const linkKey=x.link?String(x.link).split('?')[0]:'';const key=linkKey||normalizeTitle(x.title);if(!key||seen.has(key))continue;seen.add(key);out.push(x);}return out;}
function summarize(items,person,nowMs,query){
  const rows=dedupe(items).filter(x=>mentionsPerson(x,person)),h=n=>n*3600000;
  const recent7=rows.filter(x=>nowMs>=x.ts&&nowMs-x.ts<=h(168)),recent24=recent7.filter(x=>nowMs-x.ts<=h(24)),recent6=recent24.filter(x=>nowMs-x.ts<=h(6));
  const latest=recent7.length?Math.max(...recent7.map(x=>x.ts)):null;
  return {provider:'google-news-rss',configured:true,state:recent7.length?'OBSERVED':'ZERO',query,totalCount:rows.length,count6:recent6.length,count24:recent24.length,count7d:recent7.length,sources6:new Set(recent6.map(x=>x.source).filter(Boolean)).size,sources24:new Set(recent24.map(x=>x.source).filter(Boolean)).size,latest,headlines:recent7.slice(0,12).map(x=>({title:x.title,source:x.source,ts:x.ts,link:x.link})),fetchedAt:new Date(nowMs).toISOString()};
}
async function collectGoogleNews(person,{nowMs=Date.now()}={}){
  const query=buildNewsQuery(person);
  const url=`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6500);let r;
  try{r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 JCS/1.0'},signal:ctl.signal});}finally{clearTimeout(timer);}
  if(!r.ok)throw new Error(`Google News RSS HTTP ${r.status}`);
  const xml=await r.text();
  return summarize(parseItems(xml),person,nowMs,query);
}
module.exports={availability,cleanHtml,buildNewsQuery,mentionsPerson,parseItems,summarize,collectGoogleNews};
