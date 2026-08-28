const {requireAdmin}=require('../../../../lib/v3/access');
const {
  historyOverviewV2,
  captureCurrentSnapshot,
  backfillLegacyPageV2,
  appendPoliticalEventV2,
  readPersonHistoryV2
}=require('../../lib/history-v2-store');

module.exports=async function historyAdmin(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  try{
    const admin=await requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
    if(req.method==='GET'){
      const overview=await historyOverviewV2();
      const personId=String(req.query?.personId||'').trim();
      const range=String(req.query?.range||req.query?.days||'30');
      const person=personId?await readPersonHistoryV2(personId,{days:range==='all'?'all':Number(range)||30,limit:730}):null;
      return res.status(200).json({ok:true,...overview,personId:personId||null,person});
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    const action=String(req.body?.action||'');
    if(action==='capture-current'){
      const result=await captureCurrentSnapshot();
      return res.status(result.ok?200:409).json(result);
    }
    if(action==='backfill')return res.status(200).json(await backfillLegacyPageV2({cursor:Number(req.body?.cursor)||0,pageSize:25}));
    if(action==='event-add'){
      const result=await appendPoliticalEventV2(req.body?.event||{});
      return res.status(result.ok?200:409).json(result);
    }
    return res.status(400).json({ok:false,error:'UNKNOWN_HISTORY_ACTION'});
  }catch(error){
    console.error('[HISTORY_ADMIN_V2]',error);
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'HISTORY_ADMIN_V2_FAILED'});
  }
};
