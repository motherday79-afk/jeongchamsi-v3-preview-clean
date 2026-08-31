const {requireAdmin}=require('../../../../lib/v3/access');
const {
  historyOverviewV2,
  historyHomeSummaryV2,
  captureCurrentSnapshot,
  backfillLegacyPageV2,
  appendPoliticalEventV2,
  readPersonHistoryV2,
  readPoliticalIntelligenceV2
}=require('../../lib/history-v2-store');
const {readPoliticalIntelligenceCohortSeriesV2}=require('../../lib/political-intelligence-v2-store');

module.exports=async function historyAdmin(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  try{
    const admin=await requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
    if(req.method==='GET'){
      const summary=String(req.query?.summary||'').trim();
      if(summary==='home')return res.status(200).json({ok:true,...await historyHomeSummaryV2()});
      const personId=String(req.query?.personId||'').trim(),view=String(req.query?.view||'').trim();
      const range=String(req.query?.range||req.query?.days||'30');
      if(view==='compare'){
        const raw=String(req.query?.personIds||'').split(',').map(x=>x.trim()).filter(Boolean);
        const personIds=[...new Set(raw)];
        if(personIds.length<2)return res.status(400).json({ok:false,error:'COMPARE_MIN_2_REQUIRED'});
        if(personIds.length>5)return res.status(400).json({ok:false,error:'COMPARE_MAX_5_EXCEEDED'});
        const days=range==='all'?'all':Number(range)||30;
        const people=await Promise.all(personIds.map(async id=>{
          const person=await readPersonHistoryV2(id,{days,limit:320});
          const politicalIntelligence=await readPoliticalIntelligenceV2(id,person);
          const compactPerson={...person,observations:(person.observations||[]).slice(-12),daily:(person.daily||[]).slice(-30),events:(person.events||[]).slice(-20)};
          return {personId:id,person:compactPerson,politicalIntelligence};
        }));
        return res.status(200).json({ok:true,view:'compare',range,personIds,people});
      }
      if(view==='detail'&&personId){
        const person=await readPersonHistoryV2(personId,{days:range==='all'?'all':Number(range)||30,limit:320});
        const [politicalIntelligence,cohortSeries]=await Promise.all([
          readPoliticalIntelligenceV2(personId,person),
          readPoliticalIntelligenceCohortSeriesV2(personId,{limit:8}).catch(()=>[])
        ]);
        const compactPerson={...person,observations:(person.observations||[]).slice(-12),daily:[],events:[]};
        return res.status(200).json({ok:true,personId,person:compactPerson,politicalIntelligence,cohortSeries});
      }
      const overview=await historyOverviewV2();
      const person=personId?await readPersonHistoryV2(personId,{days:range==='all'?'all':Number(range)||30,limit:730}):null;
      const politicalIntelligence=personId?await readPoliticalIntelligenceV2(personId,person):null;
      return res.status(200).json({ok:true,...overview,personId:personId||null,person,politicalIntelligence});
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
