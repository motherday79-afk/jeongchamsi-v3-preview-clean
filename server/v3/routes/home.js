const { mgetJSON, getJSON } = require('../../../lib/v3/redis');
const { defaultDomain } = require('../../../lib/v3/schema');
const { listUsers } = require('../../../lib/v3/users');
const { getRecentBadgeCelebrations } = require('../../../lib/v3/badge-celebrations');
const { buildHomePublicSnapshot } = require('../lib/now-public-snapshot');
const { buildBootstrapCurrent } = require('../lib/now-bootstrap');

const DOMAINS=['columns','community','news','polls','academy','generation','nationalEvaluation','itsme','keywords','trending','president','brand'];

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});}
  try{
    const [values,users,badgeCelebrations]=await Promise.all([
      mgetJSON([...DOMAINS,'nowDataPublicHome']),
      listUsers(),
      getRecentBadgeCelebrations(8)
    ]);
    const data=Object.fromEntries(DOMAINS.map((d,i)=>[d,values[i]||defaultDomain(d)]));
    let publicHome=values[DOMAINS.length]||null;
    const hasTop30=Array.isArray(publicHome?.top30)&&publicHome.top30.length>0;
    if(!hasTop30){
      const [current,history]=await Promise.all([getJSON('nowDataCurrent'),getJSON('nowDataHistory')]);
      const source=Array.isArray(current?.ranked)&&current.ranked.length?current:buildBootstrapCurrent();
      publicHome=buildHomePublicSnapshot(source,history||{items:[]});
    }
    const top30=Array.isArray(publicHome?.top30)?publicHome.top30:(Array.isArray(publicHome?.top10)?publicHome.top10:[]);
    data.memberCount=users.length;
    data.nowRank={draftId:publicHome?.draftId||null,publishedAt:publicHome?.publishedAt||null,weights:publicHome?.weights||{},total:Number(publicHome?.total)||top30.length,ranked:top30,modeled:Boolean(publicHome?.modeled)};
    data.nowSignals=publicHome?.signals||{source:'none',publishedAt:null,keywords:[],rising:[]};
    data.badgeCelebrations=badgeCelebrations;
    return res.status(200).json({ok:true,data});
  }catch(error){
    console.error('[HOME_READ]',error);
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'HOME_READ_FAILED'});
  }
};
