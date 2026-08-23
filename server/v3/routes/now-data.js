const {getJSON,setJSON}=require('../../../lib/v3/redis');
const {derivePersonView}=require('../lib/now-public-signals');
const {buildHomePublicSnapshot}=require('../lib/now-public-snapshot');

module.exports=async function nowDataPublic(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const id=String(req.query?.id||'').trim();
    const personDomain=id?`nowDataPersonPublic:${id}`:'';
    let [publicHome,person]=await Promise.all([
      getJSON('nowDataPublicHome'),
      id?getJSON(personDomain):Promise.resolve(null)
    ]);

    // One-time compatibility migration from the pre-0.36.46 full snapshot.
    if(!publicHome||(id&&(!person||!person?.analysis))){
      const [current,history]=await Promise.all([getJSON('nowDataCurrent'),getJSON('nowDataHistory')]);
      if(current?.ranked?.length){
        if(!publicHome){publicHome=buildHomePublicSnapshot(current,history);await setJSON('nowDataPublicHome',publicHome);}
        if(id&&(!person||!person?.analysis)){person=derivePersonView(current,history,id);await setJSON(personDomain,person);}
      }
    }

    const current=publicHome?.draftId?{draftId:publicHome.draftId,publishedAt:publicHome.publishedAt,weights:publicHome.weights||{}}:null;
    const signals=publicHome?.signals||{source:'none',publishedAt:null,keywords:[],rising:[]};
    return res.status(200).json({ok:true,current,signals,person:id?(person||null):null});
  }catch(error){
    console.error('[NOW_DATA_PUBLIC]',error);
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'NOW_DATA_PUBLIC_FAILED'});
  }
};
