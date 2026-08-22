const {getJSON}=require('../../../lib/v3/redis');
const {derivePublicSignals,derivePersonView}=require('../lib/now-public-signals');

module.exports=async function nowDataPublic(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const [current,history]=await Promise.all([getJSON('nowDataCurrent'),getJSON('nowDataHistory')]);
    const signals=derivePublicSignals(current,history);
    const id=String(req.query?.id||'').trim();
    const person=id?derivePersonView(current,history,id):null;
    return res.status(200).json({ok:true,current:current?{draftId:current.draftId,publishedAt:current.publishedAt,weights:current.weights||{}}:null,signals,person});
  }catch(error){
    console.error('[NOW_DATA_PUBLIC]',error);
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'NOW_DATA_PUBLIC_FAILED'});
  }
};
