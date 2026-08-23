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

function clampScore(v){return Math.max(0,Math.min(100,Math.round((Number(v)||0)*10)/10));}
function percentileScore(rows,getter,target){
  const values=rows.map(x=>Math.max(0,Number(getter(x))||0)).sort((a,b)=>a-b);
  if(!values.length)return 0;
  const t=Math.max(0,Number(target)||0);
  let less=0,equal=0;
  for(const v of values){if(v<t)less++;else if(v===t)equal++;else break;}
  return clampScore(((less+Math.max(0,equal-1)/2)/Math.max(1,values.length-1))*100);
}
function blend(parts){
  let total=0,weight=0;
  for(const [value,w] of parts){const ww=Math.max(0,Number(w)||0);total+=clampScore(value)*ww;weight+=ww;}
  return clampScore(weight?total/weight:0);
}
function rateShiftScore(recentRate,baselineRate){
  const recent=Math.max(0,Number(recentRate)||0),base=Math.max(0,Number(baselineRate)||0);
  const ratio=(recent+.08)/(base+.08);
  return clampScore(50+25*(Math.log(ratio)/Math.log(2)));
}
function grade(score){const s=clampScore(score);return s>=90?'매우 높음':s>=75?'높음':s>=60?'상승':s>=40?'보통':s>=25?'낮음':'매우 낮음';}
function deriveIntelligenceAnalysis(current,row){
  const rows=rowsOf(current),search=row?.search||{},news=row?.news||{};
  const pc=num(search.monthlyPcQcCnt),mobile=num(search.monthlyMobileQcCnt),total=pc+mobile;
  const c6=num(news.count6),c24=Math.max(c6,num(news.count24)),c7=Math.max(c24,num(news.count7d)),sources=num(news.sources24);
  const pcScore=percentileScore(rows,x=>x?.search?.monthlyPcQcCnt,pc);
  const mobileScore=percentileScore(rows,x=>x?.search?.monthlyMobileQcCnt,mobile);
  const totalScore=percentileScore(rows,x=>x?.search?.monthlyTotalQcCnt,total);
  const c6Score=percentileScore(rows,x=>x?.news?.count6,c6);
  const c24Score=percentileScore(rows,x=>x?.news?.count24,c24);
  const c7Score=percentileScore(rows,x=>x?.news?.count7d,c7);
  const sourceScore=percentileScore(rows,x=>x?.news?.sources24,sources);
  const mobileShare=total?mobile/total:.5;
  const prior18=Math.max(0,c24-c6)/18,prior6d=Math.max(0,c7-c24)/144;
  const newsAcceleration=rateShiftScore(c6/6,prior18);
  const issueFreshness=rateShiftScore(c24/24,prior6d);
  const diversityRatio=c24?Math.min(1,sources/c24)*100:0;
  const overallInterest=blend([[pcScore,50],[mobileScore,50]]);
  const highEngagement=pcScore;
  const massExpansion=mobileScore;
  const issueHeat=blend([[c6Score,50],[newsAcceleration,30],[c24Score,20]]);
  const mediaDiversity=blend([[sourceScore,75],[diversityRatio,25]]);
  const mediaSpread=blend([[c24Score,42],[sourceScore,43],[mediaDiversity,15]]);
  const activity=blend([[c7Score,40],[c24Score,30],[sourceScore,15],[issueFreshness,15]]);
  const audiencePosition=clampScore(50+(massExpansion-highEngagement)*.38+(mobileShare-.5)*35);
  const audienceExpansion=blend([[massExpansion,55],[Math.max(0,50+(massExpansion-highEngagement)),25],[mobileShare*100,20]]);
  const mobileResponse=blend([[massExpansion,72],[mobileShare*100,28]]);
  const massPenetration=blend([[massExpansion,50],[overallInterest,30],[issueHeat,20]]);
  const coreRetention=blend([[highEngagement,78],[overallInterest,22]]);
  const activityAcceleration=blend([[newsAcceleration,62],[issueFreshness,38]]);
  const activityConcentration=blend([[issueFreshness,68],[c24Score,32]]);
  const stability=clampScore(100-Math.abs(newsAcceleration-50)*1.25);
  const activityPersistence=blend([[c7Score,58],[c24Score,27],[stability,15]]);
  const issuePersistence=blend([[c7Score,58],[c24Score,24],[sourceScore,18]]);
  const newsPressure=blend([[c6Score,35],[c24Score,35],[c7Score,15],[sourceScore,15]]);
  const alignment=clampScore(100-Math.abs(newsPressure-overallInterest));
  const newsSearchTransition=clampScore(Math.sqrt((newsPressure/100)*(overallInterest/100))*80+alignment*.2);
  const issueInflux=blend([[issueHeat,45],[massExpansion,30],[newsAcceleration,25]]);
  const gap=Math.abs(newsPressure-overallInterest);
  const mediaPublicGap=clampScore(gap*1.35);
  const direction=newsPressure>overallInterest+7?'media-led':overallInterest>newsPressure+7?'public-led':'balanced';
  const issueExplosiveness=blend([[issueHeat,45],[newsAcceleration,30],[massExpansion,25]]);
  const scores={overallInterest,highEngagement,massExpansion,activity,issueHeat,mediaSpread,audienceExpansion,mobileResponse,massPenetration,coreRetention,activityAcceleration,activityConcentration,activityPersistence,newsAcceleration,issueFreshness,issuePersistence,mediaDiversity,newsSearchTransition,issueInflux,mediaPublicGap,issueExplosiveness};
  let signalLabel='안정관심형';
  if(overallInterest>=78&&activity>=72&&massExpansion>=75&&issueHeat>=72)signalLabel='전면 급상승형';
  else if(issueExplosiveness>=78&&newsAcceleration>=70)signalLabel='이슈폭발형';
  else if(massExpansion>=72&&issueInflux>=68)signalLabel='대중확산형';
  else if(direction==='media-led'&&mediaPublicGap>=45)signalLabel='미디어 선행형';
  else if(highEngagement>=72&&coreRetention>=68&&highEngagement>massExpansion+8)signalLabel='고관여 지속형';
  else if(activity>=70&&activityPersistence>=65)signalLabel='활동지속형';
  else if(overallInterest>=65)signalLabel='관심확대형';
  const audienceLabel=audiencePosition>=61?'대중 확산 우세':audiencePosition<=39?'고관여 관심 우세':'균형 관심 구조';
  const directionLabel=direction==='media-led'?'미디어 반응 우세':direction==='public-led'?'대중 검색 반응 우세':'미디어·대중 균형';
  let diagnosis='검색 관심과 언론 노출을 함께 보면 현재 관심은 비교적 안정적인 흐름입니다.';
  if(signalLabel==='전면 급상승형')diagnosis='검색 관심과 언론 노출이 함께 높은 수준이며, 모바일 대중 관심과 최근 이슈 강도가 동시에 확장되는 국면입니다.';
  else if(signalLabel==='이슈폭발형')diagnosis='최근 뉴스 발생 속도가 빠르게 높아지고 모바일 반응도 강해, 단기 이슈가 대중 관심으로 번지는 신호가 강합니다.';
  else if(signalLabel==='대중확산형')diagnosis='모바일 기반 관심이 상대적으로 강하고 최근 뉴스 흐름과 동반돼, 관심이 더 넓은 대중층으로 확장되는 신호가 관측됩니다.';
  else if(signalLabel==='미디어 선행형')diagnosis='언론 노출 강도가 검색 반응보다 앞서 있습니다. 현재 이슈가 대중 검색 관심으로 이어지는지 지켜볼 구간입니다.';
  else if(signalLabel==='고관여 지속형')diagnosis='PC 기반 정보탐색 관심이 상대적으로 강합니다. 단기 화제성보다 고관여 관심이 유지되는 성격이 두드러집니다.';
  else if(signalLabel==='활동지속형')diagnosis='최근 7일 언론 노출이 꾸준하고 단기 집중보다 지속적인 활동 노출 흐름이 강하게 나타납니다.';
  else if(signalLabel==='관심확대형')diagnosis='검색 관심과 뉴스 노출이 평균 이상으로 형성돼 있으며, 추가 이슈 발생 시 관심 확장 가능성이 있는 구간입니다.';
  return {
    schemaVersion:1,
    scores,
    grades:Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,grade(v)])),
    audience:{position:audiencePosition,label:audienceLabel,mobileShare:clampScore(mobileShare*100)},
    mediaPublic:{direction,label:directionLabel,newsPressure,searchPressure:overallInterest},
    signal:{label:signalLabel,diagnosis},
    model:'JEONGCHAMSI MULTI-INTELLIGENCE DATA ANALYSIS'
  };
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
  const related=rows.filter(x=>String(x?.person?.id||'')!==String(id||'')).map(x=>({x,score:(party&&x?.person?.party===party?4:0)+(region&&String(x?.person?.jurisdiction||'').startsWith(region)?2:0)+(Math.abs(num(x.rank)-num(row.rank))<=5?1:0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||num(a.x.rank)-num(b.x.rank)).slice(0,4).map(({x})=>({rank:num(x.rank),score:num(x.score),person:{id:x?.person?.id||'',name:x?.person?.name||'',party:x?.person?.party||'',jurisdiction:x?.person?.jurisdiction||''}}));
  return {row,rankDelta,previousRank:prevRank,trendLabel,whyNow:whyNowText(row,rankDelta),related,publishedAt:current?.publishedAt||null,analysis:deriveIntelligenceAnalysis(current,row)};
}
function derivePublicSignals(current,history,nowMs=Date.now()){
  if(!rowsOf(current).length)return {source:'none',publishedAt:null,keywords:[],rising:[]};
  return {source:'published-now',publishedAt:current.publishedAt||null,keywords:deriveKeywords(current,nowMs,15),rising:deriveRising(current,history,10)};
}
module.exports={cleanTitle,deriveKeywords,deriveRising,derivePublicSignals,derivePersonView,deriveIntelligenceAnalysis,previousSnapshot};
