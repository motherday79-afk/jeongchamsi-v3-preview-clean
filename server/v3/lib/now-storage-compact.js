function compactHeadlineForStorage(headline={}){
  return {
    title:String(headline?.title||'').slice(0,500),
    source:String(headline?.source||'').slice(0,160),
    ts:Number.isFinite(Number(headline?.ts))?Number(headline.ts):null
  };
}

function compactRankRowForStorage(row={}){
  const news=row?.news||{};
  return {
    ...row,
    news:{
      ...news,
      headlines:Array.isArray(news.headlines)?news.headlines.slice(0,8).map(compactHeadlineForStorage):[]
    }
  };
}

function compactCurrentForStorage(current={}){
  return {
    ...current,
    ranked:Array.isArray(current.ranked)?current.ranked.map(compactRankRowForStorage):[]
  };
}

module.exports={compactHeadlineForStorage,compactRankRowForStorage,compactCurrentForStorage};
