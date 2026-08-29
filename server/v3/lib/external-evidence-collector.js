'use strict';

const crypto=require('node:crypto');

const VERSION='JCS_EXTERNAL_EVIDENCE_V1';
const MAX_BODY_BYTES=2_500_000;
const FETCH_TIMEOUT_MS=7000;
const SOURCE_DEFS=Object.freeze({
  gallup:Object.freeze({
    sourceId:'gallup',institution:'한국갤럽',
    url:'https://www.gallup.co.kr/gallupdb/report.asp',
    sourceType:'PUBLIC_RESEARCH_REPORT',parser:'gallup'
  }),
  nesdc:Object.freeze({
    sourceId:'nesdc',institution:'중앙선거여론조사심의위원회',
    url:'https://www.nesdc.go.kr/portal/bbs/B0000005/list.do?menuNo=200467',
    sourceType:'REGISTERED_POLL',parser:'nesdc'
  })
});

function cleanText(value=''){return String(value||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();}
function decodeEntities(value=''){
  const map={'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&middot;':'·'};
  return String(value||'').replace(/&(nbsp|amp|lt|gt|quot|#39|middot);/gi,m=>map[m.toLowerCase()]||' ').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)||32));
}
function stripHtml(value=''){return cleanText(decodeEntities(String(value||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ')));}
function absoluteUrl(base,href=''){try{return new URL(decodeEntities(href),base).toString();}catch{return '';}}
function isoDate(value=''){
  const m=String(value||'').match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);if(!m)return null;
  const y=m[1],mo=String(m[2]).padStart(2,'0'),d=String(m[3]).padStart(2,'0');
  const iso=`${y}-${mo}-${d}T00:00:00.000Z`;return Number.isFinite(Date.parse(iso))?iso:null;
}
function rowBlocks(html=''){const rows=String(html||'').match(/<tr\b[\s\S]*?<\/tr>/gi);return rows||[];}
function firstHref(row,pattern){
  const re=/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;let m;
  while((m=re.exec(String(row||'')))){if(!pattern||pattern.test(m[1]))return {href:decodeEntities(m[1]),label:stripHtml(m[2])};}
  return null;
}
function sourceTypeFor(title,base){
  if(/지지도|선호도|적합도|평가|여론조사|대선|지방선거|재보궐/.test(title))return base==='REGISTERED_POLL'?base:'POLL_OR_OPINION_REPORT';
  return base;
}
function parseGallup(html,def=SOURCE_DEFS.gallup){
  const out=[];
  for(const row of rowBlocks(html).slice(0,80)){
    const link=firstHref(row,/reportContent\.asp\?[^"']*seqNo=\d+/i);if(!link||!link.label)continue;
    const title=cleanText(link.label);if(!/오피니언|정치|선거|대통령|정당|국회|의원|후보|대표|지지도|선호도|평가/.test(title))continue;
    out.push({institution:def.institution,sourceType:sourceTypeFor(title,def.sourceType),title,url:absoluteUrl(def.url,link.href),observedAt:isoDate(stripHtml(row))});
  }
  return out;
}
function parseNesdc(html,def=SOURCE_DEFS.nesdc){
  const out=[];
  for(const row of rowBlocks(html).slice(0,120)){
    const link=firstHref(row,/B0000005\/view\.do|view\.do\?[^"']*nttId=/i);if(!link||!link.label)continue;
    const title=cleanText(link.label);if(!title)continue;
    const rowText=stripHtml(row);
    out.push({institution:def.institution,sourceType:def.sourceType,title,url:absoluteUrl(def.url,link.href),observedAt:isoDate(rowText),note:rowText.slice(0,480)});
  }
  return out;
}
function normalizeForMatch(value=''){return String(value||'').normalize('NFKC').replace(/[\s·ㆍ,.;:()\[\]{}<>"'“”‘’/\\|_-]+/g,'').toLowerCase();}
function rosterContext(people=[]){
  const rows=(Array.isArray(people)?people:[]).filter(p=>p&&p.id&&p.name).map(p=>({id:String(p.id),name:cleanText(p.name),party:cleanText(p.party),jurisdiction:cleanText(p.jurisdiction),type:cleanText(p.type)}));
  const parties=[...new Set(rows.map(x=>x.party).filter(x=>x.length>=2))];
  return {rows,parties};
}
function matchRecord(record,ctx){
  const hay=normalizeForMatch([record.title,record.note].filter(Boolean).join(' '));
  const personIds=[];
  for(const person of ctx.rows){const needle=normalizeForMatch(person.name);if(needle.length>=2&&hay.includes(needle))personIds.push(person.id);}
  const partyTags=ctx.parties.filter(p=>hay.includes(normalizeForMatch(p)));
  return {...record,personIds:[...new Set(personIds)],partyTags:[...new Set(partyTags)]};
}
function fingerprint(record={}){return crypto.createHash('sha256').update([record.institution,record.sourceType,record.url,record.title,record.observedAt].map(x=>String(x||'')).join('|')).digest('hex').slice(0,32);}
function contentCharset(headers,bytes){
  const contentType=String(headers?.get?.('content-type')||'');let m=contentType.match(/charset\s*=\s*([^;\s]+)/i);if(m)return m[1].replace(/["']/g,'').toLowerCase();
  const head=Buffer.from(bytes).subarray(0,4096).toString('latin1');m=head.match(/charset\s*=\s*["']?([A-Za-z0-9_-]+)/i);return m?m[1].toLowerCase():'utf-8';
}
function decodeBody(bytes,headers){
  const charset=contentCharset(headers,bytes);const label=/euc-?kr|ks_c_5601|cp949/i.test(charset)?'euc-kr':'utf-8';
  try{return new TextDecoder(label).decode(bytes);}catch{return Buffer.from(bytes).toString('utf8');}
}
async function fetchHtml(url,{fetchImpl=globalThis.fetch,timeoutMs=FETCH_TIMEOUT_MS}={}){
  if(typeof fetchImpl!=='function')throw new Error('FETCH_UNAVAILABLE');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{method:'GET',redirect:'follow',headers:{Accept:'text/html,application/xhtml+xml;q=0.9,*/*;q=0.2','User-Agent':'Mozilla/5.0 (compatible; JCS-Intelligence/1.0)'},signal:controller.signal});
    if(!response?.ok)throw new Error(`HTTP_${response?.status||0}`);
    const declared=Number(response.headers?.get?.('content-length')||0);if(declared>MAX_BODY_BYTES)throw new Error('BODY_TOO_LARGE');
    const buffer=Buffer.from(await response.arrayBuffer());if(buffer.length>MAX_BODY_BYTES)throw new Error('BODY_TOO_LARGE');
    return decodeBody(buffer,response.headers);
  }finally{clearTimeout(timer);}
}
function parserFor(def){return def.parser==='gallup'?parseGallup:parseNesdc;}
async function collectExternalEvidence({people=[],sourceIds=Object.keys(SOURCE_DEFS),fetchImpl=globalThis.fetch,now=()=>new Date()}={}){
  const collectedAt=now().toISOString(),ctx=rosterContext(people),records=[],sources=[],warnings=[];
  for(const sourceId of sourceIds){
    const def=SOURCE_DEFS[sourceId];if(!def){warnings.push({sourceId,error:'SOURCE_NOT_ALLOWLISTED'});continue;}
    const started=Date.now();
    try{
      const html=await fetchHtml(def.url,{fetchImpl});
      const parsed=parserFor(def)(html,def).map(row=>{
        const matched=matchRecord({...row,observedAt:row.observedAt||collectedAt,collectedAt},ctx);
        return {...matched,fingerprint:fingerprint(matched)};
      });
      const dedup=[...new Map(parsed.filter(x=>x.url&&x.title).map(x=>[x.fingerprint,x])).values()];records.push(...dedup);
      sources.push({sourceId,institution:def.institution,url:def.url,ok:true,records:dedup.length,elapsedMs:Date.now()-started});
      if(!dedup.length)warnings.push({sourceId,error:'NO_RECORDS_PARSED'});
    }catch(error){sources.push({sourceId,institution:def.institution,url:def.url,ok:false,records:0,elapsedMs:Date.now()-started,error:String(error?.message||error)});warnings.push({sourceId,error:String(error?.message||error)});}
  }
  const unique=[...new Map(records.map(x=>[x.fingerprint,x])).values()];const matched=new Set(unique.flatMap(x=>x.personIds||[]));
  return {version:VERSION,collectedAt,records:unique,sources,warnings,matchedPeople:matched.size,recordCount:unique.length};
}

module.exports={VERSION,SOURCE_DEFS,collectExternalEvidence,_internals:{cleanText,stripHtml,isoDate,parseGallup,parseNesdc,matchRecord,fingerprint,decodeBody,fetchHtml}};
