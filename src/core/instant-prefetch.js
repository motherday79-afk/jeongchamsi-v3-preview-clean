import { getUserSession } from "./user.js";
import { prefetchNowPerson, prefetchAdminCompare } from "./compare-data.js?v=admin-multi-compare-inforeghini-admin-premium-intelligence-v1";

const warmedModules=new Map();
function warmModule(key,loader){
  if(!warmedModules.has(key))warmedModules.set(key,Promise.resolve().then(loader).catch(()=>null));
  return warmedModules.get(key);
}
function paramsFromPath(path){
  try{return new URL(path,window.location.origin);}catch{return null;}
}

export async function prefetchRoute(path=""){
  const url=paramsFromPath(path);if(!url)return null;
  const bits=url.pathname.split("/").filter(Boolean);
  if(bits[0]==="person"&&bits[1]){
    warmModule("people",()=>import("../views/people.js?v=admin-multi-compare-inforeghini-admin-premium-intelligence-v1"));
    return prefetchNowPerson(decodeURIComponent(bits[1]));
  }
  if(bits[0]==="compare"){
    warmModule("features",()=>import("../views/features.js?v=admin-multi-compare-inforeghini-admin-premium-intelligence-v1"));
    const ids=[...url.searchParams.getAll("p"),url.searchParams.get("a"),url.searchParams.get("b")].filter(Boolean);
    const unique=[...new Set(ids)].slice(0,5);
    unique.forEach(prefetchNowPerson);
    const session=getUserSession();
    if(session?.authenticated&&session.user?.role==="admin"&&unique.length>=2)return prefetchAdminCompare(unique,"30");
    return Promise.all(unique.map(prefetchNowPerson));
  }
  if(!bits.length)return warmModule("home",()=>import("../views/home.js?v=admin-multi-compare-inforeghini-admin-premium-intelligence-v1"));
  return warmModule("features",()=>import("../views/features.js?v=admin-multi-compare-inforeghini-admin-premium-intelligence-v1"));
}

export function prefetchCompareSelection(ids=[]){
  const unique=[...new Set(ids.map(x=>String(x||"").trim()).filter(Boolean))].slice(0,5);
  return Promise.all(unique.map(prefetchNowPerson));
}
