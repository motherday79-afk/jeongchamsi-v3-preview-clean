const {requireAdmin}=require('../../../../lib/v3/access');
const {historyOverview,backfillLegacyPage,appendPoliticalEvent,readPersonHistory}=require('../../lib/history-store');

module.exports=async function historyAdmin(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  try{
    const admin=await requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
    if(req.method==='GET'){
      const overview=await historyOverview(),personId=String(req.query?.personId||'');
      const person=personId?await readPersonHistory(personId,Number(req.query?.limit)||90):null;
      return res.status(200).json({ok:true,...overview,person});
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    const action=String(req.body?.action||'');
    if(action==='backfill')return res.status(200).json(await backfillLegacyPage({cursor:Number(req.body?.cursor)||0,pageSize:25}));
    if(action==='event-add'){
      const result=await appendPoliticalEvent(req.body?.event||{});return res.status(result.ok?200:409).json(result);
    }
    return res.status(400).json({ok:false,error:'UNKNOWN_HISTORY_ACTION'});
  }catch(error){console.error('[HISTORY_ADMIN]',error);return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'HISTORY_ADMIN_FAILED'});}
};
