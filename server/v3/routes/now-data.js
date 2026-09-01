const {getJSON,setJSON}=require('../../../lib/v3/redis');
const {derivePersonView}=require('../lib/now-public-signals');
const {buildHomePublicSnapshot,buildCategoryPublicSnapshots,mergePersonTrend}=require('../lib/now-public-snapshot');
const {buildBootstrapCurrent}=require('../lib/now-bootstrap');

const CATEGORY_TYPES=new Set(['assembly','metropolitan','basic']);
const categoryDomain=type=>`nowDataPublicCategory:${type}`;

function errorCode(error){return String(error?.code||error?.message||'STORAGE_READ_FAILED');}
async function safeGet(domain,fallback,state){
  try{return await getJSON(domain);}
  catch(error){
    state.degraded=true;
    if(!state.error)state.error=errorCode(error);
    return typeof fallback==='function'?fallback():fallback;
  }
}
async function bestEffortSet(domain,value,state){
  try{await setJSON(domain,value);return true;}
  catch(error){
    state.degraded=true;
    if(!state.error)state.error=errorCode(error);
    return false;
  }
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
    const storage={degraded:false,error:''};

    let [publicHome,person,current,history]=await Promise.all([
      safeGet('nowDataPublicHome',null,storage),
      id?safeGet(personDomain,null,storage):Promise.resolve(null),
      safeGet('nowDataCurrent',null,storage),
      safeGet('nowDataHistory',{items:[]},storage)
    ]);
    history=history||{items:[]};
    if(!Array.isArray(current?.ranked)||!current.ranked.length)current=null;
    const usingBootstrap=!current;
    if(!current)current=buildBootstrapCurrent();

    if(!publicHome||!Array.isArray(publicHome?.top30)||!publicHome.top30.length){
      publicHome=buildHomePublicSnapshot(current,history);
      if(!usingBootstrap)await bestEffortSet('nowDataPublicHome',publicHome,storage);
    }

    if(id&&(!person||!person?.analysis||!person?.categoryRank||!person?.trend)){
      const nextPerson=derivePersonView(current,history,id);
      person=mergePersonTrend(nextPerson,person||null,60);
      if(!usingBootstrap&&person?.row)await bestEffortSet(personDomain,person,storage);
    }

    const meta={
      draftId:publicHome?.draftId||current?.draftId||null,
      publishedAt:publicHome?.publishedAt||current?.publishedAt||null,
      weights:publicHome?.weights||current?.weights||{},
      modeled:Boolean(usingBootstrap||publicHome?.modeled),
      storageReadDegraded:storage.degraded,
      storageReadError:storage.error||''
    };
    const signals=publicHome?.signals||{source:usingBootstrap?'jcs-modeled-bootstrap':'none',publishedAt:meta.publishedAt,keywords:[],rising:[]};

    if(wantsCategory){
      let stored=!usingBootstrap?await safeGet(categoryDomain(type),null,storage):null;
      const currentDraft=String(current?.draftId||'');
      if(!stored||String(stored.draftId||'')!==currentDraft){
        const groups=buildCategoryPublicSnapshots(current);
        stored=groups[type]||null;
        if(!usingBootstrap){
          for(const [key,value] of Object.entries(groups))await bestEffortSet(categoryDomain(key),value,storage);
        }
      }
      const rows=Array.isArray(stored?.rows)?stored.rows:[];
      const total=Number(stored?.total)||rows.length;
      const slice=rows.slice(offset,offset+limit);
      return res.status(200).json({ok:true,current:{...meta,storageReadDegraded:storage.degraded,storageReadError:storage.error||''},signals,category:{type,total,offset,limit,hasMore:offset+slice.length<total,rows:slice,modeled:Boolean(usingBootstrap)}});
    }

    return res.status(200).json({ok:true,current:{...meta,storageReadDegraded:storage.degraded,storageReadError:storage.error||''},signals,person:id?(person||null):null});
  }catch(error){
    console.error('[NOW_DATA_PUBLIC]',error);
    return res.status(500).json({ok:false,error:error?.code||'NOW_DATA_PUBLIC_FAILED'});
  }
};
