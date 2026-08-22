const {derivePublicSignals,derivePersonView}=require('./now-public-signals');

function num(v){return Math.max(0,Number(v)||0);}
function compactPreviewRow(row={}){
  return {
    rank:num(row.rank),score:num(row.score),state:row.state||'',searchScore:num(row.searchScore),newsScore:num(row.newsScore),
    person:row.person||null,
    search:{
      state:row.search?.state||'ERROR',monthlyPcQcCnt:num(row.search?.monthlyPcQcCnt),monthlyMobileQcCnt:num(row.search?.monthlyMobileQcCnt),monthlyTotalQcCnt:num(row.search?.monthlyTotalQcCnt),ambiguousName:Boolean(row.search?.ambiguousName)
    },
    news:{
      state:row.news?.state||'ERROR',count6:num(row.news?.count6),count24:num(row.news?.count24),count7d:num(row.news?.count7d),sources24:num(row.news?.sources24)
    },
    providers:Array.isArray(row.providers)?row.providers:[]
  };
}
function compactHistory(history={}){
  return {items:(Array.isArray(history?.items)?history.items:[]).map(item=>({
    draftId:item?.draftId||'',publishedAt:item?.publishedAt||null,weights:item?.weights||{},top30:(Array.isArray(item?.top30)?item.top30:[]).slice(0,30).map(compactPreviewRow)
  })).filter(x=>x.draftId).slice(0,30)};
}
function buildHomePublicSnapshot(current,history,nowMs=Date.now()){
  const ranked=Array.isArray(current?.ranked)?current.ranked:[];
  if(!ranked.length)return {draftId:null,publishedAt:null,weights:{},total:0,top10:[],signals:{source:'none',publishedAt:null,keywords:[],rising:[]}};
  return {
    draftId:current.draftId||null,publishedAt:current.publishedAt||null,weights:current.weights||{},total:ranked.length,
    top10:ranked.slice(0,10).map(compactPreviewRow),signals:derivePublicSignals(current,history,nowMs)
  };
}

function buildPersonPublicEntries(current,history,nowMs=Date.now()){
  const ranked=Array.isArray(current?.ranked)?current.ranked:[];
  return ranked.map(row=>{
    const id=String(row?.person?.id||'').trim();
    return id?[`nowDataPersonPublic:${id}`,derivePersonView(current,history,id,nowMs)]:null;
  }).filter(Boolean);
}

function buildAdminPublicSnapshot(current){
  const ranked=Array.isArray(current?.ranked)?current.ranked:[];
  return current?{draftId:current.draftId||null,publishedAt:current.publishedAt||null,weights:current.weights||{},total:ranked.length,top30:ranked.slice(0,30).map(compactPreviewRow)}:null;
}
module.exports={compactPreviewRow,compactHistory,buildHomePublicSnapshot,buildAdminPublicSnapshot,buildPersonPublicEntries};
