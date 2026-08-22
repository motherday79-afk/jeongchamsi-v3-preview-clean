const STOPWORDS = new Set([
  '정치','정치인','국회','국회의원','의원','정부','관련','대한','통해','대해','오늘','이번','최근','현재','기자','뉴스','보도','발표','논의','입장','발언','인터뷰','단독','속보','종합','사진','영상','오전','오후','서울','한국','대한민국','위해','에서','으로','에게','까지','부터','하며','했다','한다','있는','없는','지난','오는','이날','것으로','가운데','제기','밝혀','밝혔다','말했다','전했다','예정','공개','진행','추진'
]);

function num(v){ return Math.max(0, Number(v)||0); }
function rowsOf(current){ return Array.isArray(current?.ranked) ? current.ranked : []; }
function previousSnapshot(current,history){
  const items=Array.isArray(history?.items)?history.items:[];
  return items.find(x=>x&&x.draftId&&x.draftId!==current?.draftId&&Array.isArray(x.top30))||null;
}
function rankMap(snapshot){
  return new Map((snapshot?.top30||[]).map(row=>[String(row?.person?.id||''),num(row?.rank)]).filter(([id,rank])=>id&&rank));
}
function cleanTitle(title=''){
  return String(title||'').replace(/\s+-\s+[^-]{1,60}$/,'').replace(/[\[\]“”"'‘’]/g,' ').replace(/\s+/g,' ').trim();
}
function headlineAgeWeight(ts,nowMs){
  const age=Math.max(0,nowMs-num(ts));
  if(age<=6*3600000)return 4;
  if(age<=24*3600000)return 2;
  if(age<=7*86400000)return 1;
  return .25;
}
function tokenizeHeadline(title,row){
  let text=cleanTitle(title);
  const names=[row?.person?.name,row?.person?.office].filter(Boolean).map(String);
  for(const n of names)text=text.split(n).join(' ');
  return text.match(/[가-힣A-Za-z0-9]{2,20}/g)||[];
}
function deriveKeywords(current,nowMs=Date.now(),limit=15){
  const rows=rowsOf(current).slice(0,50),scores=new Map();
  for(const row of rows){
    const rank=Math.max(1,num(row.rank)||50),rankBoost=1+Math.max(0,51-rank)/50;
    for(const h of (row?.news?.headlines||[]).slice(0,8)){
      const weight=headlineAgeWeight(h?.ts,nowMs)*rankBoost;
      for(const raw of tokenizeHeadline(h?.title,row)){
        const token=String(raw||'').trim();
        if(token.length<2||STOPWORDS.has(token)||/^\d+$/.test(token))continue;
        const key=token.toLowerCase();
        const item=scores.get(key)||{label:token,score:0,mentions:0,sources:new Set(),people:new Set()};
        item.score+=weight;item.mentions+=1;
        if(h?.source)item.sources.add(String(h.source));
        if(row?.person?.id)item.people.add(String(row.person.id));
        scores.set(key,item);
      }
    }
  }
  return [...scores.values()]
    .filter(x=>x.mentions>=2||x.score>=5)
    .sort((a,b)=>b.score-a.score||b.people.size-a.people.size||b.mentions-a.mentions||a.label.localeCompare(b.label,'ko'))
    .slice(0,limit)
    .map((x,i)=>({rank:i+1,label:x.label,score:Math.round(x.score*10)/10,mentions:x.mentions,sourceCount:x.sources.size,peopleCount:x.people.size,meta:`뉴스 ${x.mentions}건`}));
}
function riseAcceleration(row){
  const n=row?.news||{};
  return num(n.count6)*4-num(n.count24)+(num(n.sources24)*.25);
}
function deriveRising(current,history,limit=10){
  const prev=previousSnapshot(current,history),prevRanks=rankMap(prev),hasPrev=Boolean(prev);
  const items=rowsOf(current).slice(0,40).map(row=>{
    const id=String(row?.person?.id||''),rank=num(row?.rank),prevRank=prevRanks.get(id)||null;
    const rankDelta=prevRank?prevRank-rank:null,acceleration=riseAcceleration(row);
    let trendLabel='';
    if(prevRank){trendLabel=rankDelta>0?`▲ ${rankDelta}`:rankDelta<0?`▼ ${Math.abs(rankDelta)}`:'—';}
    else if(hasPrev)trendLabel='NEW';
    else if(num(row?.news?.count6)>0)trendLabel=`6시간 ${num(row.news.count6)}건`;
    else trendLabel=`NOW ${rank}위`;
    const priority=rankDelta>0?30000+rankDelta*100:(!prevRank&&hasPrev?20000:10000)+Math.max(0,acceleration)*10+(100-rank);
    return {
      id,rank,title:row?.person?.name||'',party:row?.person?.party||'',jurisdiction:row?.person?.jurisdiction||'',href:`/person/${id}`,
      score:num(row?.score),rankDelta,previousRank:prevRank,trendLabel,acceleration:Math.round(acceleration*10)/10,priority,
      count6:num(row?.news?.count6),count24:num(row?.news?.count24)
    };
  }).filter(x=>x.id&&x.title);
  return items.sort((a,b)=>b.priority-a.priority||a.rank-b.rank).slice(0,limit).map(({priority,...x})=>x);
}
function compactWhyHeadline(row){
  const h=(row?.news?.headlines||[])[0];
  return h?.title?cleanTitle(h.title):'';
}
function whyNowText(row,rankDelta){
  if(!row)return '아직 게시된 NOW 데이터가 없습니다.';
  const latest=compactWhyHeadline(row),n=row.news||{},search=row.search||{};
  if(rankDelta>0)return `직전 게시 대비 NOW 순위가 ${rankDelta}계단 상승했습니다.${latest?` 최근 ‘${latest}’ 관련 보도가 이어지고 있습니다.`:''}`;
  if(num(n.count6)>0)return `최근 6시간 뉴스가 ${num(n.count6)}건 집계됐습니다.${latest?` ‘${latest}’ 이슈가 현재 관심을 끌고 있습니다.`:''}`;
  if(num(n.count24)>0)return `최근 24시간 뉴스가 ${num(n.count24)}건 집계됐습니다.${latest?` ‘${latest}’ 관련 흐름을 확인해 보세요.`:''}`;
  if(num(search.monthlyTotalQcCnt)>0)return `네이버 월간 검색량 ${num(search.monthlyTotalQcCnt).toLocaleString('ko-KR')}회가 집계됐습니다. 현재 검색 관심을 기준으로 NOW 상태를 보여줍니다.`;
  return '최근 검색량과 뉴스 데이터를 기준으로 NOW 상태를 계산하고 있습니다.';
}
function derivePersonView(current,history,id,nowMs=Date.now()){
  const rows=rowsOf(current),row=rows.find(x=>String(x?.person?.id||'')===String(id||''))||null;
  if(!row)return {row:null,rankDelta:null,previousRank:null,trendLabel:'',whyNow:'아직 게시된 NOW 데이터가 없습니다.',related:[],publishedAt:current?.publishedAt||null};
  const prev=previousSnapshot(current,history),prevRank=rankMap(prev).get(String(id||''))||null;
  const rankDelta=prevRank?prevRank-num(row.rank):null;
  const trendLabel=prevRank?(rankDelta>0?`▲ ${rankDelta}`:rankDelta<0?`▼ ${Math.abs(rankDelta)}`:'—'):(prev?'NEW':'');
  const party=String(row?.person?.party||''),region=String(row?.person?.jurisdiction||'').split(/\s+/)[0]||'';
  const related=rows.filter(x=>String(x?.person?.id||'')!==String(id||'')).map(x=>({x,score:(party&&x?.person?.party===party?4:0)+(region&&String(x?.person?.jurisdiction||'').startsWith(region)?2:0)+(Math.abs(num(x.rank)-num(row.rank))<=5?1:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||num(a.x.rank)-num(b.x.rank)).slice(0,4).map(x=>x.x);
  return {row,rankDelta,previousRank:prevRank,trendLabel,whyNow:whyNowText(row,rankDelta),related,publishedAt:current?.publishedAt||null,keywords:deriveKeywords(current,nowMs,8)};
}
function derivePublicSignals(current,history,nowMs=Date.now()){
  if(!rowsOf(current).length)return {source:'none',publishedAt:null,keywords:[],rising:[]};
  return {source:'published-now',publishedAt:current.publishedAt||null,keywords:deriveKeywords(current,nowMs,15),rising:deriveRising(current,history,10)};
}
module.exports={cleanTitle,deriveKeywords,deriveRising,derivePublicSignals,derivePersonView,previousSnapshot};
