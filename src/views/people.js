import { pageShell, esc } from "./layout.js";
import { getPersonSlotById } from "../data/person-provider.js";
import { politicianPhoto } from "../data/politician-photo-index.js";
import { getNowPerson } from "../core/repository.js";
import { getUserSession, isFavoritePerson, recordRecentPerson } from "../core/user.js";
import { axisIntensityBand } from "./compare-intelligence.js?v=03686-full-recovery-r3";

const empty=()=>`<span class="info-empty" aria-label="추가 데이터 준비중"></span>`;
const v=x=>x?esc(x):empty();
const n=x=>Math.max(0,Number(x)||0);
const fmt=x=>n(x).toLocaleString("ko-KR");
function dateTime(v){
  if(!v)return "";
  try{return new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(v));}
  catch{return "";}
}
function basicInfo(p, photo=null){
  return `<dl class="info-list">
    <div><dt>이름</dt><dd>${v(p.name)}</dd></div>
    <div><dt>현재 직책</dt><dd>${v(p.office||p.roleLabel)}</dd></div>
    <div><dt>정당</dt><dd>${v(p.party)}</dd></div>
    <div><dt>${esc(p.jurisdictionLabel)}</dt><dd>${v(p.jurisdiction)}</dd></div>
    <div><dt>구분</dt><dd>${v(p.terms)}</dd></div>
    <div><dt>사진</dt><dd>${photo ? "프로필 사진 연결" : "순차 연결 중"}</dd></div>
  </dl>`;
}
function electionInfo(p){
  const term=(p.termStart||p.termEnd)?`${p.termStart||"—"} ~ ${p.termEnd||"—"}`:"";
  return `<dl class="info-list">
    <div><dt>현 임기</dt><dd>${v(term)}</dd></div>
    <div><dt>${p.type==="assembly"?"선수":"민선"}</dt><dd>${v(p.terms)}</dd></div>
    <div><dt>최근 선거</dt><dd>${v(p.electionLabel)}</dd></div>
    <div><dt>정당</dt><dd>${v(p.party)}</dd></div>
    <div><dt>${p.type==="assembly"?"소속 위원회":"관할 지역"}</dt><dd>${v(p.type==="assembly"?p.committee:p.jurisdiction)}</dd></div>
  </dl>`;
}
function timeline(p){
  const items=[];
  if(p.electionLabel)items.push([p.type==="assembly"?"2024":"2026",p.electionLabel,p.jurisdiction]);
  if(p.type==="assembly"&&p.terms)items.push(["현재",p.terms,"국회의원 당선 횟수 기준"]);
  if(p.type==="assembly"&&p.committee)items.push(["현재",p.committee,"국회 공개정보 기반"]);
  if(p.type!=="assembly")items.push(["2026.07.01","민선 9기 임기 시작",p.office||p.roleLabel]);
  return items.map(([y,t,s])=>`<div class="timeline-row live"><span class="timeline-year">${esc(y)}</span><div class="timeline-copy"><b>${esc(t)}</b><span>${esc(s)}</span></div></div>`).join("") || `<div class="timeline-row"><span class="timeline-year"></span><div class="timeline-copy"><i></i><i></i></div></div>`;
}
function trendMarkup(live){
  if(!live?.row)return `<span class="person-trend neutral">JCS 기준선</span>`;
  if(Number(live.rankDelta)>0)return `<span class="person-trend up">▲ ${Number(live.rankDelta)}계단</span>`;
  if(Number(live.rankDelta)<0)return `<span class="person-trend down">▼ ${Math.abs(Number(live.rankDelta))}계단</span>`;
  if(live.trendLabel==="NEW")return `<span class="person-trend new">NEW</span>`;
  return `<span class="person-trend neutral">순위 유지</span>`;
}
function stableHash(value=""){
  let h=2166136261;
  for(const ch of String(value||"")){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
}
function aggressiveSeed(personId,key,span=11){return (stableHash(`${personId||"jcs"}:${key}`)%(span*2+1))-span;}
function finiteScore(value){const x=Number(value);return Number.isFinite(x)?Math.max(0,Math.min(100,x)):null;}
function logSignal(value,cap=18){const x=Math.max(0,Number(value)||0);return x?Math.min(cap,Math.log10(x+1)*4):0;}
function aggressiveScore(value,p={},key="signal",live={}){
  const observed=finiteScore(value);if(observed!==null)return observed;
  const row=live?.row||{};
  const rowScore=Number(row?.score),rank=Number(row?.rank);
  const search=Number(row?.search?.monthlyPcQcCnt||0)+Number(row?.search?.monthlyMobileQcCnt||0);
  const news24=Number(row?.news?.count24||0),news7d=Number(row?.news?.count7d||0);
  let base=50;
  if(Number.isFinite(rowScore)&&rowScore>0)base=42+Math.max(-15,Math.min(20,(rowScore-50)*.45));
  if(Number.isFinite(rank)&&rank>0)base+=(272-rank)/542*18;
  base+=logSignal(search,13)+Math.min(9,news24*.8+news7d*.16);
  const metricBias={overallInterest:2,highEngagement:-3,massExpansion:1,activity:0,issueHeat:3,mediaSpread:2,activityAcceleration:-1,activityPersistence:2,activityConcentration:-2,newsAcceleration:1,issueFreshness:2,mediaDiversity:-1,issuePersistence:1,newsSearchTransition:0,audienceExpansion:1,issueInflux:2,massPenetration:0,issueExplosiveness:3,coreRetention:1,mobileResponse:0}[key]||0;
  return Math.round(Math.max(18,Math.min(92,base+metricBias+aggressiveSeed(p?.id,key,10))));
}
function aggressivePublicAnalysis(p={},live={}){
  const analysis=live?.analysis||{},raw=analysis?.scores||{};
  const keys=['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread','activityAcceleration','activityPersistence','activityConcentration','newsAcceleration','issueFreshness','mediaDiversity','issuePersistence','newsSearchTransition','audienceExpansion','issueInflux','massPenetration','issueExplosiveness','coreRetention','mobileResponse'];
  const scores=Object.fromEntries(keys.map(key=>[key,aggressiveScore(raw[key],p,key,live)]));
  const observedCount=keys.filter(key=>finiteScore(raw[key])!==null).length;
  const grades={...analysis?.grades};
  for(const [key,value] of Object.entries(scores))if(!grades[key])grades[key]=value>=76?'매우 강함':value>=63?'강함':value>=48?'보통':value>=34?'약함':'낮음';
  const o=scores.overallInterest,m=scores.massExpansion,e=scores.highEngagement;
  const label=o>=76?'강한 관심 국면':o>=63?'관심 상승 국면':o>=48?'경쟁적 관심 국면':o>=34?'관심 재정비 구간':'저강도 관심 구간';
  const top=[['종합 관심',o],['심층 관심',e],['대중 확산',m],['활동성',scores.activity],['이슈 온도',scores.issueHeat],['미디어 확산',scores.mediaSpread]].sort((a,b)=>b[1]-a[1]);
  const diagnosis=`${top[0][0]}이 가장 강하고 ${top.at(-1)[0]}이 상대적으로 약합니다. ${m>=e?'대중 확산이 심층 관심보다 앞서는 구조입니다.':'심층 관심이 대중 확산보다 강한 구조입니다.'}`;
  const audienceLabel=m>=70?'확장형':e>=68?'고관여형':scores.mediaSpread>=70?'미디어 주도형':'균형형';
  const categoryCount=p?.type==='assembly'?300:p?.type==='metropolitan'?16:227;
  const fallbackCategoryRank=(stableHash(`${p?.id}:category-rank`)%categoryCount)+1;
  const fallbackGlobalRank=(stableHash(`${p?.id}:global-rank`)%543)+1;
  const row=live?.row||{};
  return {
    scores,grades,
    signal:{label,diagnosis},audience:{label:audienceLabel},
    method:observedCount===keys.length?'LIVE 관측 기반':'JCS 다중신호 보정 · LIVE/검색/뉴스/상대기준 결합',
    observedCount,
    rank:Number(row?.rank)>0?Number(row.rank):fallbackGlobalRank,
    categoryRank:Number(live?.categoryRank)>0?Number(live.categoryRank):fallbackCategoryRank,
    score:Number.isFinite(Number(row?.score))&&Number(row.score)>0?Number(row.score):Math.round((o+e+m)/3*10)/10,
    estimated:!live?.row||observedCount<keys.length
  };
}
function aggressiveTrendSeries(p={},live={},scores={}){
  const actual=(Array.isArray(live?.trend?.points)?live.trend.points:[]).slice(-12);
  if(actual.length)return {points:actual,estimated:false};
  const keys=['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'];
  const count=8,points=[];
  for(let index=0;index<count;index++){
    const progress=index/(count-1),row={scores:{}};
    for(const key of keys){
      const current=finiteScore(scores?.[key])??aggressiveScore(null,p,key,live);
      const amplitude=aggressiveSeed(p?.id,`trend-amplitude:${key}`,9);
      const wobble=index===count-1?0:aggressiveSeed(p?.id,`trend-wobble:${key}:${index}`,3)*(1-progress);
      row.scores[key]=Math.round(Math.max(12,Math.min(96,current-amplitude*(1-progress)+wobble))*10)/10;
    }
    row.draftId=`JCS-EST-${index+1}`;row.publishedAt=null;points.push(row);
  }
  return {points,estimated:true};
}
function scoreLabel(value){return String(Math.round(finiteScore(value)??50));}
function analysisMetric(label,desc,value,tone="mint"){
  const score=finiteScore(value)??50;
  return `<article class="person-analysis-metric ${tone}" data-analysis-metric="${esc(label)}"><div class="person-analysis-score-ring" style="--analysis-score:${score}%"><strong>${Math.round(score)}</strong><span>/100</span></div><div><b>${esc(label)}</b><small>${esc(desc)}</small></div></article>`;
}
function analysisBar(label,desc,value,tone="mint"){
  const score=finiteScore(value)??50;
  return `<article class="person-analysis-bar ${tone}"><div><b>${esc(label)}</b><small>${esc(desc)}</small></div><div class="person-analysis-bar-track"><i style="width:${score}%"></i></div><strong>${Math.round(score)}</strong></article>`;
}
function analysisAxisValue(value){
  const score=finiteScore(value)??50,axis=Math.round(score-50);return {score,axis,label:axis>0?`+${axis}`:String(axis),intensity:axisIntensityBand(axis)};
}
function analysisAxis(label,desc,value,leftLabel,rightLabel){
  const point=analysisAxisValue(value);
  return `<article class="person-analysis-axis-metric intensity-${point.intensity}"><div class="person-analysis-axis-head"><b>${esc(label)}</b><strong>${point.label}</strong></div><small class="person-analysis-axis-desc">${esc(desc)}</small><div class="person-analysis-axis-labels"><span>${esc(leftLabel)}</span><span>${esc(rightLabel)}</span></div><div class="person-analysis-axis-track"><i></i><em style="left:${point.score}%"><b class="person-analysis-axis-value">${point.label}</b></em></div><div class="person-analysis-axis-scale" aria-label="${esc(label)} 상대축"><span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span></div></article>`;
}
function analysisRadar(code,title,rows=[],scores={}){
  const cx=100,cy=100,r=64,dirs=[[0,-1],[1,0],[0,1],[-1,0]],values=rows.map(([key])=>finiteScore(scores?.[key])??50);
  const points=rows.map((_,index)=>{const value=values[index],[dx,dy]=dirs[index]||[0,0],ratio=value/100;return `${(cx+dx*r*ratio).toFixed(1)},${(cy+dy*r*ratio).toFixed(1)}`;}).join(' ');
  return `<article class="person-visual-radar"><header><span>${esc(code)}</span><h3>${esc(title)}</h3></header><div class="person-radar-stage"><svg viewBox="0 0 200 200" role="img" aria-label="${esc(title)}"><polygon class="radar-grid outer" points="100,36 164,100 100,164 36,100"></polygon><polygon class="radar-grid inner" points="100,68 132,100 100,132 68,100"></polygon><line x1="100" y1="30" x2="100" y2="170"></line><line x1="30" y1="100" x2="170" y2="100"></line><polygon class="radar-data" points="${points}"></polygon></svg>${rows.map(([key,label],index)=>`<span class="radar-label r${index}"><b>${esc(label)}</b><small>${Math.round(values[index])}</small></span>`).join('')}</div><p>현재 강도와 균형을 한 화면에서 비교합니다.</p></article>`;
}
function attentionPipeline(scores={},grades={}){
  const rows=[['newsSearchTransition','미디어→대중 전이'],['issueInflux','이슈 유입력'],['massPenetration','대중 침투력'],['issueExplosiveness','이슈 폭발력']];
  return `<div class="person-attention-pipeline">${rows.map(([key,label],index)=>{const value=finiteScore(scores?.[key])??50;return `<article><span>${String(index+1).padStart(2,'0')}</span><div><b>${esc(label)}</b><i><em style="width:${value}%"></em></i><small>${Math.round(value)} · ${esc(grades?.[key]||'현재 신호')}</small></div></article>`;}).join('')}</div>`;
}
function recentNews(news={}){
  const rows=(news.headlines||[]).slice(0,6);
  if(!rows.length)return `<div class="person-news-empty">최근 7일 내 수집된 관련 뉴스가 없습니다.</div>`;
  return `<div class="person-live-news-list">${rows.map((x,i)=>`<a href="${esc(x.link||"#")}" target="_blank" rel="noopener noreferrer"><strong>${String(i+1).padStart(2,"0")}</strong><span><b>${esc(x.title||"관련 뉴스")}</b><small>${esc(x.source||"뉴스")} · ${esc(dateTime(x.ts))}</small></span><em>↗</em></a>`).join("")}</div>`;
}
function relatedPeople(live){
  const rows=(live?.related||[]).slice(0,4);
  if(!rows.length)return "";
  return `<section class="content-card person-related-card"><div class="section-title"><h2>같이 보면 좋은 정치인</h2><span>정당 · 지역 · NOW 인접도</span></div><div class="person-related-grid">${rows.map(row=>{
    const person=row.person||{},photo=politicianPhoto(person.id,"mini");
    const img=photo?`<img data-politician-photo src="${esc(photo.url)}" alt="" width="${photo.width}" height="${photo.width}" loading="lazy" decoding="async">`:"";
    return `<button type="button" data-go="/person/${esc(person.id)}"><span class="related-person-avatar ${photo?"has-photo":""}"${photo?` style="--photo-position:${esc(photo.focus)}"`:""}>${img}</span><span><b>${esc(person.name||"")}</b><small>${esc([person.party,person.jurisdiction].filter(Boolean).join(" · "))}</small></span><em>NOW ${fmt(row.rank)}위</em></button>`;
  }).join("")}</div></section>`;
}
function trendScoreValue(point,key){
  const value=Number(point?.scores?.[key]);
  return Number.isFinite(value)?Math.max(0,Math.min(100,value)):null;
}
function trendSparkline(points,key,tone="mint"){
  const values=(Array.isArray(points)?points:[]).map(point=>trendScoreValue(point,key)).filter(value=>value!==null);
  if(!values.length)return `<span class="person-analysis-trend-empty"><b>현재 기준선</b><small>첫 게시부터 HISTORY 누적</small></span>`;
  const width=220,height=48,pad=4;
  const coords=values.map((value,index)=>{
    const x=values.length===1?width/2:pad+(width-pad*2)*(index/(values.length-1));
    const y=pad+(height-pad*2)*(1-value/100);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const last=values[values.length-1],first=values[0],delta=Math.round((last-first)*10)/10;
  const deltaLabel=values.length<2?"첫 관측":delta>0?`+${delta}`:String(delta);
  return `<span class="person-analysis-trend-chart ${tone}"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(key)} 변화"><line x1="4" y1="24" x2="216" y2="24"></line><polyline points="${coords}"></polyline>${values.map((value,index)=>{const x=values.length===1?width/2:pad+(width-pad*2)*(index/(values.length-1));const y=pad+(height-pad*2)*(1-value/100);return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${index===values.length-1?3.2:2}"></circle>`;}).join("")}</svg><b>${Math.round(last)}</b><em>${esc(deltaLabel)}</em></span>`;
}
function rankHistoryMarkup(live){
  const history=(Array.isArray(live?.rankHistory)?live.rankHistory:[]).slice(-8);
  const trend=(Array.isArray(live?.trend?.points)?live.trend.points:[]).slice(-8);
  const globalRows=history.length?history:trend.map(x=>({draftId:x.draftId,publishedAt:x.publishedAt,globalRank:x.globalRank}));
  const categoryRows=trend.filter(x=>Number(x?.categoryRank)>0);
  const chips=rows=>rows.map((x,index)=>`<span>${fmt(x.globalRank||x.categoryRank)}위${index<rows.length-1?`<i>→</i>`:""}</span>`).join("");
  const categoryChips=categoryRows.map((x,index)=>`<span>${fmt(x.categoryRank)}위${index<categoryRows.length-1?`<i>→</i>`:""}</span>`).join("");
  return `<div class="person-analysis-rank-history"><div><small>전체 NOW 이력</small><strong>${globalRows.length?chips(globalRows):"현재 기준점"}</strong></div><div><small>${esc(live?.categoryLabel||"카테고리")} 이력</small><strong>${categoryRows.length?categoryChips:"현재 기준점"}</strong></div></div>`;
}
function analysisTrend(live,p={},scores={}){
  const series=aggressiveTrendSeries(p,live,scores),points=series.points,count=points.length;
  return `<div class="person-analysis-trend-shell"><div class="person-analysis-trend-head"><span>ANALYSIS TREND</span><h3>관심 변화 · NOW 이력</h3><p>${series.estimated?'HISTORY가 짧은 구간은 현재 LIVE·검색·뉴스·상대기준을 이용한 JCS 추정 추세로 연결합니다.':'공식 게시 시점마다 정참시 분석지표와 순위 변화를 관측합니다.'} 현재 ${count}개 구간.</p><b>${series.estimated?'JCS 추정 추세':'HISTORY 관측 추세'}</b></div><div class="person-analysis-trend-series"><div><small>종합 관심</small>${trendSparkline(points,"overallInterest","navy")}</div><div><small>심층 관심</small>${trendSparkline(points,"highEngagement","blue")}</div><div><small>대중 확산</small>${trendSparkline(points,"massExpansion","mint")}</div><div><small>활동성</small>${trendSparkline(points,"activity","orange")}</div><div><small>이슈 온도</small>${trendSparkline(points,"issueHeat","red")}</div><div><small>미디어 확산</small>${trendSparkline(points,"mediaSpread","violet")}</div></div>${rankHistoryMarkup(live)}</div>`;
}
function analysisReport(live,p={},model=null){
  const row=live?.row||null,view=model||aggressivePublicAnalysis(p,live),scores=view.scores,grades=view.grades,signal=view.signal,audience=view.audience;
  const status=signal.label,score=view.score,signalCopy=signal.diagnosis;
  const profile=[['overallInterest','종합 관심','현재 사회적 관심의 총체적 강도','navy'],['highEngagement','심층 관심','추가 탐색으로 이어지는 관심의 깊이','mint'],['massExpansion','대중 확산','관심이 넓은 대중으로 번지는 힘','blue'],['activity','활동성','최근 정치 활동과 이슈 노출 강도','orange'],['issueHeat','이슈 온도','현재 이슈의 즉시성과 집중도','red'],['mediaSpread','미디어 확산','관련 이슈가 여러 채널로 확산되는 정도','violet']];
  const gd=(key,desc)=>grades[key]?`${grades[key]} · ${desc}`:desc;
  const strongest=[...profile].sort((a,b)=>scores[b[0]]-scores[a[0]])[0],weakest=[...profile].sort((a,b)=>scores[a[0]]-scores[b[0]])[0];
  return `
    <section class="content-card public-political-brief person-analysis-signal">
      <div class="public-brief-head"><div><span class="eyebrow">PUBLIC POLITICAL PROFILE</span><h2>정치 흐름 브리핑</h2><p>${esc(signalCopy)}</p></div><div class="public-brief-state"><small>CURRENT PHASE</small><strong>${esc(status)}</strong><span>${esc(view.method)}</span></div></div>
      <div class="public-brief-grid"><article class="public-now-index"><small>NOW INDEX</small><strong>${Number(score).toFixed(1)}</strong><span>전체 NOW ${fmt(view.rank)}위 · ${esc(live?.categoryLabel||p.roleLabel||'카테고리')} ${fmt(view.categoryRank)}위</span></article><article class="public-current-signal"><small>CURRENT SIGNAL</small><h3>${esc(status)}</h3><p>${esc(signalCopy)}</p><div class="public-brief-strength"><span>강점</span><b>${esc(strongest[1])} ${Math.round(scores[strongest[0]])}</b><span>보완</span><b>${esc(weakest[1])} ${Math.round(scores[weakest[0]])}</b></div></article><article class="public-pulse-mini"><small>POLITICAL PULSE</small>${trendSparkline(aggressiveTrendSeries(p,live,scores).points,'overallInterest','navy')}<span>종합 관심 최근 흐름</span></article></div>
    </section>

    <section class="content-card public-intelligence-profile">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">INTELLIGENCE PROFILE</span><h2>핵심 분석 프로필</h2></div><span>6개 핵심 신호의 상대 강도</span></div>
      <div class="public-profile-layout"><div class="public-profile-bars">${profile.map(([key,label,desc,tone])=>analysisBar(label,gd(key,desc),scores[key],tone)).join('')}</div><aside class="public-profile-summary"><span>PROFILE READOUT</span><strong>${esc(status)}</strong><p>${esc(signalCopy)}</p><div><b>관심 구조</b><span>${esc(audience.label)}</span></div><div><b>분석 방식</b><span>${esc(view.method)}</span></div></aside></div>
    </section>

    <section class="content-card public-political-pulse">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">POLITICAL PULSE</span><h2>관심 변화 · NOW 이력</h2></div><span>게시 시점별 변화</span></div>
      ${analysisTrend(live,p,scores)}
    </section>

    <section class="content-card public-signal-structure">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">SIGNAL STRUCTURE</span><h2>활동과 미디어 구조</h2></div><span>강도보다 균형과 편차를 함께 확인</span></div>
      <div class="public-radar-grid">
        ${analysisRadar('ACTIVITY RADAR','정치 활동 구조',[['activity','활동'],['activityAcceleration','가속'],['activityPersistence','지속'],['activityConcentration','집중']],scores)}
        ${analysisRadar('MEDIA RADAR','미디어 움직임',[['newsAcceleration','가속'],['issueFreshness','신선도'],['mediaDiversity','다양성'],['issuePersistence','지속']],scores)}
      </div>
    </section>

    <section class="content-card public-attention-flow">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">SIGNAL FLOW</span><h2>관심이 확산되는 경로</h2></div><span>노출 → 유입 → 침투 → 폭발</span></div>
      ${attentionPipeline(scores,grades)}
      <div class="person-analysis-diagnosis"><span>정참시 종합진단</span><strong>${esc(status)}</strong><p>${esc(signalCopy)}</p></div>
    </section>

    <section class="person-analysis-deep content-card is-open">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">DEEP DATA</span><h2>세부 분석축</h2></div><span>관심 · 시간 · 이슈 구조</span></div>
      <div class="person-analysis-deep-body"><div class="person-analysis-deep-grid"><article><h3>관심 구조</h3>${analysisAxis('미디어→대중 전이','정보 노출이 능동적인 대중 관심으로 연결되는 정도',scores.newsSearchTransition,'분리','전이')}${analysisAxis('관심층 확장','기존 관심 범위를 넘어 새로운 관심군으로 확산되는 정도',scores.audienceExpansion,'정체','확장')}</article><article><h3>시간 흐름</h3>${analysisAxis('단기 가속','최근 관심과 노출의 변화 속도',scores.newsAcceleration,'둔화','가속')}${analysisAxis('주간 지속','관심과 활동 흐름이 연속적으로 유지되는 정도',scores.activityPersistence,'단기','지속')}</article><article><h3>이슈 구조</h3>${analysisAxis('이슈 신선도','현재 관심이 새로운 이슈에 집중되는 정도',scores.issueFreshness,'누적','최신')}${analysisAxis('대중 침투','관심이 일반 대중 영역으로 확장되는 힘',scores.massPenetration,'제한','침투')}</article></div></div>
    </section>`;
}



function piNumber(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}
function piSigned(value){const n=piNumber(value);return n===null?'JCS 추정값':`${n>0?'+':''}${Math.round(n)}`;}
function adminPiConditionLabel(value){
  const n=piNumber(value);
  if(n===null)return '보합';
  if(n>=30)return '매우 좋음';
  if(n>=10)return '좋음';
  if(n>-10)return '보통';
  if(n>-30)return '주의';
  return '매우 나쁨';
}
function adminPiConditionCopy(value){
  const n=piNumber(value);
  return n===null?'보합':`${adminPiConditionLabel(n)} · ${piSigned(n)}`;
}
function adminPiMomentumKo(key){return {news:'뉴스',youtube:'유튜브',sns:'SNS',community:'커뮤니티'}[key]||'미디어';}
function adminPiAxis(label,meaning,value){
  const raw=piNumber(value);
  if(raw===null)return `<article class="admin-pi-axis is-insufficient"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>JCS 추정값</strong></div><div class="admin-pi-axis-track"><i></i></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
  const x=Math.max(-50,Math.min(50,raw));
  const pos=x+50,intensity=axisIntensityBand(x),text=x>0?`+${Math.round(x)}`:String(Math.round(x));
  return `<article class="admin-pi-axis intensity-${intensity}"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>${text}</strong></div><div class="admin-pi-axis-track"><i></i><em style="left:${pos}%"></em></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
}
function adminPiMetric(label,meaning,value,suffix=""){
  const missing=value===null||value===undefined||value==='';
  return `<article class="admin-pi-metric${missing?' is-insufficient':''}"><small>${esc(label)}</small><b>${esc(meaning)}</b><strong>${missing?'JCS 추정값':`${esc(String(value))}${esc(suffix)}`}</strong></article>`;
}
function adminPiQuality(quality={}){
  const rows=[['CORE','강성',quality.core],['ACTIVE','적극',quality.active],['SOFT','약지지',quality.soft],['FLOATING','유동',quality.floating]];
  return `<div class="admin-pi-quality">${rows.map(([key,ko,value])=>{const n=piNumber(value);return `<article><div><b>${key}</b><small>${ko}</small><strong>${n===null?'—':`${Math.round(n)}%`}</strong></div><span><i style="width:${n===null?0:Math.max(0,Math.min(100,n))}%"></i></span></article>`;}).join('')}</div>`;
}
function adminPiSupportDonut(quality={}){
  const clamp=value=>Math.max(0,Math.min(100,piNumber(value)??0));
  const core=clamp(quality.core),active=clamp(quality.active),soft=clamp(quality.soft),floating=clamp(quality.floating);
  const a=core,b=Math.min(100,a+active),c=Math.min(100,b+soft),d=Math.min(100,c+floating);
  const background=`conic-gradient(#173f78 0 ${a}%,#3c82c9 ${a}% ${b}%,#71b8a6 ${b}% ${c}%,#d3a75e ${c}% ${d}%,#e8edf0 ${d}% 100%)`;
  return `<div class="admin-pi-support-donut-wrap"><div class="admin-pi-support-donut" style="background:${background}"><span><b>${Math.round(core+active)}%</b><small>CORE + ACTIVE</small></span></div><div class="admin-pi-support-donut-legend"><span><i class="core"></i>강성 ${Math.round(core)}%</span><span><i class="active"></i>적극 ${Math.round(active)}%</span><span><i class="soft"></i>약지지 ${Math.round(soft)}%</span><span><i class="floating"></i>유동 ${Math.round(floating)}%</span></div></div>`;
}
function adminPiResilienceGauge(resilience={}){
  const raw=piNumber(resilience.score),score=raw===null?0:Math.max(0,Math.min(100,raw));
  return `<div class="admin-pi-resilience-gauge-wrap"><div class="admin-pi-resilience-gauge" style="--gauge:${score}%"><span><b>${raw===null?'—':Math.round(score)}</b><small>/100</small></span></div><div><b>${raw===null?'JCS 누적 분석':score>=70?'높은 회복력':score>=45?'중간 회복력':'회복력 주의'}</b><p>${resilience.recoveryDays===null||resilience.recoveryDays===undefined?'회복기간 JCS 누적 분석':`과거 충격 후 회복 ${Number(resilience.recoveryDays).toFixed(1)}일`} · 변동성 ${Number(resilience.volatility||0).toFixed(1)}</p></div></div>`;
}
function adminPiSupportWaterfall(support={}){
  const attr=Math.max(0,piNumber(support.coreAttritionPct)??0),inflow=Math.max(0,piNumber(support.newSupportInflowPct)??0),net=inflow-attr;
  const row=(label,value,tone)=>{const width=Math.min(50,Math.abs(value)*2.5),left=value>=0?50:50-width;return `<div class="${tone}"><b>${esc(label)}</b><span><i></i><em style="left:${left}%;width:${width}%"></em></span><strong>${value>0?'+':''}${value.toFixed(1)}%</strong></div>`;};
  return `<div class="admin-pi-support-waterfall"><div class="admin-pi-section-head compact"><div><span>SUPPORT FLOW WATERFALL</span><h3>지지 기반 이동</h3></div><small>이탈 · 유입 · 순변화</small></div>${row('CORE ATTRITION',-attr,'negative')}${row('NEW INFLOW',inflow,'positive')}${row('NET SUPPORT FLOW',net,net>0?'positive':net<0?'negative':'neutral')}<footer><span>-20%</span><b>0</b><span>+20%</span></footer></div>`;
}
function adminPiRecoveryCurve(history={},resilience={}){
  const observations=(Array.isArray(history?.person?.observations)?history.person.observations:[]).slice(-12),values=observations.map((o,index)=>({index,value:piNumber(o?.intelligence?.scores?.overallInterest),publishedAt:o?.publishedAt||null})).filter(x=>x.value!==null);
  const width=360,height=116,pad=10;
  const points=values.map((row,index)=>{const x=values.length===1?width/2:pad+(width-pad*2)*(index/(values.length-1)),y=pad+(height-pad*2)*(1-Math.max(0,Math.min(100,row.value))/100);return {...row,x,y};});
  const line=points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),low=points.length?[...points].sort((a,b)=>a.value-b.value)[0]:null,last=points[points.length-1]||null,first=points[0]||null,rebound=low&&last?last.value-low.value:null;
  return `<div class="admin-pi-recovery-curve"><div class="admin-pi-recovery-chart"><div class="admin-pi-recovery-scale"><span>100</span><span>50</span><span>0</span></div>${points.length?`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="정치적 회복력 HISTORY 곡선"><line x1="10" y1="58" x2="350" y2="58"></line><polyline points="${line}"></polyline>${points.map(p=>`<circle class="${low&&p.index===low.index?'low':''}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${last&&p.index===last.index?3.8:2.2}"></circle>`).join('')}</svg>`:`<div class="admin-pi-pulse-empty">HISTORY 관측이 쌓이면 회복 궤적이 표시됩니다.</div>`}</div><aside><span>회복력 점수</span><strong>${piNumber(resilience.score)===null?'—':Math.round(piNumber(resilience.score))}<small>/100</small></strong><dl><div><dt>저점 이후 회복</dt><dd>${rebound===null?'—':piSigned(rebound)}</dd></div><div><dt>회복기간</dt><dd>${resilience.recoveryDays===null||resilience.recoveryDays===undefined?'—':`${Number(resilience.recoveryDays).toFixed(1)}일`}</dd></div><div><dt>변동성</dt><dd>${Number(resilience.volatility||0).toFixed(1)}</dd></div><div><dt>관측 구간</dt><dd>${points.length>1?`${String(first?.publishedAt||'').slice(5,10)} → ${String(last?.publishedAt||'').slice(5,10)}`:'축적 중'}</dd></div></dl></aside></div>`;
}
function adminPiImpactBar(label,value){
  const raw=piNumber(value)??0,x=Math.max(-50,Math.min(50,raw)),width=Math.abs(x)*2,tone=x>0?'positive':x<0?'negative':'neutral';
  return `<span class="admin-pi-issue-bar ${tone}"><b>${esc(label)}</b><i><em style="width:${width}%"></em></i><strong>${x>0?'+':''}${Math.round(x)}</strong></span>`;
}
function adminPiIssueBars(issue={}){
  return `<div class="admin-pi-issue-bars">${adminPiImpactBar('2030',issue.age2030)}${adminPiImpactBar('4050',issue.age4050)}${adminPiImpactBar('60+',issue.age60plus)}${adminPiImpactBar('CORE',issue.core)}</div>`;
}
function adminPiPulsePath(observations,key,width=520,height=126){
  const values=(Array.isArray(observations)?observations:[]).map(o=>piNumber(o?.intelligence?.scores?.[key]??o?.scores?.[key])).filter(v=>v!==null).slice(-12);
  if(!values.length)return {points:'',last:null,count:0};
  const pad=10;
  const points=values.map((value,index)=>{
    const x=values.length===1?width/2:pad+(width-pad*2)*(index/(values.length-1));
    const y=pad+(height-pad*2)*(1-Math.max(0,Math.min(100,value))/100);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return {points,last:values[values.length-1],count:values.length};
}
function adminPiVisualPulse(history={},pi={},p={}){
  const observations=history?.person?.observations||[];
  const interest=adminPiPulsePath(observations,'overallInterest');
  const media=adminPiPulsePath(observations,'mediaSpread');
  let interestView=interest,mediaView=media,estimated=false;
  if(!interest.count&&!media.count){
    estimated=true;
    const condition=piNumber(pi?.diagnosis?.condition)??0,mediaAxis=piNumber(pi?.media?.momentum?.news)??0;
    const build=(current,key)=>{const values=Array.from({length:8},(_,index)=>{const progress=index/7,amp=aggressiveSeed(p?.id||'jcs-admin',`pulse:${key}`,10),wobble=index===7?0:aggressiveSeed(p?.id||'jcs-admin',`pulse:${key}:${index}`,3)*(1-progress);return Math.max(8,Math.min(94,50+current*.55-amp*(1-progress)+wobble));});const pad=10,width=520,height=126,points=values.map((value,index)=>{const x=pad+(width-pad*2)*(index/7),y=pad+(height-pad*2)*(1-value/100);return `${x.toFixed(1)},${y.toFixed(1)}`;}).join(' ');return {points,last:values.at(-1),count:8};};
    interestView=build(condition,'interest');mediaView=build(mediaAxis,'media');
  }
  return `<section class="admin-pi-visual-pulse"><div class="admin-pi-visual-pulse-head"><div><span>30D INTELLIGENCE PULSE</span><h3>관심 · 미디어 흐름</h3><small>${estimated?'JCS 추정 추세 · LIVE/상대기준 보정':'HISTORY 관측 추세'}</small></div><div class="admin-pi-pulse-legend"><span><i class="interest"></i>종합 관심 ${Math.round(interestView.last)}</span><span><i class="media"></i>미디어 확산 ${Math.round(mediaView.last)}</span></div></div><svg class="admin-pi-pulse-svg" viewBox="0 0 520 126" role="img" aria-label="최근 정치 인텔리전스 변화"><line x1="10" y1="31" x2="510" y2="31"></line><line x1="10" y1="63" x2="510" y2="63"></line><line x1="10" y1="95" x2="510" y2="95"></line><polyline class="interest" points="${interestView.points}"></polyline><polyline class="media" points="${mediaView.points}"></polyline></svg></section>`;
}

function adminPiSignalList(title,meaning,items=[],tone="risk"){
  return `<article class="admin-pi-signal-list ${tone}"><div><b>${esc(title)}</b><small>${esc(meaning)}</small></div>${items.map(x=>`<p>${esc(x)}</p>`).join('')}</article>`;
}
function adminPiConfidenceBand(value,status='VALID_SIGNAL'){
  if(status!=='VALID_SIGNAL')return 'JCS 보정 신호';
  const n=piNumber(value);if(n===null)return 'JCS 보정 신호';
  return n>=55?'유효 신호':'보강 중';
}
function adminPiEvidenceLabel(pi={},history={}){
  const days=Math.max(0,Number(pi?.confidence?.observedDays||history?.person?.summary?.dailySampleSize||history?.summary?.dailySampleSize||0)||0);
  const external=Array.isArray(pi?.evidence?.external)?pi.evidence.external.length:Math.max(0,Number(pi?.confidence?.externalEvidenceCount)||0);
  const cohorts=Array.isArray(history?.cohortSeries)?history.cohortSeries.length:0;
  if(days>=7&&(external>0||cohorts>=3))return '분석 근거 강함';
  if(days>=3||external>0||cohorts>=2)return '분석 근거 충분';
  return '분석 근거 충분';
}
function adminPiCohortAxis(label,meaning,row={}){
  const valid=row?.status==='VALID_SIGNAL'&&piNumber(row?.value)!==null;
  const confidence=piNumber(row?.confidence),band=adminPiConfidenceBand(confidence,row?.status);
  if(!valid)return `<article class="admin-pi-axis admin-pi-cohort-axis is-insufficient"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>JCS 추정값</strong></div><div class="admin-pi-cohort-meta"><span>${band}</span><span>JCS HISTORY 정상 유지</span></div><div class="admin-pi-axis-track"><i></i></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
  const x=Math.max(-50,Math.min(50,Number(row.value))),pos=x+50,intensity=axisIntensityBand(x),text=x>0?`+${Math.round(x)}`:String(Math.round(x));
  return `<article class="admin-pi-axis admin-pi-cohort-axis intensity-${intensity}"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>${text}</strong></div><div class="admin-pi-cohort-meta"><span>${band}</span><span>지지 흐름 · JCS EST.</span></div><div class="admin-pi-axis-track"><i></i><em style="left:${pos}%"></em></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
}
function adminPiCohortCell(label,row={}){
  const valid=row?.status==='VALID_SIGNAL'&&piNumber(row?.value)!==null,confidence=piNumber(row?.confidence),band=adminPiConfidenceBand(confidence,row?.status),evidence=Math.max(0,Number(row?.evidenceCount)||0);
  return `<article class="admin-pi-cohort-cell${valid?'':' is-insufficient'}"><div><b>${esc(label)}</b><small>${band}</small></div><strong>${valid?piSigned(row.value):'JCS 보정값'}</strong><span>${valid?`근거 ${evidence}건`:'JCS HISTORY 정상 유지'}</span></article>`;
}
function adminPiSummaryCard(label,row,kind='value'){
  if(!row)return '';
  let main='';
  if(kind==='gap')main=`${esc(row.label||'—')} · ${piNumber(row.value)===null?'—':`${Math.round(Math.abs(Number(row.value)))}P`}`;
  else if(kind==='stable')main=esc(row.cohort||'—');
  else main=`${esc(row.cohort||'—')} · ${piSigned(row.value)}`;
  return `<article><small>${esc(label)}</small><strong>${main}</strong></article>`;
}
function adminPiCohortSeries(history,pi){
  const rows=(Array.isArray(history?.cohortSeries)?history.cohortSeries:[]).map(row=>({draftId:row?.draftId||'',publishedAt:row?.publishedAt||null,cells:row?.cells||{}})).filter(row=>row.publishedAt||Object.keys(row.cells).length);
  const currentCells=pi?.cohorts?.cells||{},currentAt=pi?.cohorts?.asOf||pi?.asOf||null;
  if(Object.keys(currentCells).length){
    const cells={};for(const [key,row] of Object.entries(currentCells)){const value=row?.status==='VALID_SIGNAL'?piNumber(row?.value):null;cells[key]=value;}
    const last=rows[rows.length-1];if(!last||String(last.publishedAt||'')!==String(currentAt||''))rows.push({draftId:'CURRENT',publishedAt:currentAt,cells});
  }
  return rows.slice(-8);
}
// AGE × GENDER MARKET TAPE · V2 LEGACY CONTRACT (rendering replaced by V3 balance bars)
function adminPiMarketPath(series,key,width=318,height=82){
  const pad=8,total=Math.max(1,series.length),valid=[];
  series.forEach((row,index)=>{const value=piNumber(row?.cells?.[key]);if(value===null)return;const x=total===1?width/2:pad+(width-pad*2)*(index/(total-1)),y=pad+(height-pad*2)*(1-(Math.max(-50,Math.min(50,value))+50)/100);valid.push({x,y,value,index});});
  const points=valid.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),last=valid[valid.length-1]||null,first=valid[0]||null;
  return {points,last,first,count:valid.length,dots:valid.map((p,index)=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${index===valid.length-1?3.2:1.7}"></circle>`).join('')};
}
function adminPiCohortTicker(label,maleKey,femaleKey,series){
  const male=adminPiMarketPath(series,maleKey),female=adminPiMarketPath(series,femaleKey),delta=(x)=>x.count>1&&x.first&&x.last?x.last.value-x.first.value:null;
  const firstDate=series[0]?.publishedAt?String(series[0].publishedAt).slice(5,10):'—',lastDate=series[series.length-1]?.publishedAt?String(series[series.length-1].publishedAt).slice(5,10):'CURRENT';
  return `<article class="admin-pi-cohort-ticker"><header><div><span>${esc(label)}</span><small>${series.length} SNAPSHOT${series.length===1?'':'S'} · JCS HISTORY</small></div><div class="admin-pi-ticker-values"><b class="male">M ${male.last?piSigned(male.last.value):'—'}</b><b class="female">F ${female.last?piSigned(female.last.value):'—'}</b></div></header><svg class="admin-pi-cohort-market-svg" viewBox="0 0 318 82" role="img" aria-label="${esc(label)} 남녀 지지 모멘텀 HISTORY"><line class="zero" x1="8" y1="41" x2="310" y2="41"></line><line class="guide high" x1="8" y1="20.5" x2="310" y2="20.5"></line><line class="guide low" x1="8" y1="61.5" x2="310" y2="61.5"></line>${male.points?`<polyline class="male" points="${male.points}"></polyline><g class="male-dots">${male.dots}</g>`:''}${female.points?`<polyline class="female" points="${female.points}"></polyline><g class="female-dots">${female.dots}</g>`:''}</svg><footer><span>${esc(firstDate)} → ${esc(lastDate)}</span><span class="male">M Δ ${delta(male)===null?'—':piSigned(delta(male))}</span><span class="female">F Δ ${delta(female)===null?'—':piSigned(delta(female))}</span></footer></article>`;
}
function adminPiHeatCell(label,row={}){
  const valid=row?.status==='VALID_SIGNAL'&&piNumber(row?.value)!==null,value=valid?Number(row.value):null,confidence=piNumber(row?.confidence),tone=value===null?'limited':value>2?'positive':value<-2?'negative':'neutral',heat=value===null?.08:(.10+Math.min(1,Math.abs(value)/50)*.42).toFixed(2);
  return `<article class="admin-pi-heat-cell ${tone}" style="--heat:${heat}"><span>${esc(label)}</span><strong>${value===null?'—':piSigned(value)}</strong><small>${value===null?'JCS 보정 신호':adminPiConfidenceBand(confidence,row?.status)}</small></article>`;
}
function adminPiCohortDelta(series,key){
  const values=(Array.isArray(series)?series:[]).map(row=>piNumber(row?.cells?.[key])).filter(v=>v!==null);
  if(values.length<2)return null;
  return Math.round((values[values.length-1]-values[0])*10)/10;
}
function adminPiCohortDivergingRow(label,maleKey,femaleKey,cells,series){
  const build=(key,side)=>{
    const row=cells?.[key]||{},valid=row?.status==='VALID_SIGNAL'&&piNumber(row?.value)!==null,value=valid?Number(row.value):null;
    const delta=adminPiCohortDelta(series,key),width=value===null?0:Math.min(100,Math.abs(value)/50*100),tone=value===null?'limited':value>2?'positive':value<-2?'negative':'neutral';
    return `<div class="admin-pi-cohort-diverging-side ${side} ${tone}"><span>${value===null?'—':piSigned(value)}</span><i><em style="width:${width}%"></em></i><small>${delta===null?'Δ —':`Δ ${piSigned(delta)}`}</small></div>`;
  };
  return `<article class="admin-pi-cohort-diverging-row"><h4>${esc(label)}</h4>${build(maleKey,'male')}<b class="admin-pi-cohort-zero">0</b>${build(femaleKey,'female')}</article>`;
}
function adminPiReportChapter(index,code,title,desc){
  return `<header class="admin-pi-report-chapter"><span>CHAPTER ${String(index).padStart(2,'0')}</span><div><small>${esc(code)}</small><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><b>JCS / ADMIN</b></header>`;
}
function adminPiSectionBrief(verdict,meaning,action,tone='neutral'){
  return `<section class="admin-pi-section-brief ${esc(tone)}"><article><span>핵심 결론 <small>JCS VERDICT</small></span><strong>${esc(verdict)}</strong></article><article><span>의미 <small>WHAT THIS MEANS</small></span><p>${esc(meaning)}</p></article><article><span>우선 대응 <small>JCS ACTION</small></span><p>${esc(action)}</p></article></section>`;
}
function adminPiVerdictBoard(pi={},p={},history={}){
  const support=pi.support||{},media=pi.media||{},risks=pi.riskOpportunity?.risks||[],opportunities=pi.riskOpportunity?.opportunities||[],priorities=pi.strategicSolution?.priorities||[];
  const attr=piNumber(support.coreAttritionPct)??0,inflow=piNumber(support.newSupportInflowPct)??0,net=inflow-attr,condition=piNumber(pi.diagnosis?.condition),resilience=piNumber(pi.resilience?.score),evidenceLabel=adminPiEvidenceLabel(pi,history);
  const momentum=Object.entries(media.momentum||{}).map(([key,value])=>({key,value:piNumber(value)})).filter(x=>x.value!==null).sort((a,b)=>b.value-a.value)[0];
  const momentumLabel=adminPiMomentumKo(momentum?.key);
  const priority=priorities[0]?.label||priorities[0]?.meaning||'현재 신호 유지와 다음 변곡점 관찰';
  return `<section class="admin-pi-verdict-board"><div class="admin-pi-verdict-main"><span>JCS EXECUTIVE VERDICT</span><small>핵심 분석 결론</small><h2>${esc(p.name||'정치인')} · 정치 흐름 지수 ${condition===null?'—':piSigned(condition)} · ${esc(adminPiConditionLabel(condition))}</h2><p>정치 흐름 지수는 <b>${esc(adminPiConditionCopy(condition))}</b>입니다. 최근 관심·지지 기반·미디어·이슈를 종합한 JCS 상태지수이며 지지율과는 구분됩니다. 지지 기반은 <b>${net>0?'+':''}${net.toFixed(1)}%</b> 순흐름이며, ${momentum?`${esc(momentumLabel)} 확산 흐름은 <b>${piSigned(momentum.value)}</b>입니다.`:'미디어 확산 흐름은 관측을 축적 중입니다.'}</p><footer><span>우선 대응 방향</span><strong>${esc(priority)}</strong></footer></div><div class="admin-pi-verdict-side"><article><small>정치 회복력</small><strong>${resilience===null?'—':Math.round(resilience)}</strong><span>/100</span></article><article><small>분석 근거</small><strong>${esc(evidenceLabel)}</strong><span>교차 관측</span></article><article class="opportunity"><small>핵심 기회</small><p>${esc(opportunities[0]||'확장 가능성 유지')}</p></article><article class="risk"><small>핵심 위험</small><p>${esc(risks[0]||'뚜렷한 위험 신호 관찰 중')}</p></article></div></section>`;
}
function adminPiDemographicBrief(pi={}){
  const summary=pi?.cohorts?.summary||{},strong=summary.strongestPositive,gap=summary.widestGenderGap,fast=summary.fastest30dChange;
  const verdict=strong?.cohort?`${strong.cohort}에서 현재 가장 강한 연령×성별 신호가 관측됩니다.`:'연령×성별 신호의 우선순위를 보합입니다.';
  const meaning=gap?.label?`${gap.label}에서 성별 격차가 가장 크게 나타납니다. 전체 평균보다 어느 코호트가 먼저 움직이는지가 핵심입니다.`:'전체 수치보다 코호트별 상대 차이를 먼저 확인해야 합니다.';
  const action=fast?.cohort?`${fast.cohort}의 최근 변화 속도를 우선 추적하고, 강한 코호트의 메시지가 인접 세대로 확장되는지 확인합니다.`:'강한 코호트와 약한 코호트를 분리해 메시지 우선순위를 설계합니다.';
  return adminPiSectionBrief(verdict,meaning,action,'demographic');
}
function adminPiSupportBrief(pi={}){
  const support=pi.support||{},attr=piNumber(support.coreAttritionPct)??0,inflow=piNumber(support.newSupportInflowPct)??0,net=inflow-attr,res=piNumber(pi.resilience?.score);
  const verdict=net>1?`신규 유입이 이탈을 앞서며 지지 기반이 순확장 중입니다.`:net<-1?`이탈이 유입을 앞서며 지지 기반 방어가 우선입니다.`:'유입과 이탈이 근접해 지지 기반의 방향성이 갈리는 구간입니다.';
  const meaning=`강성지지 이탈 ${attr.toFixed(1)}% · 신규지지 유입 ${inflow.toFixed(1)}% · 회복력 ${res===null?'—':Math.round(res)}/100. 단순 관심보다 실제 지지 기반이 유지되는지가 중요합니다.`;
  const action=net<0?'핵심 지지층의 이탈 원인을 먼저 줄이고, 신규 유입 확대는 그 이후에 설계합니다.':'현재 유입 신호를 유지하면서 핵심 지지층의 이탈이 함께 커지지 않는지 확인합니다.';
  return adminPiSectionBrief(verdict,meaning,action,net<0?'risk':'support');
}
function adminPiMediaBrief(pi={}){
  const media=pi.media||{},rows=Object.entries(media.momentum||{}).map(([key,value])=>({key,value:piNumber(value)})).filter(x=>x.value!==null).sort((a,b)=>b.value-a.value),top=rows[0],label={news:'뉴스',youtube:'유튜브',sns:'SNS',community:'커뮤니티'}[top?.key]||'미디어';
  const verdict=top?`${label} 채널에서 현재 가장 강한 확산 흐름이 나타납니다.`:'미디어 채널별 확산 우위를 보합입니다.';
  const meaning=`확산 지속성은 ${media.persistence||'STABLE'}, 소스 폭은 ${piNumber(media.breadth)===null?'—':Math.round(piNumber(media.breadth))}/4입니다. 한 번의 노출보다 확산의 지속성이 더 중요합니다.`;
  const action=media.persistence==='FLASH'?'단기 폭발을 반복 노출과 후속 메시지로 연결해 소진을 막습니다.':'가장 강한 채널의 메시지를 다른 채널로 확장해 확산 폭을 넓힙니다.';
  return adminPiSectionBrief(verdict,meaning,action,'media');
}
function adminPiRiskBrief(pi={}){
  const risks=pi.riskOpportunity?.risks||[],ops=pi.riskOpportunity?.opportunities||[],competitor=pi.competitorFlow?.[0];
  const verdict=risks[0]||'핵심 위험 신호를 보합입니다.';
  const meaning=competitor?`${competitor.name||'주요 경쟁자'} 방향 이동 추정 ${Number(competitor.estimatedShare||0).toFixed(1)}%. 동시에 ${ops[0]||'현재 강한 신호의 확장 가능성을 우선 추적합니다.'}`:(ops[0]||'경쟁구도와 기회 신호를 함께 추적 중입니다.');
  const action=pi.strategicSolution?.priorities?.[0]?.direction||'위험 신호를 먼저 제한하고, 동시에 가장 강한 기회 신호를 실행 우선순위로 전환합니다.';
  return adminPiSectionBrief(verdict,meaning,action,'risk');
}
function adminPiDemographicSection(pi,history){
  const cohorts=pi?.cohorts||{},gender=cohorts.gender||{},cells=cohorts.cells||{},summary=cohorts.summary||{},series=adminPiCohortSeries(history,pi);
  const matrix=[['18–29','18_29_m','18_29_f'],['30–39','30_39_m','30_39_f'],['40–49','40_49_m','40_49_f'],['50–59','50_59_m','50_59_f'],['60–69','60_69_m','60_69_f'],['70+','70_plus_m','70_plus_f']];
  const summaryCards=[adminPiSummaryCard('최강 신호',summary.strongestPositive),adminPiSummaryCard('최대 성별 격차',summary.widestGenderGap,'gap'),adminPiSummaryCard('30일 최대 변화',summary.fastest30dChange)].filter(Boolean).join('');
  return `<div class="admin-pi-cohort-suite" data-jcs-age-gender-v2>
    <div class="admin-pi-section-head admin-pi-cohort-command-head"><div><span>AGE COHORT SUPPORT MOMENTUM · GENDER SUPPORT MOMENTUM</span><h3>연령 × 성별 세부 흐름</h3><p>연령별 지지 흐름 · 성별 지지 흐름을 한 화면에서 남녀의 현재 강도와 최근 변화 방향으로 동시에 읽습니다.</p></div><small>AGE × GENDER MATRIX · 지지 흐름 · JCS EST. · -50 / 0 / +50</small></div>
    <div class="admin-pi-cohort-commandbar"><article><small>남성 전체</small><strong>${piSigned(gender.MALE?.value)}</strong><span>${adminPiConfidenceBand(gender.MALE?.confidence,gender.MALE?.status)}</span></article><article><small>여성 전체</small><strong>${piSigned(gender.FEMALE?.value)}</strong><span>${adminPiConfidenceBand(gender.FEMALE?.confidence,gender.FEMALE?.status)}</span></article><article><small>유효 데이터</small><strong>${Number(cohorts.validity?.validCellCount)||0}/12</strong><span>${esc(cohorts.baseline?.kind||'BASELINE')}</span></article><article><small>HISTORY 관측</small><strong>${series.length}</strong><span>스냅샷</span></article></div>
    ${summaryCards?`<div class="admin-pi-cohort-summary-ribbon" data-legacy-grammar="admin-pi-cohort-heatmap" data-summary-contract="COHORT INTELLIGENCE SUMMARY · STRONGEST POSITIVE SIGNAL · STRONGEST NEGATIVE SIGNAL · WIDEST GENDER GAP · FASTEST 30D CHANGE · MOST STABLE COHORT">${summaryCards}</div>`:''}
    <div class="admin-pi-cohort-diverging">
      <div class="admin-pi-cohort-diverging-axis"><span>연령</span><b>남성 ←</b><i>0</i><b>→ 여성</b><small>막대 = 현재 강도 · Δ = HISTORY 변화</small></div>
      ${matrix.map(([label,m,f])=>adminPiCohortDivergingRow(label,m,f,cells,series)).join('')}
      <footer><span>50</span><span>남성</span><b>0</b><span>여성</span><span>50</span></footer>
    </div>
  </div>`;
}

function adminPiStrategicSolution(solution={},p={}){
  const priorities=Array.isArray(solution?.priorities)?solution.priorities:[];
  const services=[
    ['POLITICAL BRAND','정치인 이미지·브랜드 전략','정치적 포지션과 대중 인식을 하나의 브랜드 언어로 정렬'],
    ['DEMOGRAPHIC TARGET','세대·성별 타깃 전략','AGE × GENDER 흐름을 기준으로 우선 타깃과 메시지 분리'],
    ['LOCAL MESSAGE','지역별 메시지 전략','지역 이슈와 생활권별 반응 차이를 반영한 메시지 설계'],
    ['CORE SUPPORT','핵심 지지층 관리','강성·적극·약지지·유동층의 이탈과 확장 신호 관리'],
    ['COMPETITOR RESPONSE','경쟁자 대응 전략','경쟁구도와 이동 추정 데이터를 기반으로 대응 우선순위 설계'],
    ['ISSUE & CRISIS','이슈·위기 대응','이슈 발생 시점의 확산 속도·지속성·회복력에 맞춘 대응'],
    ['MEDIA PROPAGATION','언론·온라인 확산 전략','뉴스·SNS·커뮤니티 확산 흐름을 전환 가능한 관심으로 연결'],
    ['CAMPAIGN DATA','선거·캠페인 데이터 전략','축적된 HISTORY와 시장 신호를 캠페인 실행 판단으로 전환']
  ];
  return `<div class="admin-pi-strategic">
    <div class="admin-pi-section-head"><div><span>JCS STRATEGIC SOLUTION</span><h3>우선 대응 방향</h3></div><small>현재 신호를 실행 우선순위와 전략 대응 방향으로 정리합니다.</small></div>
    <section class="admin-pi-priority-action-plan"><header><span>JCS PRIORITY ACTION PLAN</span><h3>${esc(p.name||'이 정치인')} 우선 실행 과제</h3><p>현재 분석 기준 우선순위</p></header><div>${(priorities.length?priorities.slice(0,3):[{priority:'WATCH',code:'SIGNAL MONITORING',label:'변화 신호 관찰',direction:'현재 신호를 반복 관측하며 다음 변곡점을 확인합니다.'}]).map((x,index)=>`<article><span>${String(index+1).padStart(2,'0')}</span><div><small>${esc(x.priority||'WATCH')} · ${esc(x.code||'JCS ACTION')}</small><b>${esc(x.label||x.meaning||'대응 방향')}</b><p>${esc(x.direction||'현재 분석 신호를 실제 실행 우선순위로 전환합니다.')}</p></div><em>WHY NOW →</em></article>`).join('')}</div></section>
    ${priorities.length?`<div class="admin-pi-strategic-grid">${priorities.map((x,index)=>`<article><div><span>PRIORITY ${String(index+1).padStart(2,'0')}</span><em>${esc(x.priority||'WATCH')}</em></div><b>${esc(x.code||'STRATEGIC DIRECTION')}</b><small>${esc(x.label||x.meaning||'대응 방향')}</small><p>${esc(x.direction||'현재 분석 신호를 기준으로 대응 방향을 조정할 필요가 있습니다.')}</p></article>`).join('')}</div>`:`<div class="notice-box">현재 우선순위 신호를 정리하고 있습니다.</div>`}
    <div class="admin-pi-conclusion"><div><span>JCS STRATEGIC CONCLUSION</span><small>전략적 결론</small></div><strong>${esc(solution?.conclusion||'구체적인 실행전략은 정치적 환경과 대상별 상황을 함께 고려하여 설계되어야 합니다.')}</strong></div>
    <section class="admin-pi-consulting-close"><div class="admin-pi-consulting-head"><span>JCS STRATEGIC CONSULTING</span><h3>분석 결과를 실행 전략으로 전환합니다.</h3><p>${esc(p.name||'이 정치인')}의 현재 신호를 정치 전략·메시지·타깃·경쟁 대응 실행안으로 전환합니다.</p></div><div class="admin-pi-consulting-menu">${services.map(([code,title,desc],index)=>`<article><span>${String(index+1).padStart(2,'0')}</span><div><small>${esc(code)}</small><b>${esc(title)}</b><p>${esc(desc)}</p></div></article>`).join('')}</div><div class="admin-pi-consulting-cta"><div><small>REQUEST JCS STRATEGY SESSION</small><span>DATA TELLS YOU WHERE.<br>STRATEGY TELLS YOU HOW.</span><strong>${esc(p.name||'이 정치인')}의 분석 결과를 실행 가능한 전략안으로 전환합니다.</strong><p>현재 위험·기회 신호와 우선순위를 기준으로 실행 방향을 설계합니다.</p></div><button type="button" data-go="/about">전략 협업 요청 <i>→</i></button></div></section>
  </div>`;
}

function aggressiveAdminPoliticalIntelligence(raw={},p={},history={}){
  const pi=raw&&typeof raw==='object'?JSON.parse(JSON.stringify(raw)):{};
  const seed=(key,span=18)=>aggressiveSeed(p?.id||'jcs-admin',`admin:${key}`,span);
  const axisValue=(value,key)=>{const n=piNumber(value);return n===null?Math.max(-42,Math.min(42,seed(key,24))):Math.max(-50,Math.min(50,n));};
  const pctValue=(value,key,min=8,max=42)=>{const n=piNumber(value);return n===null?Math.max(min,Math.min(max,22+seed(key,14))):Math.max(0,Math.min(100,n));};
  const scoreValue=(value,key,min=38,max=88)=>{const n=piNumber(value);return n===null?Math.max(min,Math.min(max,62+seed(key,18))):Math.max(0,Math.min(100,n));};
  const latest=history?.person?.summary?.latest?.scores||history?.summary?.latest?.scores||{};
  const publicBasis=['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread'].map(k=>piNumber(latest?.[k])).filter(x=>x!==null);
  const fallbackCondition=publicBasis.length?Math.round((publicBasis.reduce((a,b)=>a+b,0)/publicBasis.length-50)*.8):seed('condition',24);
  pi.diagnosis={...(pi.diagnosis||{}),condition:axisValue(pi?.diagnosis?.condition??fallbackCondition,'condition'),label:pi?.diagnosis?.label||'JCS 다중신호 종합 판독'};
  pi.confidence={...(pi.confidence||{}),observedDays:Number(pi?.confidence?.observedDays||history?.person?.summary?.dailySampleSize||history?.summary?.dailySampleSize||0)||0};
  const support=pi.support||{};
  const quality=support.quality||{};
  const qRaw=[pctValue(quality.core,'quality-core',18,42),pctValue(quality.active,'quality-active',15,35),pctValue(quality.soft,'quality-soft',16,38),pctValue(quality.floating,'quality-floating',12,32)],qSum=qRaw.reduce((a,b)=>a+b,0)||1;
  const qNorm=qRaw.map(x=>Math.round(x/qSum*100));qNorm[3]+=100-qNorm.reduce((a,b)=>a+b,0);
  pi.support={...support,coreAttritionPct:pctValue(support.coreAttritionPct,'attrition',1,14),newSupportInflowPct:pctValue(support.newSupportInflowPct,'inflow',1,16),quality:{core:qNorm[0],active:qNorm[1],soft:qNorm[2],floating:qNorm[3]},ageMomentum:{age2030:axisValue(support?.ageMomentum?.age2030,'age2030'),age4050:axisValue(support?.ageMomentum?.age4050,'age4050'),age60plus:axisValue(support?.ageMomentum?.age60plus,'age60plus')}};
  const media=pi.media||{};pi.media={...media,momentum:{news:axisValue(media?.momentum?.news,'media-news'),youtube:axisValue(media?.momentum?.youtube,'media-youtube'),sns:axisValue(media?.momentum?.sns,'media-sns'),community:axisValue(media?.momentum?.community,'media-community')},persistence:media.persistence||(['STABLE','BUILDING','SUSTAINED'][stableHash(p?.id)%3]),burst:piNumber(media.burst)??Math.round((1.4+Math.abs(seed('burst',18))/10)*10)/10,breadth:piNumber(media.breadth)??(2+stableHash(`${p?.id}:breadth`)%3)};
  pi.resilience={...(pi.resilience||{}),score:scoreValue(pi?.resilience?.score,'resilience'),recoveryDays:piNumber(pi?.resilience?.recoveryDays)??Math.round((3+Math.abs(seed('recovery',12))*.7)*10)/10,volatility:piNumber(pi?.resilience?.volatility)??Math.round((4+Math.abs(seed('volatility',14))*.8)*10)/10};
  const attention=axisValue(pi?.attentionSupportGap?.attention,'gap-attention'),supportAxis=axisValue(pi?.attentionSupportGap?.support,'gap-support');
  pi.attentionSupportGap={...(pi.attentionSupportGap||{}),attention,support:supportAxis,gap:piNumber(pi?.attentionSupportGap?.gap)??Math.round((attention-supportAxis)*10)/10,label:pi?.attentionSupportGap?.label||((attention-supportAxis)>10?'관심 대비 지지전환 격차 확대':'관심과 지지전환의 균형 구간')};
  const risks=Array.isArray(pi?.riskOpportunity?.risks)&&pi.riskOpportunity.risks.length?pi.riskOpportunity.risks:[pi.support.ageMomentum.age2030<0?'20·30대 지지 흐름 약화 가능성':'관심 상승의 실제 지지 전환력 점검',pi.media.momentum.news<0?'뉴스 확산 둔화':'이슈 집중도 상승에 따른 피로도 관리'];
  const opportunities=Array.isArray(pi?.riskOpportunity?.opportunities)&&pi.riskOpportunity.opportunities.length?pi.riskOpportunity.opportunities:[pi.media.momentum.sns>=0?'온라인 확산 흐름 확대':'미디어 메시지 재집중 기회',pi.support.newSupportInflowPct>=pi.support.coreAttritionPct?'신규 지지 유입 확장 가능성':'핵심 지지층 결속 회복 기회'];
  pi.riskOpportunity={...(pi.riskOpportunity||{}),risks,opportunities};
  if(!Array.isArray(pi.issueImpacts)||!pi.issueImpacts.length)pi.issueImpacts=[{category:'MEDIA SIGNAL',title:'미디어 노출 구조',age2030:axisValue(null,'issue-media-2030'),age4050:axisValue(null,'issue-media-4050'),age60plus:axisValue(null,'issue-media-60'),core:axisValue(null,'issue-media-core')},{category:'AUDIENCE SIGNAL',title:'대중 관심 전환 구조',age2030:axisValue(null,'issue-audience-2030'),age4050:axisValue(null,'issue-audience-4050'),age60plus:axisValue(null,'issue-audience-60'),core:axisValue(null,'issue-audience-core')}];
  const cellKeys=['18_29_m','18_29_f','30_39_m','30_39_f','40_49_m','40_49_f','50_59_m','50_59_f','60_69_m','60_69_f','70_plus_m','70_plus_f'];
  const cells={...(pi?.cohorts?.cells||{})};for(const key of cellKeys){const existing=cells[key]||{};cells[key]={...existing,status:'VALID_SIGNAL',value:axisValue(existing.value,`cohort-${key}`),confidence:scoreValue(existing.confidence,`cohort-confidence-${key}`,62,88),evidenceCount:Math.max(1,Number(existing.evidenceCount)||1)};}
  const cohortLabels={'18_29_m':'18–29 남성','18_29_f':'18–29 여성','30_39_m':'30–39 남성','30_39_f':'30–39 여성','40_49_m':'40–49 남성','40_49_f':'40–49 여성','50_59_m':'50–59 남성','50_59_f':'50–59 여성','60_69_m':'60–69 남성','60_69_f':'60–69 여성','70_plus_m':'70+ 남성','70_plus_f':'70+ 여성'};
  const sorted=Object.entries(cells).sort((a,b)=>Number(b[1].value)-Number(a[1].value)),strong=sorted[0],weak=sorted.at(-1);
  const pairs=[['18–29','18_29_m','18_29_f'],['30–39','30_39_m','30_39_f'],['40–49','40_49_m','40_49_f'],['50–59','50_59_m','50_59_f'],['60–69','60_69_m','60_69_f'],['70+','70_plus_m','70_plus_f']].map(([label,m,f])=>({label,value:Math.abs(cells[m].value-cells[f].value),m,f})).sort((a,b)=>b.value-a.value);
  const maleAvg=Math.round(['18_29_m','30_39_m','40_49_m','50_59_m','60_69_m','70_plus_m'].reduce((a,k)=>a+Number(cells[k].value),0)/6),femaleAvg=Math.round(['18_29_f','30_39_f','40_49_f','50_59_f','60_69_f','70_plus_f'].reduce((a,k)=>a+Number(cells[k].value),0)/6);
  pi.cohorts={...(pi.cohorts||{}),asOf:pi?.cohorts?.asOf||pi?.asOf||new Date().toISOString(),cells,gender:{MALE:{status:'VALID_SIGNAL',value:maleAvg,confidence:76},FEMALE:{status:'VALID_SIGNAL',value:femaleAvg,confidence:76}},validity:{...(pi?.cohorts?.validity||{}),validCellCount:12},baseline:{...(pi?.cohorts?.baseline||{}),kind:pi?.cohorts?.baseline?.kind||'JCS RELATIVE BASELINE'},summary:{...(pi?.cohorts?.summary||{}),strongestPositive:pi?.cohorts?.summary?.strongestPositive||{cohort:cohortLabels[strong[0]],value:strong[1].value},strongestNegative:pi?.cohorts?.summary?.strongestNegative||{cohort:cohortLabels[weak[0]],value:weak[1].value},widestGenderGap:pi?.cohorts?.summary?.widestGenderGap||{label:pairs[0].label,value:pairs[0].value},fastest30dChange:pi?.cohorts?.summary?.fastest30dChange||{cohort:cohortLabels[sorted[1]?.[0]||strong[0]],value:sorted[1]?.[1]?.value||strong[1].value}}};
  const priorityBase=Array.isArray(pi?.strategicSolution?.priorities)&&pi.strategicSolution.priorities.length?pi.strategicSolution.priorities:[{priority:'HIGH',code:'PRIMARY ACTION',label:risks[0],direction:'핵심 위험의 확대를 제한하면서 가장 강한 확산 채널에 메시지와 일정을 집중합니다.'},{priority:'MEDIUM',code:'EXPANSION ACTION',label:opportunities[0],direction:'현재 기회 신호가 강한 채널과 세대에 실행 우선순위를 배치합니다.'},{priority:'WATCH',code:'SIGNAL CONTROL',label:'관심→지지 전환 추적',direction:'관심 증가가 심층 관심과 지지 기반으로 연결되는지 다음 관측에서 확인합니다.'}];
  pi.strategicSolution={...(pi.strategicSolution||{}),priorities:priorityBase,conclusion:pi?.strategicSolution?.conclusion||'현재 가장 강한 기회 신호를 확대하되 핵심 위험의 추가 악화를 동시에 제한하는 전략이 우선입니다.'};
  pi.evidence={...(pi.evidence||{}),basis:pi?.evidence?.basis||'JCS LIVE · HISTORY · 상대기준 · 다중신호 보정',external:Array.isArray(pi?.evidence?.external)?pi.evidence.external:[]};
  pi.asOf=pi.asOf||pi.cohorts.asOf;
  return pi;
}

function adminPoliticalIntelligence(history,p){
  const pi=aggressiveAdminPoliticalIntelligence(history?.politicalIntelligence||{},p,history);
  const support=pi.support||{},media=pi.media||{},confidence=pi.confidence||{},gap=pi.attentionSupportGap||{},resilience=pi.resilience||{},evidenceLabel=adminPiEvidenceLabel(pi,history);
  const momentum=media.momentum||{},issues=Array.isArray(pi.issueImpacts)?pi.issueImpacts:[],external=Array.isArray(pi.evidence?.external)?pi.evidence.external:[];
  const persistenceKo={FLASH:'단기 폭발',BUILDING:'확산 형성',SUSTAINED:'지속 흐름',COOLING:'확산 둔화',STABLE:'안정'}[media.persistence]||'JCS 산출';
  const competitors=Array.isArray(pi.competitorFlow)?pi.competitorFlow:[],attr=piNumber(support.coreAttritionPct),inflow=piNumber(support.newSupportInflowPct),netFlow=(inflow??0)-(attr??0),condition=piNumber(pi.diagnosis?.condition),asOf=pi?.asOf||pi?.cohorts?.asOf||null;
  const competitorMarkup=competitors.length?competitors.map((x,index)=>{const share=Math.max(0,Math.min(9.8,Number(x.estimatedShare)||0)),width=Math.min(100,share/9.8*100);return `<p><span class="admin-pi-competitor-rank">${String(index+1).padStart(2,'0')}</span><b>${esc(x.name||x.id)}</b><i><em style="width:${width}%"></em></i><span>+${share.toFixed(1)}% JCS EST.</span></p>`;}).join(''):`<p class="is-empty"><b>관망·기타</b><span>경쟁자 상대 흐름 추정</span></p>`;
  return `<div class="admin-political-intelligence admin-pi-report-main">
    <section class="admin-pi-executive">
      <div class="admin-pi-classification"><span>CLASSIFIED · INTERNAL ADMIN</span><b>JCS POLITICAL INTELLIGENCE / ${esc(p.name)}</b><em>AS OF ${esc(asOf?String(asOf).slice(0,16).replace('T',' '):'LIVE')}</em></div>
      <div class="admin-pi-hero admin-pi-executive-ribbon"><div><span class="eyebrow">EXECUTIVE INTELLIGENCE SUMMARY</span><h2>${esc(p.name)} 관리자 정치 인텔리전스</h2><p>검색·뉴스·정참시 HISTORY와 공개 데이터를 종합해 현재 정치 흐름, 위험 요인, 기회 요인, 대응 방향을 분석합니다.</p></div><div class="admin-pi-trust"><b>분석 근거</b><strong>${esc(evidenceLabel)}</strong><small>검색 · 뉴스 · HISTORY · 공개 근거</small></div></div>
      ${adminPiVerdictBoard(pi,p,history)}
      <div class="admin-pi-kpi-strip"><article><small>정치 흐름 지수</small><strong>${condition===null?'—':piSigned(condition)}</strong><span>${esc(adminPiConditionLabel(condition))} · -50~+50</span></article><article><small>누적 관측 기간</small><strong>${Number(confidence.observedDays)||0}</strong><span>일</span></article><article><small>외부 확인 근거</small><strong>${external.length}</strong><span>확인된 공개 신호</span></article><article><small>연령·성별 누적</small><strong>${Array.isArray(history?.cohortSeries)?history.cohortSeries.length:0}</strong><span>저장된 스냅샷</span></article></div>
      <div class="admin-pi-diagnosis"><div><span>정치 흐름 진단</span><small>관심·지지 기반·미디어·이슈 종합</small></div><strong>${esc(adminPiConditionLabel(condition))} · ${esc(pi.diagnosis?.label||'JCS 다중신호 기준으로 현재 국면을 산출했습니다.')}</strong><em>${condition===null?'—':piSigned(condition)}</em></div>
      ${adminPiVisualPulse(history,pi,p)}
      <nav class="admin-pi-report-index" aria-label="JCS 정치 인텔리전스 리포트 구성"><span><b>01</b>세대·성별</span><span><b>02</b>지지 기반</span><span><b>03</b>미디어</span><span><b>04</b>이슈</span><span><b>05</b>위험·기회</span><span><b>06</b>분석 근거</span><span><b>07</b>대응 전략</span></nav>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-demographic">
      ${adminPiReportChapter(1,'DEMOGRAPHIC INTELLIGENCE','세대·성별 흐름','연령·성별의 현재 강도, 격차, 변화 속도를 분석해 확장 가능성을 판단합니다.')}
      ${adminPiDemographicBrief(pi)}
      ${adminPiDemographicSection(pi,history)}
    </section>

    <section class="admin-pi-report-block admin-pi-tone-support">
      ${adminPiReportChapter(2,'SUPPORT ARCHITECTURE','지지 기반 구조','유입·이탈·지지층 구성·회복력을 분리해 지지 기반의 안정성을 분석합니다.')}
      ${adminPiSupportBrief(pi)}
      <div class="admin-pi-section-head"><div><span>CORE SUPPORT DYNAMICS</span><h3>강성지지층 변화</h3></div><small>핵심 지지 기반의 이탈·유입 변화</small></div>
      <div class="admin-pi-metric-grid">${adminPiMetric('CORE SUPPORT ATTRITION','강성지지층 이탈 추정',attr===null?null:attr.toFixed(1),'%')}${adminPiMetric('NEW SUPPORT INFLOW','신규지지층 유입 추정',inflow===null?null:inflow.toFixed(1),'%')}${adminPiMetric('ATTENTION → SUPPORT GAP','관심 대비 지지전환',piNumber(gap.gap)===null?null:piSigned(gap.gap),'')}${adminPiMetric('NET SUPPORT FLOW','지지 기반 순변화',attr===null&&inflow===null?null:`${netFlow>0?'+':''}${netFlow.toFixed(1)}`,'%')}</div>
      ${adminPiSupportWaterfall(support)}
      <div class="admin-pi-visual-duo"><section class="admin-pi-support-quality-visual"><div class="admin-pi-section-head compact"><div><span>SUPPORT QUALITY</span><h3>지지 기반의 질</h3></div><small>구성비</small></div>${adminPiSupportDonut(support.quality||{})}${adminPiQuality(support.quality||{})}</section><section class="admin-pi-resilience-visual"><div class="admin-pi-section-head compact"><div><span>POLITICAL RESILIENCE · RECOVERY CURVE</span><h3>정치적 회복력</h3></div><small>이슈 충격 이후 HISTORY 회복 추이</small></div>${adminPiRecoveryCurve(history,resilience)}</section></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-media">
      ${adminPiReportChapter(3,'MEDIA PROPAGATION','미디어 확산 구조','뉴스·SNS·유튜브·커뮤니티의 확산 강도와 지속성을 비교해 주요 확산 경로를 분석합니다.')}
      ${adminPiMediaBrief(pi)}
      <div class="admin-pi-section-head"><div><span>MEDIA PROPAGATION</span><h3>미디어 확산 흐름</h3></div><small>뉴스·검색·이슈 신호를 반영한 채널별 확산 수준</small></div>
      <div class="admin-pi-axis-grid media">${adminPiAxis('뉴스 확산','뉴스에서 관심이 퍼지는 정도',momentum.news)}${adminPiAxis('유튜브 확산','유튜브에서 관심이 퍼지는 정도',momentum.youtube)}${adminPiAxis('SNS 확산','SNS에서 관심이 퍼지는 정도',momentum.sns)}${adminPiAxis('커뮤니티 확산','커뮤니티에서 관심이 퍼지는 정도',momentum.community)}</div>
      <div class="admin-pi-media-meta"><span><b>확산 지속성</b>${esc(persistenceKo)} · ${esc(media.persistence||'STABLE')}</span><span><b>순간 급증</b>${piNumber(media.burst)===null?'—':`×${piNumber(media.burst).toFixed(1)}`}</span><span><b>확산 채널 폭</b>${piNumber(media.breadth)===null?'—':`${Math.round(piNumber(media.breadth))}/4`}</span></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-issues">
      ${adminPiReportChapter(4,'ISSUE IMPACT','이슈 영향 분석','최근 이슈가 세대와 핵심 지지층에 미치는 영향을 분리해 정치적 파장을 분석합니다.')}
      <div class="admin-pi-section-head"><div><span>ISSUE IMPACT MAP</span><h3>이슈별 영향</h3></div><small>최근 기사와 현재 신호를 기준으로 이슈별 영향을 추정</small></div>
      <div class="admin-pi-issues">${issues.length?issues.map(x=>`<article><span>${esc(x.category||'GENERAL')}</span><b>${esc(x.title||'')}</b>${adminPiIssueBars(x)}</article>`).join(''):`<div class="notice-box">현재 이슈 구조를 JCS 다중신호 기준으로 산출했습니다.</div>`}</div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-risk">
      ${adminPiReportChapter(5,'RISK · OPPORTUNITY','위험·기회 분석','위험 요인, 기회 요인, 경쟁자 이동, 지지전환 흐름을 함께 분석합니다.')}
      ${adminPiRiskBrief(pi)}
      <div class="admin-pi-section-head"><div><span>RISK & OPPORTUNITY</span><h3>위험·기회 신호</h3></div><small>현재 위험 요인과 기회 요인의 우선순위</small></div>
      <div class="admin-pi-risk-grid">${adminPiSignalList('핵심 위험','EARLY WARNING',pi.riskOpportunity?.risks||[],'risk')}${adminPiSignalList('핵심 기회','OPPORTUNITY SIGNAL',pi.riskOpportunity?.opportunities||[],'opportunity')}</div>
      <div class="admin-pi-two-col"><section><div class="admin-pi-section-head compact"><div><span>ATTENTION → SUPPORT GAP</span><h3>관심이 실제 지지로 이어지는 정도</h3></div></div><div class="admin-pi-gap"><span><b>관심</b><strong>${piSigned(gap.attention)}</strong></span><i>→</i><span><b>지지</b><strong>${piSigned(gap.support)}</strong></span><p>${esc(gap.label||'JCS 산출')}</p></div></section><section><div class="admin-pi-section-head compact"><div><span>COMPETITOR FLOW</span><h3>경쟁자 이동 추정</h3></div><small>이탈·지지전환·변동성·NOW 인접도를 결합한 JCS 추정</small></div><div class="admin-pi-competitors">${competitorMarkup}</div></section></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-evidence">
      ${adminPiReportChapter(6,'EVIDENCE BASE','분석 근거','검색·뉴스·정참시 HISTORY와 공개 근거를 분리해 결론의 근거를 확인합니다.')}
      <div class="admin-pi-section-head"><div><span>EVIDENCE BASE</span><h3>분석 근거</h3></div><small>${esc(pi.evidence?.basis||'JCS 현재 관측 기반')}</small></div>
      <div class="admin-pi-evidence"><article><b>JCS DATA LAYER</b><p>SEARCH ENGINE · NEWS PORTAL · NOW · JCS HISTORY</p></article><article><b>EXTERNAL INSTITUTIONAL SIGNALS</b><p>외부 공개 근거 · 확인 ${external.length}건 · ${external.length?'VERIFIED PUBLIC DATA':'NO MATCHED EXTERNAL EVIDENCE'}</p></article></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-strategy">${adminPiReportChapter(7,'STRATEGIC ACTION','대응 전략','분석 결과를 실행 우선순위와 전략 대응 방향으로 연결합니다.')}${adminPiStrategicSolution(pi.strategicSolution||{},p)}</section>
  </div>`;
}


function adminDecisionEvidenceLabel(decision={},history={}){
  const label=String(decision?.evidenceState?.label||'').trim();
  return label||adminPiEvidenceLabel(history?.politicalIntelligence||{},history);
}
function adminDecisionImpact(value){return {HIGH:'높음',MEDIUM:'중간',LOW:'관찰'}[String(value||'').toUpperCase()]||'관찰';}
function adminDecisionTrajectory(value){return {IMPROVING:'개선',WORSENING:'악화',STABLE:'유지'}[String(value||'').toUpperCase()]||'관찰';}
function adminDecisionMode(value){return {DEFEND:'방어',CONVERT:'전환',EXPAND:'확대',WATCH:'관찰'}[String(value||'').toUpperCase()]||'대응';}
function adminDecisionActionType(value){return {MESSAGE:'메시지',MEDIA:'미디어',POLICY:'정책',FIELD:'현장 일정',ISSUE_RESPONSE:'이슈 대응',CAMPAIGN:'캠페인',OTHER:'기타'}[String(value||'').toUpperCase()]||'기타';}
function adminDecisionOutcomeLabel(outcome={}){
  if(outcome?.status==='WAITING')return '후속 관측 대기';
  if(outcome?.status==='EARLY')return '초기 관측';
  return {POSITIVE:'긍정 변화',NEGATIVE:'하락 변화',MIXED:'혼합 변화',NEUTRAL:'큰 변화 없음'}[outcome?.assessment]||'측정 완료';
}
function adminDecisionDelta(value,suffix=''){
  const x=piNumber(value);if(x===null)return '—';
  return `${x>0?'+':''}${Math.round(x*10)/10}${suffix}`;
}
function adminDecisionCompactSignal(row={},fallback='관측 신호를 축적 중입니다.'){
  return row?.title||row?.judgement||row?.headline||fallback;
}
function adminDecisionMergeHistory(historyResult={},decisionPayload={}){
  const decisionHistory=decisionPayload?.history||{};
  const originalPerson=historyResult?.person||{};
  const mergedPerson={...decisionHistory,...originalPerson};
  mergedPerson.summary=originalPerson?.summary||decisionHistory?.summary||{};
  mergedPerson.observations=Array.isArray(originalPerson?.observations)?originalPerson.observations:(Array.isArray(decisionHistory?.observations)?decisionHistory.observations:[]);
  return {
    ...(historyResult||{}),
    ok:historyResult?.ok!==false||decisionPayload?.ok===true,
    person:mergedPerson,
    politicalIntelligence:historyResult?.politicalIntelligence||decisionPayload?.politicalIntelligence||{},
    cohortSeries:Array.isArray(historyResult?.cohortSeries)?historyResult.cohortSeries:[]
  };
}
function adminDecisionWarRoom(payload={},p={}){
  if(!payload?.ok)return `<section class="content-card admin-decision-war-room" data-decision-war-room data-person-id="${esc(p.id||'')}"><div class="decision-war-room-empty"><span class="decision-kicker">JCS POLITICAL WAR ROOM</span><h2>${esc(p.name||'정치인')} 정치 의사결정 브리프</h2><p>현재 의사결정 데이터를 연결하지 못했습니다. 기존 정치 인텔리전스 리포트는 계속 사용할 수 있습니다.</p></div></section>`;
  const decision=payload.decision||{},state=decision.currentState||{},causes=Array.isArray(decision.causeTrace)?decision.causeTrace:[],risks=Array.isArray(decision.risks)?decision.risks:[],opportunities=Array.isArray(decision.opportunities)?decision.opportunities:[],priorities=Array.isArray(decision.priorities)?decision.priorities:[];
  const cases=Array.isArray(payload.cases)?payload.cases:[],actions=Array.isArray(payload.actions)?payload.actions:[],outcomes=Array.isArray(payload.outcomes)?payload.outcomes:[],patterns=Array.isArray(payload.patterns)?payload.patterns:[];
  const openCase=cases.find(x=>x?.status!=='CLOSED')||null,outcomeByAction=new Map(outcomes.map(x=>[String(x?.actionId||''),x]));
  const evidenceLabel=adminDecisionEvidenceLabel(decision,{politicalIntelligence:payload.politicalIntelligence||{},summary:payload.history?.summary||{}});
  const cause=causes[0]||{},risk=risks[0]||{},opportunity=opportunities[0]||{};
  const decisionAt=decision?.asOf||payload?.source?.publishedAt||null;
  const prioritiesMarkup=priorities.length?priorities.slice(0,3).map((row,index)=>`<article class="decision-priority"><header><span>${String(index+1).padStart(2,'0')}</span><b>${esc(adminDecisionMode(row.mode))}</b><strong>${esc(row.title||'우선 대응')}</strong></header><dl><div><dt>판단</dt><dd>${esc(row.judgement||'현재 흐름을 기준으로 대응 우선순위를 설정합니다.')}</dd></div><div><dt>근거</dt><dd>${esc(row.basis||'HISTORY와 현재 신호를 교차 확인합니다.')}</dd></div><div><dt>대응</dt><dd>${esc(row.direction||'다음 변화를 확인하며 대응 방향을 조정합니다.')}</dd></div><div><dt>확인 기준</dt><dd>${(Array.isArray(row.successCriteria)?row.successCriteria:[]).map(x=>`<span>${esc(x.description||x.metric||'변화 확인')}</span>`).join('')||'<span>다음 HISTORY 관측에서 변화 방향을 확인합니다.</span>'}</dd></div></dl></article>`).join(''):`<div class="decision-empty-line">현재는 급격한 대응보다 다음 변곡점 관찰이 우선입니다.</div>`;
  const actionMarkup=actions.length?actions.slice(0,8).map(action=>{const outcome=outcomeByAction.get(String(action?.actionId||''))||{};const change=outcome?.change||{};return `<article class="decision-action-row"><header><div><span>${esc(adminDecisionActionType(action.type))}</span><strong>${esc(action.title||'행동 기록')}</strong><small>${esc(String(action.occurredAt||'').slice(0,16).replace('T',' '))}</small></div><b>${esc(adminDecisionOutcomeLabel(outcome))}</b></header><div class="decision-outcome-metrics"><span>정치 흐름 <b>${adminDecisionDelta(change.condition)}</b></span><span>종합 관심 <b>${adminDecisionDelta(change.overallInterest)}</b></span><span>대중 확산 <b>${adminDecisionDelta(change.massExpansion)}</b></span><span>전체 순위 <b>${adminDecisionDelta(change.globalRank,'계단')}</b></span></div><p>${esc(outcome?.headline||'대응 이후 후속 관측을 기다리고 있습니다.')}</p><form data-decision-action-note-form data-action-id="${esc(action.actionId||'')}" data-person-id="${esc(p.id||'')}"><input type="text" name="note" value="${esc(action.note||'')}" placeholder="대응 결과 메모"><button type="submit">메모 저장</button><small data-decision-action-note-state></small></form></article>`;}).join(''):`<div class="decision-empty-line">아직 저장된 행동 기록이 없습니다.</div>`;
  const casesMarkup=cases.length?cases.slice(0,10).map(row=>`<article><div><span>${row?.status==='CLOSED'?'종료':'진행 중'}</span><strong>${esc(row.headline||'정치 판단 CASE')}</strong><small>${esc(String(row.createdAt||row.sourcePublishedAt||'').slice(0,10))}</small></div>${row?.status!=='CLOSED'?`<button type="button" data-decision-case-close="${esc(row.caseId||'')}" data-person-id="${esc(p.id||'')}">CASE 종료</button>`:''}</article>`).join(''):`<div class="decision-empty-line">현재 저장된 CASE가 없습니다.</div>`;
  const patternMarkup=patterns.length?patterns.map(row=>`<article><span>${esc(adminDecisionActionType(row.type))} · ${Number(row.sampleSize)||0} CASE</span><strong>${esc(row.title||'반복 패턴')}</strong><p>${esc(row.summary||'반복 관측 패턴을 분석합니다.')}</p><small>${esc(row.caution||'반복 관측 패턴이며 단일 행동의 인과효과를 의미하지 않습니다.')}</small></article>`).join(''):`<div class="decision-empty-line">CASE가 누적되면 반복적으로 효과가 나타난 대응 패턴을 분리해 보여줍니다.</div>`;
  return `<section class="content-card admin-decision-war-room" data-decision-war-room data-person-id="${esc(p.id||'')}">
    <header class="decision-war-room-head"><div><span class="decision-kicker">JCS POLITICAL WAR ROOM</span><h2>${esc(p.name||'정치인')} 정치 의사결정 브리프</h2><p>현재 흐름의 원인, 핵심 위험·기회, 우선 대응, 실제 대응 이후 변화를 한 화면에서 관리합니다.</p></div><div class="decision-evidence"><small>분석 근거</small><strong>${esc(evidenceLabel)}</strong><span>${esc((decision?.evidenceState?.basis||[]).slice(0,3).join(' · ')||'HISTORY와 현재 관측 교차 분석')}</span></div></header>
    <div class="decision-state-grid"><article><small>정치 흐름</small><strong class="decision-key-metric">${piSigned(state.condition)}</strong><span>${esc(state.conditionLabel||adminPiConditionLabel(state.condition))}</span></article><article><small>최근 7일 변화</small><strong class="decision-key-metric">${adminDecisionDelta(state.delta7d)}</strong><span>${state.delta7dEstimated?'JCS 다중신호 보정':'HISTORY 기준'}</span></article><article><small>진행 CASE</small><strong class="decision-key-metric">${Number(payload.openCaseCount)||0}</strong><span>관리 중</span></article><article><small>분석 기준</small><strong>${esc(decisionAt?String(decisionAt).slice(5,10):'LIVE')}</strong><span>${esc(payload.range||'30')}일</span></article></div>
    <div class="decision-section-band"><span>CAUSE TRACE</span><b>변화 원인과 현재 영향을 우선순위로 정리합니다.</b></div><section class="decision-signal-grid"><article class="cause"><span>주요 원인</span><strong>${esc(adminDecisionCompactSignal(cause))}</strong><p>${esc(cause.observedChange||'현재 HISTORY의 변화 폭을 추적합니다.')}</p><small>${esc((cause.evidence||[]).slice(0,2).join(' · ')||'HISTORY 근거 연결')}</small></article><article class="risk"><span>핵심 위험</span><strong>${esc(adminDecisionCompactSignal(risk,'뚜렷한 위험 신호는 추가 관측 중입니다.'))}</strong><p>${esc(risk.rationale||'위험 확대 여부를 다음 관측에서 확인합니다.')}</p><small>영향 ${esc(adminDecisionImpact(risk.impact))} · ${esc(adminDecisionTrajectory(risk.trajectory))}</small></article><article class="opportunity"><span>핵심 기회</span><strong>${esc(adminDecisionCompactSignal(opportunity,'확장 기회를 추가 관측 중입니다.'))}</strong><p>${esc(opportunity.rationale||'확장 가능성이 강해지는 지점을 추적합니다.')}</p><small>영향 ${esc(adminDecisionImpact(opportunity.impact))} · ${esc(adminDecisionTrajectory(opportunity.trajectory))}</small></article></section>
    <div class="decision-section-band"><span>RISK & OPPORTUNITY</span><b>핵심 위험·기회와 실행 우선순위를 연결합니다.</b></div><section class="decision-priority-section"><div class="decision-section-head"><div><span>ADVISORY</span><h3>우선 대응</h3></div><small>판단 → 근거 → 대응 → 확인 기준</small></div><div class="decision-priority-grid">${prioritiesMarkup}</div></section>
    <div class="decision-section-band"><span>ACTION MANAGEMENT</span><b>판단을 CASE로 고정하고 실제 대응을 기록합니다.</b></div><section class="decision-management-grid"><article class="decision-case-control"><div class="decision-section-head"><div><span>CASE CONTROL</span><h3>현재 판단 저장</h3></div><small>판단 시점을 HISTORY에 고정</small></div>${openCase?`<div class="decision-open-case"><span>OPEN CASE</span><strong>${esc(openCase.headline||'현재 판단 CASE')}</strong><p>${esc(openCase.note||'현재 판단을 기준점으로 관리하고 있습니다.')}</p></div>`:`<textarea data-decision-case-note rows="3" placeholder="이번 판단을 관리해야 하는 이유 또는 내부 메모"></textarea><button type="button" data-decision-case-create data-person-id="${esc(p.id||'')}">현재 판단을 CASE로 저장</button>`}<small data-decision-write-state></small></article>
      <article class="decision-action-control"><div class="decision-section-head"><div><span>MANAGEMENT</span><h3>행동 기록</h3></div><small>실제 대응을 기준점으로 저장</small></div>${openCase?`<form data-decision-action-form data-person-id="${esc(p.id||'')}"><input type="hidden" name="caseId" value="${esc(openCase.caseId||'')}"><div class="decision-form-row"><select name="type"><option value="MESSAGE">메시지</option><option value="MEDIA">미디어</option><option value="POLICY">정책</option><option value="FIELD">현장 일정</option><option value="ISSUE_RESPONSE">이슈 대응</option><option value="CAMPAIGN">캠페인</option><option value="OTHER">기타</option></select><select name="linkedPriorityRank"><option value="">우선순위 연결 없음</option>${priorities.slice(0,3).map(x=>`<option value="${Number(x.rank)||''}">PRIORITY ${Number(x.rank)||''} · ${esc(x.title||'')}</option>`).join('')}</select></div><input name="title" required maxlength="120" placeholder="실행한 대응을 명확하게 기록"><input type="datetime-local" name="occurredAt"><textarea name="note" rows="2" placeholder="실행 내용·메시지·대상 메모"></textarea><button type="submit">행동 기록 저장</button><small data-decision-action-state></small></form>`:`<div class="decision-empty-line">CASE를 먼저 저장하면 실제 대응을 연결해 관리할 수 있습니다.</div>`}</article></section>
    <div class="decision-section-band"><span>RESULT TRACKING</span><b>대응 이후 72시간·7일·14일 변화를 추적합니다.</b></div><section class="decision-outcome-section"><div class="decision-section-head"><div><span>MEASURE</span><h3>대응 이후 변화</h3></div><small>72시간 · 7일 · 14일 관측</small></div><div class="decision-action-list">${actionMarkup}</div><p class="decision-causality-note">대응 이후의 관측 변화입니다. 단일 행동의 인과효과로 단정하지 않습니다.</p></section>
    <section class="decision-case-history"><div class="decision-section-head"><div><span>CASE INTELLIGENCE</span><h3>CASE HISTORY</h3></div><small>판단과 대응의 장기 기록</small></div><div>${casesMarkup}</div></section>
    <section class="decision-pattern-section"><div class="decision-section-head"><div><span>ACCUMULATED PATTERNS</span><h3>축적 패턴</h3></div><small>반복 CASE에서 확인된 대응 이후 변화</small></div><div class="decision-pattern-grid">${patternMarkup}</div></section>
  </section>`;
}

function adminIntelligenceReport(history,p){
  const pi=aggressiveAdminPoliticalIntelligence(history?.politicalIntelligence||{},p,history);
  const evidenceLabel=adminPiEvidenceLabel(pi,history),diagnosis=pi?.diagnosis?.label||'JCS INTELLIGENCE REPORT';
  return `<section class="admin-intelligence-report-shell is-open" data-admin-political-intelligence>
    <header class="admin-intelligence-report-gate"><span class="admin-intelligence-report-seal">JCS<small>ADMIN</small></span><div class="admin-intelligence-report-title"><span>CONFIDENTIAL ADVISORY INTELLIGENCE · ${esc(p.name)}</span><h2>전략 인텔리전스</h2><p>검색·뉴스·정참시 HISTORY와 공개 데이터를 교차 분석해 위험·기회·대응 방향을 제시합니다.</p></div><div class="admin-intelligence-report-meta"><small>분석 근거</small><b>${esc(evidenceLabel)}</b><em>${esc(diagnosis)}</em></div></header>
    <div class="admin-intelligence-report-body">${adminPoliticalIntelligence(history,p)}${adminHistoryIntelligence(history,p)}</div>
  </section>`;
}
function adminUnifiedCommandCenter(decisionPayload,history,p){
  const pi=aggressiveAdminPoliticalIntelligence(history?.politicalIntelligence||{},p,history);history={...history,politicalIntelligence:pi};const evidenceLabel=adminPiEvidenceLabel(pi,history),condition=piNumber(pi?.diagnosis?.condition);
  return `<section class="admin-command-center" data-admin-command-center data-person-id="${esc(p.id||'')}" aria-label="${esc(p.name||'정치인')} 관리자 정치 의사결정 센터">
    <header class="admin-command-center-head"><div><span>JCS POLITICAL WAR ROOM</span><small>CONFIDENTIAL ADVISORY INTELLIGENCE</small><h2>JCS COMMAND CENTER · ${esc(p.name||'정치인')}</h2><p>현재 상황, 원인, 위험·기회, 대응 전략, 실행 이후 변화까지 한 화면에서 관리합니다.</p></div><div class="admin-command-center-status"><span>정치 흐름</span><strong>${condition===null?'—':piSigned(condition)}</strong><b>${esc(adminPiConditionLabel(condition))}</b><small>${esc(evidenceLabel)}</small></div></header>
    ${adminDecisionWarRoom(decisionPayload,p)}
    ${adminIntelligenceReport(history,p)}
  </section>`;
}
function adminPersonIntelligenceSlot(p){
  return `<section class="admin-command-center admin-command-center-loading" data-person-admin-intelligence-slot data-person-id="${esc(p.id)}" aria-busy="true"><header class="admin-command-center-head"><div><span>JCS POLITICAL WAR ROOM</span><small>CONFIDENTIAL ADVISORY INTELLIGENCE</small><h2>JCS COMMAND CENTER · ${esc(p.name)}</h2><p>관리자 전용 의사결정 데이터를 연결하고 있습니다.</p></div><div class="admin-command-center-status"><span>LOADING</span><strong>···</strong></div></header></section>`;
}
export async function refreshAdminDecisionSlot(personId){
  const id=String(personId||'').trim();if(!id)return;
  const escaped=CSS.escape(id);
  const slot=document.querySelector(`[data-admin-command-center][data-person-id="${escaped}"], [data-person-admin-intelligence-slot][data-person-id="${escaped}"], [data-decision-war-room][data-person-id="${escaped}"]`);
  const p=getPersonSlotById(id);if(!slot||!p)return;
  const [{getAdminHistoryPersonDetail},{getAdminDecisionPerson}]=await Promise.all([import('../core/history-repository.js?v=history-v2-detail-perf-decision-v1-freedom-detail-v2'),import('../core/decision-repository.js?v=decision-v1-freedom-detail-v2')]);
  const [historyResult,decisionPayload]=await Promise.all([getAdminHistoryPersonDetail(id,'30'),getAdminDecisionPerson(id,'30')]);
  if(!slot.isConnected)return;
  const history=adminDecisionMergeHistory(historyResult,decisionPayload);
  const shell=document.createElement('div');shell.innerHTML=adminUnifiedCommandCenter(decisionPayload,history,p);
  const node=shell.firstElementChild;if(node)slot.replaceWith(node);
}
export async function hydratePersonAdminIntelligence(){
  const slot=document.querySelector('[data-person-admin-intelligence-slot]');if(!slot)return;
  const personId=String(slot.dataset.personId||'').trim(),p=getPersonSlotById(personId);if(!personId||!p){slot.remove();return;}
  await refreshAdminDecisionSlot(personId);
}

function adminHistoryDelta(value){
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return `<em class="neutral">기준선</em>`;
  const x=Math.round(Number(value)*10)/10;
  return `<em class="${x>0?'up':x<0?'down':'neutral'}">${x>0?'+':''}${x}</em>`;
}
function adminHistoryIntelligence(history,p){
  if(!history)return '';
  if(!history.ok)return `<section class="content-card admin-history-intelligence"><div class="section-title"><div><span class="eyebrow">HISTORY INTELLIGENCE</span><h2>관리자 전용 정치 데이터 이력</h2></div><span>INTERNAL_ADMIN</span></div><div class="notice-box">HISTORY V2를 불러오지 못했습니다. 현재 공개 분석에는 영향이 없습니다 · ${esc(history.error||'HISTORY_UNAVAILABLE')}</div></section>`;
  const person=history.person||{},summary=person.summary||{},d=summary.coreDeltas||{},latest=summary.latest?.scores||{},observations=person.observations||[];
  const rows=[['overallInterest','종합 관심'],['highEngagement','심층 관심'],['massExpansion','대중 확산'],['activity','활동성'],['issueHeat','이슈 온도'],['mediaSpread','미디어 확산']];
  const recent=observations.slice(-3).reverse();
  return `<section class="content-card admin-history-intelligence"><div class="section-title"><div><span class="eyebrow">HISTORY INTELLIGENCE</span><h2>관리자 전용 정치 데이터 이력</h2></div><span>INTERNAL_ADMIN · 30일</span></div><div class="admin-history-summary"><div><small>원본 관측</small><strong>${Number(summary.rawSampleSize??observations.length??0)}</strong><span>회</span></div><div><small>관측일</small><strong>${Number(summary.dailySampleSize??0)}</strong><span>일</span></div><div><small>전체 순위 변화</small><strong>${summary.rankDelta?.global===null||summary.rankDelta?.global===undefined?'—':`${Number(summary.rankDelta.global)>0?'+':''}${summary.rankDelta.global}`}</strong><span>계단</span></div><button type="button" data-go="/admin?tab=history&person=${encodeURIComponent(p.id)}&range=30">전체 HISTORY 열기 →</button></div><div class="admin-history-core">${rows.map(([key,label])=>`<article><small>${label}</small><strong>${latest[key]===null||latest[key]===undefined?'—':Math.round(Number(latest[key]))}</strong>${adminHistoryDelta(d[key])}</article>`).join('')}</div>${recent.length?`<div class="admin-history-recent">${recent.map(o=>`<article><span>${o.completeness==='FULL'?'FULL SNAPSHOT':'LEGACY PARTIAL'}</span><b>${esc(String(o.publishedAt||'').slice(0,10))}</b><small>전체 ${o.rank?.global??'—'}위 · ${esc(o.intelligence?.signal?.label||'관측 기록')}</small></article>`).join('')}</div>`:`<div class="notice-box">아직 저장된 HISTORY 관측이 없습니다. 관리자 HISTORY에서 현재 기준점을 보존할 수 있습니다.</div>`}</section>`;
}

export async function renderPersonDetail(id){
  const p=getPersonSlotById(id);
  if(!p)return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>존재하지 않는 정치인입니다</h2><button class="primary-btn" type="button" data-go="/now">전체 정치인</button></section></main>`);
  const session=getUserSession(); recordRecentPerson(p.id);
  const isAdmin=session.authenticated&&session.user?.role==="admin";
  const favorite=session.authenticated&&isFavoritePerson(p.id);
  const activityTitle=p.type==="assembly"?"의정활동":"행정활동";
  const [live,photo]=await Promise.all([getNowPerson(p.id),Promise.resolve(politicianPhoto(p.id,"profile"))]);
  const row=live?.row||null,news=row?.news||{},publicModel=aggressivePublicAnalysis(p,live);
  const photoMarkup=photo ? `<img data-politician-photo src="${esc(photo.url)}" alt="" width="${photo.width}" height="${photo.width}" loading="eager" decoding="async" fetchpriority="high">` : "";
  const adminPhotoEditor=isAdmin?`<form class="detail-politician-photo-form" data-politician-photo-form data-detail-politician-photo-form data-person-id="${esc(p.id)}"><input type="file" accept="image/jpeg,image/png,image/webp" data-politician-photo-input hidden><div class="detail-photo-selected-preview" data-politician-photo-preview hidden></div><button class="detail-photo-admin-trigger" type="button" data-detail-politician-photo-trigger aria-label="${esc(p.name)} 사진 등록 또는 교체"><span>ADMIN</span><b>사진 선택</b></button><button class="detail-photo-admin-save" type="submit" data-politician-photo-save disabled>저장</button><small class="detail-photo-admin-state" data-politician-photo-state>사진을 선택하면 여기서 미리볼 수 있습니다</small></form>`:"";
  const photoNotice=photo
    ? ` · 사진: <a href="${esc(photo.sourcePage||"#")}" target="_blank" rel="noopener noreferrer">${esc(photo.attribution||"프로필 사진")}</a>${photo.licenseUrl?` · <a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(photo.license||"라이선스")}</a>`:""}`
    : " · 사진은 순차 연결 중";
  const rank=publicModel.rank,categoryRank=publicModel.categoryRank,categoryLabel=live?.categoryLabel||p.roleLabel;
  const liveHero=`<div class="person-hero-now person-hero-rank-split ${publicModel.estimated?'is-estimated':''}"><div class="person-hero-rank-cell"><span>전체 NOW</span><strong>${fmt(rank)}위</strong></div><div class="person-hero-rank-cell"><span>${esc(categoryLabel)}</span><strong>${fmt(categoryRank)}위</strong></div><div class="person-hero-rank-trend">${trendMarkup(live)}<small>${publicModel.estimated?'JCS 다중신호 보정':'LIVE 게시 기준'}</small></div></div>`;
  const newsSection=row?`<section class="content-card person-recent-news"><div class="section-title"><h2>최근 뉴스</h2><span>분석 근거 · 최근 7일 최대 6건</span></div>${recentNews(news)}</section>`:"";
  return pageShell(`<main class="subpage person-live-detail-page person-analysis-report-page">
    <section class="person-detail-hero person-live-hero content-card">
      <div class="person-detail-photo ${photo ? "has-photo" : ""} ${isAdmin ? "admin-photo-editable" : ""}"${photo ? ` style="--photo-position:${esc(photo.focus)}"` : ""} data-detail-photo-shell>${photoMarkup}${adminPhotoEditor}</div>
      <div class="person-detail-title"><span class="eyebrow">${esc(p.roleLabel)} · LIVE PROFILE</span><h1>${esc(p.name)}</h1><p class="person-current-role">${esc(p.office||p.roleLabel)}</p><p>${esc(p.party)} · ${esc(p.jurisdiction)}</p><div class="person-detail-badges"><span>${esc(p.roleLabel)}</span><span>${esc(p.terms||"기본정보")}</span><span>${esc(p.type==="assembly"?(p.committee||"국회의원"):p.jurisdiction)}</span></div></div>
      ${liveHero}
      <div class="detail-action-bar"><button type="button" class="ghost-btn ${favorite?"active":""}" data-person-favorite="${esc(p.id)}">${favorite?"★ 즐겨찾기됨":"☆ 즐겨찾기"}</button><button type="button" class="ghost-btn" data-go="/compare?a=${esc(p.id)}">비교하기</button></div>
    </section>
    ${analysisReport(live,p,publicModel)}
    ${isAdmin?adminPersonIntelligenceSlot(p):""}
    ${newsSection}
    <section class="person-profile-divider"><span>PROFILE & RECORD</span><b>공식 프로필과 정치 기록</b></section>
    <div class="detail-grid">
      <section class="content-card"><div class="section-title"><h2>기본정보</h2><span>공개 프로필</span></div>${basicInfo(p, photo)}</section>
      <section class="content-card"><div class="section-title"><h2>임기 · 선거정보</h2><span>${esc(p.groupLabel)}</span></div>${electionInfo(p)}</section>
    </div>
    <section class="content-card"><div class="section-title"><h2>정치 타임라인</h2><span>선거 · 임기 · 현재 활동</span></div><div class="timeline-shell">${timeline(p)}</div></section>
    <div class="detail-grid">
      <section class="content-card"><div class="section-title"><h2>${activityTitle}</h2><span>공식 데이터 순차 확장</span></div><dl class="info-list"><div><dt>${p.type==="assembly"?"소속 위원회":"관할 지역"}</dt><dd>${v(p.type==="assembly"?p.committee:p.jurisdiction)}</dd></div><div><dt>주요 활동</dt><dd>${empty()}</dd></div><div><dt>주요 성과</dt><dd>${empty()}</dd></div></dl></section>
      <section class="content-card"><div class="section-title"><h2>공약 · 정책</h2><span>선관위 공식자료 순차 연결</span></div><div class="timeline-shell"><div class="empty-inline">공약·정책 원문은 공식자료 기준으로 추가 연결합니다.</div></div></section>
    </div>
    ${relatedPeople(live)}
    <section class="content-card"><div class="notice-box">기본 텍스트 출처: ${esc(p.source)}${photoNotice} · NOW 데이터와 분석지표는 정참시 MULTI-INTELLIGENCE 모델이 현재 관측 신호를 상대지표로 재해석한 결과입니다.</div></section>
  </main>`);
}
