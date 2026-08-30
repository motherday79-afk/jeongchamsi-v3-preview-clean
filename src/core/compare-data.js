import { getNowPerson } from "./repository.js";
import { getAdminHistoryCompare } from "./history-repository.js?v=admin-multi-compare-inforeghini";

const TTL = 45_000;
const nowCache = new Map();
const adminCache = new Map();

function cached(map,key,loader){
  const hit=map.get(key),now=Date.now();
  if(hit && now-hit.at<TTL)return hit.promise;
  const promise=Promise.resolve().then(loader).catch(error=>{map.delete(key);throw error;});
  map.set(key,{at:now,promise});
  return promise;
}

export function getFastNowPerson(id){
  const key=String(id||"").trim();
  if(!key)return Promise.resolve(null);
  return cached(nowCache,key,()=>getNowPerson(key));
}

export function prefetchNowPerson(id){
  return getFastNowPerson(id).catch(()=>null);
}

export function getFastAdminCompare(ids=[],range="30"){
  const personIds=[...new Set(ids.map(x=>String(x||"").trim()).filter(Boolean))].slice(0,5);
  if(personIds.length<2)return Promise.resolve({ok:false,error:"COMPARE_MIN_2_REQUIRED",people:[]});
  const key=`${range}:${personIds.join("|")}`;
  return cached(adminCache,key,()=>getAdminHistoryCompare(personIds,range));
}

export function prefetchAdminCompare(ids=[],range="30"){
  return getFastAdminCompare(ids,range).catch(()=>null);
}

export function clearCompareDataCache(){
  nowCache.clear();adminCache.clear();
}
