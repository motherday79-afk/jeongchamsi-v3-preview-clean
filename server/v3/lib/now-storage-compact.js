function text(value,max=240){return String(value||'').slice(0,max);}
function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}

function compactHeadlineForStorage(headline={}){
  return {
    title:text(headline?.title,500),
    source:text(headline?.source,160),
    ts:Number.isFinite(Number(headline?.ts))?Number(headline.ts):null,
    // CURRENT is only the compatibility/rebuild baseline. Keep a bounded link
    // for fallback UI while the normal person-public entry retains the full link.
    link:text(headline?.link,900)
  };
}

function compactPersonForStorage(person={}){
  return {
    id:text(person?.id,120),
    type:text(person?.type,40),
    name:text(person?.name,120),
    party:text(person?.party,120),
    jurisdiction:text(person?.jurisdiction,180),
    office:text(person?.office,180),
    roleLabel:text(person?.roleLabel,120),
    ambiguousName:Boolean(person?.ambiguousName)
  };
}

function compactRankRowForStorage(row={}){
  return {
    rank:num(row?.rank),score:num(row?.score),state:text(row?.state,40),
    searchScore:num(row?.searchScore),newsScore:num(row?.newsScore),
    person:compactPersonForStorage(row?.person||{}),
    search:{
      state:text(row?.search?.state||'ERROR',40),
      monthlyPcQcCnt:num(row?.search?.monthlyPcQcCnt),
      monthlyMobileQcCnt:num(row?.search?.monthlyMobileQcCnt),
      monthlyTotalQcCnt:num(row?.search?.monthlyTotalQcCnt),
      ambiguousName:Boolean(row?.search?.ambiguousName)
    },
    news:{
      state:text(row?.news?.state||'ERROR',40),
      count6:num(row?.news?.count6),count24:num(row?.news?.count24),count7d:num(row?.news?.count7d),
      sources24:num(row?.news?.sources24),latest:Number.isFinite(Number(row?.news?.latest))?Number(row.news.latest):null,
      headlines:Array.isArray(row?.news?.headlines)?row.news.headlines.slice(0,3).map(compactHeadlineForStorage):[]
    },
    providers:Array.isArray(row?.providers)?row.providers.slice(0,4).map(x=>text(x,80)):[]
  };
}

function compactCurrentForStorage(current={}){
  return {
    schemaVersion:Number(current?.schemaVersion)||1,
    draftId:text(current?.draftId,160),
    publishedAt:current?.publishedAt||null,
    snapshotKind:text(current?.snapshotKind,80),
    weights:current?.weights||{},
    batchCount:num(current?.batchCount),
    providers:Array.isArray(current?.providers)?current.providers.slice(0,6).map(x=>text(x,80)):[],
    ranked:Array.isArray(current?.ranked)?current.ranked.map(compactRankRowForStorage):[]
  };
}

module.exports={compactHeadlineForStorage,compactPersonForStorage,compactRankRowForStorage,compactCurrentForStorage};
