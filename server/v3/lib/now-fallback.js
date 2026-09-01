'use strict';
const crypto=require('node:crypto');
function clamp(v,min,max){const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):min;}
function hashInt(value=''){const hex=crypto.createHash('sha1').update(String(value)).digest('hex').slice(0,8);return parseInt(hex,16)>>>0;}
function priorRow(previousView={}){return previousView?.row&&typeof previousView.row==='object'?previousView.row:{};}
function modeledSearch(person={},previousView=null){
  const prev=priorRow(previousView).search||{};const prevTotal=Math.max(0,Number(prev.monthlyTotalQcCnt)||0);const h=hashInt(`${person.id}|search`);
  const typeBase=person.type==='assembly'?4200:person.type==='metropolitan'?6800:2100;
  const total=Math.max(5,Math.round(prevTotal>0?prevTotal*(0.94+(h%13)/100):typeBase*(0.55+(h%91)/100)));
  const mobileShare=clamp(0.48+((h>>>8)%27)/100,0.45,0.75),mobile=Math.round(total*mobileShare),pc=Math.max(0,total-mobile);
  return {provider:'jcs-modeled-search-fallback',configured:false,state:'MODELED',evidenceState:prevTotal>0?'HISTORY_REUSE':'MODEL_BASELINE',detail:'NAVER Search Ads unavailable; JCS modeled fallback',monthlyPcQcCnt:pc,monthlyMobileQcCnt:mobile,monthlyTotalQcCnt:total,score:0,ambiguousName:Boolean(person.ambiguousName),found:false,modeled:true,fetchedAt:new Date().toISOString()};
}
function modeledNews(person={},previousView=null,nowMs=Date.now()){
  const prev=priorRow(previousView).news||{},h=hashInt(`${person.id}|news`);
  const p7=Math.max(0,Number(prev.count7d)||0),p24=Math.max(0,Number(prev.count24)||0),p6=Math.max(0,Number(prev.count6)||0);
  const count7d=p7>0?Math.max(1,Math.round(p7*(0.9+(h%21)/100))):1+(h%17);
  const count24=p24>0?Math.min(count7d,Math.max(0,Math.round(p24*(0.9+((h>>>5)%21)/100)))):Math.min(count7d,(h>>>7)%6);
  const count6=p6>0?Math.min(count24,Math.max(0,Math.round(p6*(0.9+((h>>>10)%21)/100)))):Math.min(count24,(h>>>11)%3);
  const sources24=Math.min(Math.max(0,count24),Math.max(1,Number(prev.sources24)||1+((h>>>13)%4)));
  return {provider:'jcs-modeled-news-fallback',configured:false,state:'MODELED',evidenceState:p7>0?'HISTORY_REUSE':'MODEL_BASELINE',detail:'Primary news provider unavailable; JCS modeled fallback',count6,count24,count7d,sources6:Math.min(count6,sources24),sources24,latest:prev.latest||null,headlines:Array.isArray(prev.headlines)?prev.headlines.slice(0,12):[],modeled:true,fetchedAt:new Date(nowMs).toISOString()};
}
function needsFallback(row){return !row||['ERROR','MISSING'].includes(String(row.state||''));}
function needsNewsFallback(row){return !row||['ERROR','MISSING','ZERO'].includes(String(row.state||''));}
function applyFallbacks(person,search,news,previousView=null,nowMs=Date.now()){
  return {search:needsFallback(search)?modeledSearch(person,previousView):search,news:needsNewsFallback(news)?modeledNews(person,previousView,nowMs):news};
}
module.exports={hashInt,modeledSearch,modeledNews,needsFallback,needsNewsFallback,applyFallbacks};
