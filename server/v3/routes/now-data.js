const {getJSON,setJSON}=require('../../../lib/v3/redis');
const {derivePersonView}=require('../lib/now-public-signals');
const {buildHomePublicSnapshot,buildCategoryPublicSnapshots,mergePersonTrend}=require('../lib/now-public-snapshot');
const {buildBootstrapCurrent}=require('../lib/now-bootstrap');

const CATEGORY_TYPES=new Set(['assembly','metropolitan','basic']);
const categoryDomain=type=>`nowDataPublicCategory:${type}`;

async function publishedCurrent(){
  const current=await getJSON('nowDataCurrent');
  return Array.isArray(current?.ranked)&&current.ranked.length?current:null;
}

module.exports=async function nowDataPublic(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store, max-age=0');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  try{
    const id=String(req.query?.id||'').trim();
    const type=String(req.query?.type||'').trim();
    const wantsCategory=CATEGORY_TYPES.has(type)&&!id;
    const offset=Math.max(0,Number(req.query?.offset)||0);
    const limit=Math.min(300,Math.max(1,Number(req.query?.limit)||30));
    const personDomain=id?`nowDataPersonPublic:${id}`:'';
    let [publicHome,person,current,history]=await Promise.all([
      getJSON('nowDataPublicHome'),
      id?getJSON(personDomain):Promise.resolve(null),
      publishedCurrent(),
      getJSON('nowDataHistory')
    ]);
    history=history||{items:[]};
    const usingBootstrap=!current;
    if(!current)current=buildBootstrapCurrent();

    if(!publicHome||!Array.isArray(publicHome?.top30)||!publicHome.top30.length){
      publicHome=buildHomePublicSnapshot(current,history);
      // Persist compatibility repair only when it is based on an actual published current snapshot.
      if(!usingBootstrap)await setJSON('nowDataPublicHome',publicHome);
    }

    if(id&&(!person||!person?.analysis||!person?.categoryRank||!person?.trend)){
      const nextPerson=derivePersonView(current,history,id);
      person=mergePersonTrend(nextPerson,person||null,60);
      if(!usingBootstrap&&person?.row)await setJSON(personDomain,person);
    }

    const meta={draftId:publicHome?.draftId||current?.draftId||null,publishedAt:publicHome?.publishedAt||current?.publishedAt||null,weights:publicHome?.weights||current?.weights||{},modeled:Boolean(usingBootstrap||publicHome?.modeled)};
    const signals=publicHome?.signals||{source:usingBootstrap?'jcs-modeled-bootstrap':'none',publishedAt:meta.publishedAt,keywords:[],rising:[]};

    if(wantsCategory){
      let stored=!usingBootstrap?await getJSON(categoryDomain(type)):null;
      const currentDraft=String(current?.draftId||'');
      if(!stored||String(stored.draftId||'')!==currentDraft){
        const groups=buildCategoryPublicSnapshots(current);
        stored=groups[type]||null;
        if(!usingBootstrap)await Promise.all(Object.entries(groups).map(([key,value])=>setJSON(categoryDomain(key),value)));
      }
      const rows=Array.isArray(stored?.rows)?stored.rows:[];
      const total=Number(stored?.total)||rows.length;
      const slice=rows.slice(offset,offset+limit);
      return res.status(200).json({ok:true,current:meta,signals,category:{type,total,offset,limit,hasMore:offset+slice.length<total,rows:slice,modeled:Boolean(usingBootstrap)}});
    }

    return res.status(200).json({ok:true,current:meta,signals,person:id?(person||null):null});
  }catch(error){
    console.error('[NOW_DATA_PUBLIC]',error);
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'NOW_DATA_PUBLIC_FAILED'});
  }
};
