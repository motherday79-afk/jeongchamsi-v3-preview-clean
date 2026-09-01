const crypto=require('crypto');
const BASE_URL='https://api.searchad.naver.com';
const PATH='/keywordstool';

function credentials(){
  const accessLicense=String(process.env.NAVER_AD_ACCESS_LICENSE||'').trim();
  const secretKey=String(process.env.NAVER_AD_SECRET_KEY||'').trim();
  const customerId=String(process.env.NAVER_AD_CUSTOMER_ID||'').trim();
  return {configured:Boolean(accessLicense&&secretKey&&customerId),accessLicense,secretKey,customerId};
}
function signature(timestamp,method,path,secretKey){return crypto.createHmac('sha256',secretKey).update(`${timestamp}.${method}.${path}`).digest('base64');}
function numericSearchCount(v){
  if(typeof v==='number'&&Number.isFinite(v))return v;
  const s=String(v??'').trim().replace(/,/g,'');if(!s)return 0;if(/^<\s*10$/i.test(s))return 5;
  const n=Number(s.replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:0;
}
function parseKeywordResponse(keyword,json){
  const rows=Array.isArray(json?.keywordList)?json.keywordList:[];
  const normalized=String(keyword||'').replace(/\s+/g,'').toLowerCase();
  const exact=rows.find(x=>String(x.relKeyword||'').replace(/\s+/g,'').toLowerCase()===normalized)||null;
  if(!exact)return {keyword,found:false,rows:rows.length,monthlyPcQcCnt:0,monthlyMobileQcCnt:0,monthlyTotalQcCnt:0,raw:null};
  const pc=numericSearchCount(exact.monthlyPcQcCnt),mobile=numericSearchCount(exact.monthlyMobileQcCnt);
  return {keyword,found:true,matchedKeyword:exact.relKeyword||keyword,monthlyPcQcCnt:pc,monthlyMobileQcCnt:mobile,monthlyTotalQcCnt:pc+mobile,rawMonthlyPcQcCnt:exact.monthlyPcQcCnt,rawMonthlyMobileQcCnt:exact.monthlyMobileQcCnt,rows:rows.length};
}
function searchScaleScore(total){const n=Math.max(0,Number(total)||0);return n?Math.round(Math.min(100,25*Math.log10(1+n/100))*10)/10:0;}
async function queryKeyword(keyword){
  const c=credentials();if(!c.configured){const e=new Error('NAVER Search Ads credentials not configured');e.code='NAVER_AD_NOT_CONFIGURED';throw e;}
  const timestamp=String(Date.now()),method='GET';
  const params=new URLSearchParams({hintKeywords:String(keyword||'').trim(),showDetail:'1'});
  const headers={'X-Timestamp':timestamp,'X-API-KEY':c.accessLicense,'X-Customer':c.customerId,'X-Signature':signature(timestamp,method,PATH,c.secretKey),'Content-Type':'application/json; charset=UTF-8'};
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),5000);
  let r;try{r=await fetch(`${BASE_URL}${PATH}?${params}`,{method,headers,signal:ctl.signal});}finally{clearTimeout(timer);}
  const text=await r.text();let json={};try{json=JSON.parse(text);}catch(_){json={};}
  if(!r.ok){const e=new Error(`NAVER Search Ads HTTP ${r.status}: ${json?.detail||text.slice(0,160)}`);e.status=r.status;throw e;}
  return {...parseKeywordResponse(keyword,json),fetchedAt:new Date().toISOString()};
}
async function collectSearchPulse(person){
  const c=credentials();
  if(!c.configured)return {provider:'naver-search-ads',configured:false,state:'MISSING',detail:'NAVER Search Ads credentials not configured',monthlyPcQcCnt:0,monthlyMobileQcCnt:0,monthlyTotalQcCnt:0};
  const local=person.entityType==='metropolitan'||person.entityType==='basic';
  const primary=local?`${person.name}${String(person.office||'').replace(/\s+/g,'')}`:person.name;
  let first=await queryKeyword(primary),row=first,usedFallback=false;
  if(local&&!first.found&&!person.ambiguousName){const fallback=await queryKeyword(person.name);if(fallback.found){row=fallback;usedFallback=true;}}
  const rawTotal=row.found?Math.max(0,Number(row.monthlyTotalQcCnt)||0):0;
  const ambiguous=Boolean(person.ambiguousName),confidenceFactor=usedFallback?0.72:1;
  return {
    provider:'naver-search-ads',configured:true,state:ambiguous?'AMBIGUOUS':(rawTotal>0?'OBSERVED':'ZERO'),
    queryTerm:usedFallback?person.name:primary,matchedKeyword:row.found?(row.matchedKeyword||(usedFallback?person.name:primary)):null,
    qualificationMode:usedFallback?'unique-name-fallback':(local?'office-qualified':'name-exact'),confidenceFactor,
    monthlyPcQcCnt:ambiguous?0:(row.found?Number(row.monthlyPcQcCnt)||0:0),monthlyMobileQcCnt:ambiguous?0:(row.found?Number(row.monthlyMobileQcCnt)||0:0),monthlyTotalQcCnt:ambiguous?0:rawTotal,
    sharedNameMonthlyTotalQcCnt:ambiguous?rawTotal:null,ambiguousName:ambiguous,found:Boolean(row.found),score:ambiguous?0:Math.round(searchScaleScore(rawTotal)*confidenceFactor*10)/10,fetchedAt:row.fetchedAt||new Date().toISOString()
  };
}
module.exports={credentials,numericSearchCount,parseKeywordResponse,searchScaleScore,queryKeyword,collectSearchPulse};
