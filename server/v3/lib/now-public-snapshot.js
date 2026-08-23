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

const TREND_SCORE_KEYS=['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread','audiencePosition','activityAcceleration','newsAcceleration','issueExplosiveness'];
function personTrendPoint(view={}){
  const scores=view?.analysis?.scores||{},audience=view?.analysis?.audience||{};
  const compactScores={};
  for(const key of TREND_SCORE_KEYS){
    const source=key==='audiencePosition'?audience.position:scores[key];
    compactScores[key]=Math.max(0,Math.min(100,Math.round((Number(source)||0)*10)/10));
  }
  return {
    draftId:view?.draftId||'',publishedAt:view?.publishedAt||null,
    globalRank:num(view?.row?.rank),categoryRank:num(view?.categoryRank),scores:compactScores
  };
}
function mergePersonTrend(view={},previousView=null,limit=60){
  const max=Math.max(2,Math.min(180,Number(limit)||60));
  const points=Array.isArray(previousView?.trend?.points)?previousView.trend.points.slice():[];
  const previousKey=String(previousView?.draftId||previousView?.publishedAt||'');
  const currentKey=String(view?.draftId||view?.publishedAt||'');
  if(!points.length&&previousKey&&previousKey!==currentKey)points.push(personTrendPoint(previousView));
  const current=personTrendPoint(view);
  if(current.draftId||current.publishedAt)points.push(current);
  const dedup=[];const seen=new Set();
  for(const point of points){
    const key=String(point?.draftId||point?.publishedAt||'');
    if(!key)continue;
    if(seen.has(key)){const idx=dedup.findIndex(x=>String(x?.draftId||x?.publishedAt||'')===key);if(idx>=0)dedup[idx]=point;continue;}
    seen.add(key);dedup.push(point);
  }
  return {...view,trend:{schemaVersion:1,points:dedup.slice(-max)}};
}

function buildAdminPublicSnapshot(current){
  const ranked=Array.isArray(current?.ranked)?current.ranked:[];
  return current?{draftId:current.draftId||null,publishedAt:current.publishedAt||null,weights:current.weights||{},total:ranked.length,top30:ranked.slice(0,30).map(compactPreviewRow)}:null;
}

function compactCategoryRow(row={},categoryRank=0){
  const person=row.person||{};
  return {
    categoryRank:num(categoryRank),globalRank:num(row.rank),score:num(row.score),state:row.state||'',
    person:{
      id:person.id||'',name:person.name||'',type:person.type||'',roleLabel:person.roleLabel||'',
      party:person.party||'',jurisdiction:person.jurisdiction||'',office:person.office||''
    }
  };
}
function buildCategoryPublicSnapshots(current){
  const ranked=Array.isArray(current?.ranked)?current.ranked:[];
  const groups={};
  for(const type of ['assembly','metropolitan','basic']){
    const rows=ranked.filter(row=>String(row?.person?.type||'')===type);
    groups[type]={
      draftId:current?.draftId||null,publishedAt:current?.publishedAt||null,weights:current?.weights||{},
      type,total:rows.length,rows:rows.map((row,index)=>compactCategoryRow(row,index+1))
    };
  }
  return groups;
}

module.exports={compactPreviewRow,compactHistory,buildHomePublicSnapshot,buildAdminPublicSnapshot,buildPersonPublicEntries,compactCategoryRow,buildCategoryPublicSnapshots,personTrendPoint,mergePersonTrend};
