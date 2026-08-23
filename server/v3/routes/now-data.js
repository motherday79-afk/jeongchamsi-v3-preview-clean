const {getJSON,setJSON}=require('../../../lib/v3/redis');
const {derivePersonView}=require('../lib/now-public-signals');
const {buildHomePublicSnapshot,buildCategoryPublicSnapshots,mergePersonTrend}=require('../lib/now-public-snapshot');

const CATEGORY_TYPES=new Set(['assembly','metropolitan','basic']);
const categoryDomain=type=>`nowDataPublicCategory:${type}`;

async function ensureCategory(type,publicHome){
  let category=await getJSON(categoryDomain(type));
  const currentDraft=String(publicHome?.draftId||'');
  if(category&&String(category.draftId||'')===currentDraft)return category;
  const current=await getJSON('nowDataCurrent');
  if(!current?.ranked?.length)return category||null;
  const groups=buildCategoryPublicSnapshots(current);
  await Promise.all(Object.entries(groups).map(([key,value])=>setJSON(categoryDomain(key),value)));
  return groups[type]||null;
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
    const requestedLimit=Math.max(1,Number(req.query?.limit)||30);
    const limit=Math.min(300,requestedLimit);
    const personDomain=id?`nowDataPersonPublic:${id}`:'';
    let [publicHome,person]=await Promise.all([
      getJSON('nowDataPublicHome'),
      id?getJSON(personDomain):Promise.resolve(null)
    ]);

    // One-time compatibility migration from the pre-0.36.46 full snapshot.
    if(!publicHome||(id&&(!person||!person?.analysis||!person?.categoryRank||!person?.trend))){
      const [current,history]=await Promise.all([getJSON('nowDataCurrent'),getJSON('nowDataHistory')]);
      if(current?.ranked?.length){
        if(!publicHome){publicHome=buildHomePublicSnapshot(current,history);await setJSON('nowDataPublicHome',publicHome);}
        if(id&&(!person||!person?.analysis||!person?.categoryRank||!person?.trend)){const nextPerson=derivePersonView(current,history,id);person=mergePersonTrend(nextPerson,person||null,60);await setJSON(personDomain,person);}
      }
    }

    const current=publicHome?.draftId?{draftId:publicHome.draftId,publishedAt:publicHome.publishedAt,weights:publicHome.weights||{}}:null;
    const signals=publicHome?.signals||{source:'none',publishedAt:null,keywords:[],rising:[]};

    if(wantsCategory){
      const stored=await ensureCategory(type,publicHome);
      const rows=Array.isArray(stored?.rows)?stored.rows:[];
      const total=Number(stored?.total)||rows.length;
      const slice=rows.slice(offset,offset+limit);
      return res.status(200).json({
        ok:true,current,signals,
        category:{type,total,offset,limit,hasMore:offset+slice.length<total,rows:slice}
      });
    }

    return res.status(200).json({ok:true,current,signals,person:id?(person||null):null});
  }catch(error){
    console.error('[NOW_DATA_PUBLIC]',error);
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'NOW_DATA_PUBLIC_FAILED'});
  }
};
