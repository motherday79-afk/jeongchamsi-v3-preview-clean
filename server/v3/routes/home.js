const { mgetJSON, getJSON } = require('../../../lib/v3/redis');
const { defaultDomain } = require('../../../lib/v3/schema');
const { listUsers } = require('../../../lib/v3/users');
const { getRecentBadgeCelebrations } = require('../../../lib/v3/badge-celebrations');
const { buildHomePublicSnapshot } = require('../lib/now-public-snapshot');
const { buildBootstrapCurrent } = require('../lib/now-bootstrap');

const DOMAINS=['columns','community','news','polls','academy','generation','nationalEvaluation','itsme','keywords','trending','president','brand'];

function errorCode(error){return String(error?.code||error?.message||'STORAGE_READ_FAILED');}
async function safeRead(loader,fallback,state){
  try{return await loader();}
  catch(error){
    state.degraded=true;
    if(!state.error)state.error=errorCode(error);
    return typeof fallback==='function'?fallback():fallback;
  }
}

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});}
  try{
    const storage={degraded:false,error:''};
    const domainFallback=()=>Array.from({length:DOMAINS.length+1},()=>null);
    const [values,users,badgeCelebrations]=await Promise.all([
      safeRead(()=>mgetJSON([...DOMAINS,'nowDataPublicHome']),domainFallback,storage),
      safeRead(()=>listUsers(),[],storage),
      safeRead(()=>getRecentBadgeCelebrations(8),[],storage)
    ]);
    const safeValues=Array.isArray(values)?values:domainFallback();
    const data=Object.fromEntries(DOMAINS.map((d,i)=>[d,safeValues[i]||defaultDomain(d)]));
    let publicHome=safeValues[DOMAINS.length]||null;
    const hasTop30=Array.isArray(publicHome?.top30)&&publicHome.top30.length>0;
    if(!hasTop30){
      const [current,history]=await Promise.all([
        safeRead(()=>getJSON('nowDataCurrent'),null,storage),
        safeRead(()=>getJSON('nowDataHistory'),{items:[]},storage)
      ]);
      const source=Array.isArray(current?.ranked)&&current.ranked.length?current:buildBootstrapCurrent();
      publicHome=buildHomePublicSnapshot(source,history||{items:[]});
    }
    const top30=Array.isArray(publicHome?.top30)?publicHome.top30:(Array.isArray(publicHome?.top10)?publicHome.top10:[]);
    data.memberCount=Array.isArray(users)?users.length:0;
    data.nowRank={draftId:publicHome?.draftId||null,publishedAt:publicHome?.publishedAt||null,weights:publicHome?.weights||{},total:Number(publicHome?.total)||top30.length,ranked:top30,modeled:Boolean(publicHome?.modeled)};
    data.nowSignals=publicHome?.signals||{source:storage.degraded?'jcs-modeled-bootstrap':'none',publishedAt:publicHome?.publishedAt||null,keywords:[],rising:[]};
    data.badgeCelebrations=Array.isArray(badgeCelebrations)?badgeCelebrations:[];
    data.runtime={...(data.runtime||{}),storageReadDegraded:storage.degraded,storageReadError:storage.error||''};
    return res.status(200).json({ok:true,data});
  }catch(error){
    console.error('[HOME_READ]',error);
    return res.status(500).json({ok:false,error:error?.code||'HOME_READ_FAILED'});
  }
};
