import { pageShell, esc } from "./layout.js";
import { getPersonSlotById } from "../data/person-provider.js";
import { politicianPhoto } from "../data/politician-photo-index.js";
import { getNowPerson } from "../core/repository.js";
import { getUserSession, isFavoritePerson, recordRecentPerson } from "../core/user.js";
import { axisIntensityBand } from "./compare-intelligence.js?v=03686";

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
  if(!live?.row)return `<span class="person-trend neutral">데이터 대기</span>`;
  if(Number(live.rankDelta)>0)return `<span class="person-trend up">▲ ${Number(live.rankDelta)}계단</span>`;
  if(Number(live.rankDelta)<0)return `<span class="person-trend down">▼ ${Math.abs(Number(live.rankDelta))}계단</span>`;
  if(live.trendLabel==="NEW")return `<span class="person-trend new">NEW</span>`;
  return `<span class="person-trend neutral">순위 유지</span>`;
}
function scoreLabel(value){const x=Math.round(n(value));return Number.isFinite(x)?String(x):"—";}
function analysisMetric(label,desc,value,tone="mint"){
  const score=Math.max(0,Math.min(100,n(value)));
  return `<article class="person-analysis-metric ${tone}" data-analysis-metric="${esc(label)}"><div class="person-analysis-score-ring" style="--analysis-score:${score}%"><strong>${scoreLabel(value)}</strong><span>/100</span></div><div><b>${esc(label)}</b><small>${esc(desc)}</small></div></article>`;
}
function analysisBar(label,desc,value,tone="mint"){
  const score=Math.max(0,Math.min(100,n(value)));
  return `<article class="person-analysis-bar ${tone}"><div><b>${esc(label)}</b><small>${esc(desc)}</small></div><div class="person-analysis-bar-track"><i style="width:${score}%"></i></div><strong>${scoreLabel(value)}</strong></article>`;
}
function analysisAxisValue(value){
  const score=Math.max(0,Math.min(100,n(value)));
  const axis=Math.round(score-50);
  return {score,axis,label:axis>0?`+${axis}`:String(axis),intensity:axisIntensityBand(axis)};
}
function analysisAxis(label,desc,value,leftLabel,rightLabel){
  const point=analysisAxisValue(value);
  return `<article class="person-analysis-axis-metric intensity-${point.intensity}">
    <div class="person-analysis-axis-head"><b>${esc(label)}</b><strong>${point.label}</strong></div>
    <small class="person-analysis-axis-desc">${esc(desc)}</small>
    <div class="person-analysis-axis-labels"><span>${esc(leftLabel)}</span><span>${esc(rightLabel)}</span></div>
    <div class="person-analysis-axis-track"><i></i><em style="left:${point.score}%"><b class="person-analysis-axis-value">${point.label}</b></em></div>
    <div class="person-analysis-axis-scale" aria-label="${esc(label)} 상대축"><span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span></div>
  </article>`;
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
  if(!values.length)return `<span class="person-analysis-trend-empty">관측 대기</span>`;
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
  return `<div class="person-analysis-rank-history"><div><small>전체 NOW 이력</small><strong>${globalRows.length?chips(globalRows):"첫 공식 관측 대기"}</strong></div><div><small>${esc(live?.categoryLabel||"카테고리")} 이력</small><strong>${categoryRows.length?categoryChips:"다음 게시부터 누적"}</strong></div></div>`;
}
function analysisTrend(live){
  const points=(Array.isArray(live?.trend?.points)?live.trend.points:[]).slice(-12);
  const count=points.length;
  return `<div class="person-analysis-trend-shell"><div class="person-analysis-trend-head"><span>ANALYSIS TREND</span><h3>관심 변화 · NOW 이력</h3><p>공식 게시 시점마다 정참시 분석지표와 순위 변화를 관측합니다.${count?` 현재 ${count}회 관측.`:""}</p></div><div class="person-analysis-trend-series"><div><small>종합 관심</small>${trendSparkline(points,"overallInterest","navy")}</div><div><small>심층 관심</small>${trendSparkline(points,"highEngagement","blue")}</div><div><small>대중 확산</small>${trendSparkline(points,"massExpansion","mint")}</div><div><small>활동성</small>${trendSparkline(points,"activity","orange")}</div><div><small>이슈 온도</small>${trendSparkline(points,"issueHeat","red")}</div><div><small>미디어 확산</small>${trendSparkline(points,"mediaSpread","violet")}</div></div>${rankHistoryMarkup(live)}</div>`;
}
function analysisReport(live){
  const row=live?.row||null;
  const analysis=live?.analysis||null;
  const scores=analysis?.scores||{};
  const grades=analysis?.grades||{};
  const score=n(row?.score);
  const signal=analysis?.signal||{};
  const audience=analysis?.audience||{};
  const audiencePosition=Number.isFinite(Number(audience.position))?Number(audience.position):50;
  const audienceAxisValue=Math.round(Math.max(-50,Math.min(50,audiencePosition-50)));
  const audienceAxisLeft=audienceAxisValue+50;
  const audienceAxisLabel=audienceAxisValue>0?`+${audienceAxisValue}`:String(audienceAxisValue);
  const audienceIntensity=axisIntensityBand(audienceAxisValue);
  const mediaPublic=analysis?.mediaPublic||{};
  const signalCopy=analysis?.signal?.diagnosis||(row?(live?.whyNow||"현재 관측된 관심과 활동 흐름을 정참시 인텔리전스 지표로 해석합니다."):"게시 데이터가 연결되면 정참시 분석지표가 표시됩니다.");
  const status=signal.label||(row?"분석 중":"데이터 대기");
  const gd=(key,desc)=>grades[key]?`${grades[key]} · ${desc}`:desc;
  return `
    <section class="content-card person-analysis-signal">
      <div class="person-analysis-signal-head"><div><h2>정참시 SIGNAL</h2></div><span class="person-analysis-status">${esc(status)}</span></div>
      <div class="person-analysis-signal-body"><div class="person-analysis-signal-mark"><small>NOW INDEX</small><strong>${row?score.toFixed(1):"—"}</strong><span>${row?`NOW ${fmt(row.rank)}위`:`게시 데이터 대기`}</span></div><div><h3>${esc(signal.label||"이 인물의 현재 정치적 관심 국면")}</h3><p>${esc(signalCopy)}</p></div></div>
    </section>

    <section class="content-card person-analysis-core">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">CORE INDICATORS</span><h2>핵심 분석지표</h2></div><span>JEONGCHAMSI MULTI-INTELLIGENCE DATA ANALYSIS</span></div>
      <div class="person-analysis-core-grid">
        ${analysisMetric("종합 관심",gd("overallInterest","현재 이 인물을 둘러싼 사회적 관심의 총체적 강도"),scores.overallInterest,"navy")}
        ${analysisMetric("심층 관심",gd("highEngagement","일시적인 화제성을 넘어 추가 정보 탐색으로 이어지는 관심의 깊이"),scores.highEngagement,"mint")}
        ${analysisMetric("대중 확산",gd("massExpansion","관심이 특정 관심군을 넘어 폭넓게 확산되는 힘"),scores.massExpansion,"blue")}
        ${analysisMetric("활동성",gd("activity","최근 활동과 이슈 노출이 얼마나 활발하게 포착되고 있는지"),scores.activity,"orange")}
        ${analysisMetric("이슈 온도",gd("issueHeat","현재 이 인물을 둘러싼 이슈의 즉시성과 집중도"),scores.issueHeat,"red")}
        ${analysisMetric("미디어 확산",gd("mediaSpread","관련 이슈가 다양한 정보 채널을 통해 확산되는 정도"),scores.mediaSpread,"violet")}
      </div>
    </section>

    <section class="content-card person-analysis-landscape">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">AUDIENCE LANDSCAPE</span><h2>관심 구조 분석</h2></div><span>관심 성향과 확장 방향 · 초록 → 빨강 = 0 기준 편차 강도</span></div>
      <div class="person-analysis-landscape-grid"><div class="person-interest-axis intensity-${audienceIntensity}"><div class="person-interest-axis-labels"><span>심층 탐색형</span><span>대중 확산형</span></div><div class="person-interest-axis-track"><i></i><em style="left:${audienceAxisLeft}%"><b class="person-interest-axis-value">${audienceAxisLabel}</b></em></div><div class="person-interest-axis-scale" aria-label="관심 구조 상대축"><span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span></div><strong>${esc(audience.label||"관심 구조 분석")}</strong><p>관심의 깊이와 확산 범위가 어느 방향으로 형성되는지 상대적 위치로 판독합니다.</p></div><div class="person-analysis-mini-grid">${analysisBar("관심층 확장",gd("audienceExpansion","기존 관심 범위를 넘어 새로운 관심군으로 확산되는 정도"),scores.audienceExpansion,"blue")}${analysisBar("반응 확장력",gd("mobileResponse","새로운 관심이 보다 넓은 이용자층으로 빠르게 확산되는 정도"),scores.mobileResponse,"mint")}${analysisBar("대중 침투력",gd("massPenetration","정치 고관여층을 넘어 일반적인 대중 관심으로 연결되는 힘"),scores.massPenetration,"orange")}${analysisBar("심층 유지력",gd("coreRetention","단기 화제 이후에도 정보 탐색형 관심이 지속되는 정도"),scores.coreRetention,"navy")}</div></div>
    </section>

    <section class="content-card person-analysis-activity">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">ACTIVITY & MEDIA</span><h2>활동 · 미디어 분석</h2></div><span>활동의 속도 · 집중 · 지속 · 확산 방향</span></div>
      <div class="person-analysis-dual"><div class="person-analysis-panel"><h3>정치 활동성</h3>${analysisAxis("활동성",gd("activity","최근 활동과 이슈 노출이 얼마나 활발하게 포착되고 있는지"),scores.activity,"정체","활발")}${analysisAxis("활동 가속도",gd("activityAcceleration","최근 활동과 관련 노출의 증가 속도가 얼마나 빨라지고 있는지"),scores.activityAcceleration,"둔화","가속")}${analysisAxis("활동 집중도",gd("activityConcentration","최근 짧은 기간에 활동과 관심이 얼마나 집중되고 있는지"),scores.activityConcentration,"분산","집중")}${analysisAxis("활동 지속성",gd("activityPersistence","일회성 이슈가 아닌 연속적인 활동 흐름이 유지되는 정도"),scores.activityPersistence,"단기","지속")}</div><div class="person-analysis-panel"><h3>미디어 움직임</h3>${analysisAxis("미디어 가속도",gd("newsAcceleration","관련 보도와 언급이 이전 흐름보다 빠르게 확대되는 정도"),scores.newsAcceleration,"둔화","확산")}${analysisAxis("이슈 신선도",gd("issueFreshness","현재 관심이 최근 발생한 이슈에 얼마나 집중되어 있는지"),scores.issueFreshness,"누적","최신")}${analysisAxis("이슈 지속성",gd("issuePersistence","특정 이슈에 대한 관심이 단발성 반응을 넘어 유지되는 정도"),scores.issuePersistence,"단발","지속")}${analysisAxis("채널 다양성",gd("mediaDiversity","특정 정보원에 편중되지 않고 다양한 경로에서 다뤄지는 정도"),scores.mediaDiversity,"편중","다변화")}</div></div>
    </section>

    <section class="content-card person-analysis-issue">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">ATTENTION FLOW</span><h2>관심 전이 분석</h2></div><span>이슈 노출이 대중 관심으로 연결되는 흐름</span></div>
      <div class="person-analysis-transition-grid">${analysisMetric("미디어→대중 전이",gd("newsSearchTransition","이슈 노출이 실제 대중 관심으로 연결되는 정도"),scores.newsSearchTransition,"mint")}${analysisMetric("이슈 유입력",gd("issueInflux","새로운 정치적 이슈가 추가적인 관심을 끌어들이는 힘"),scores.issueInflux,"orange")}${analysisMetric("미디어·대중 괴리",gd("mediaPublicGap","정보 노출 강도와 실제 대중 관심 사이의 차이"),scores.mediaPublicGap,"blue")}${analysisMetric("이슈 폭발력",gd("issueExplosiveness","짧은 시간 안에 이슈 노출과 대중 관심이 동시에 증폭되는 힘"),scores.issueExplosiveness,"red")}</div>
      <div class="person-analysis-diagnosis"><span>정참시 종합진단</span><strong>${esc(signal.label||"분석 데이터 대기")}</strong><p>${esc(signal.diagnosis||"다중 관측 신호를 종합해 현재 관심 국면을 판독합니다.")}</p></div>
    </section>

    <details class="person-analysis-deep content-card">
      <summary><span><small>DEEP ANALYSIS</small><b>정참시 심층분석 더보기</b></span><em>+</em></summary>
      <div class="person-analysis-deep-body"><div class="person-analysis-deep-grid"><article><h3>관심 전이</h3>${analysisAxis("미디어→대중 전이",gd("newsSearchTransition","이슈 노출이 능동적인 대중 관심으로 연결되는 정도"),scores.newsSearchTransition,"분리","전이")}${analysisAxis("미디어·대중 괴리",gd("mediaPublicGap","정보 노출과 대중 관심 사이의 간격"),scores.mediaPublicGap,"낮은 괴리","큰 괴리")}${analysisAxis("관심층 확장",gd("audienceExpansion","기존 관심 범위를 넘어 새로운 관심군으로 확산되는 정도"),scores.audienceExpansion,"정체","확장")}</article><article><h3>시간 흐름</h3>${analysisAxis("단기 가속",gd("newsAcceleration","최근 관심과 노출의 변화 속도"),scores.newsAcceleration,"둔화","가속")}${analysisAxis("일간 집중",gd("activityConcentration","최근 활동과 관심이 특정 시점에 집중되는 정도"),scores.activityConcentration,"분산","집중")}${analysisAxis("주간 지속",gd("activityPersistence","관심과 활동 흐름이 연속적으로 유지되는 정도"),scores.activityPersistence,"단기","지속")}</article><article><h3>이슈 구조</h3>${analysisAxis("이슈 신선도",gd("issueFreshness","현재 관심이 새로운 이슈에 집중되는 정도"),scores.issueFreshness,"누적","최신")}${analysisAxis("대중 침투",gd("massPenetration","관심이 일반적인 대중 영역으로 확장되는 힘"),scores.massPenetration,"제한","침투")}${analysisAxis("이슈 폭발",gd("issueExplosiveness","짧은 시간 안에 관심이 증폭되는 힘"),scores.issueExplosiveness,"안정","폭발")}</article></div><!-- ANALYSIS TREND -->${analysisTrend(live)}</div>
    </details>`;
}



function piNumber(value){
  if(value===null||value===undefined||value==='')return null;
  const n=Number(value);return Number.isFinite(n)?n:null;
}
function piSigned(value){const n=piNumber(value);return n===null?'SIGNAL CONFIDENCE LIMITED':`${n>0?'+':''}${Math.round(n)}`;}
function adminPiAxis(label,meaning,value){
  const raw=piNumber(value);
  if(raw===null)return `<article class="admin-pi-axis is-insufficient"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>SIGNAL CONFIDENCE LIMITED</strong></div><div class="admin-pi-axis-track"><i></i></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
  const x=Math.max(-50,Math.min(50,raw));
  const pos=x+50,intensity=axisIntensityBand(x),text=x>0?`+${Math.round(x)}`:String(Math.round(x));
  return `<article class="admin-pi-axis intensity-${intensity}"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>${text}</strong></div><div class="admin-pi-axis-track"><i></i><em style="left:${pos}%"></em></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
}
function adminPiMetric(label,meaning,value,suffix=""){
  const missing=value===null||value===undefined||value==='';
  return `<article class="admin-pi-metric${missing?' is-insufficient':''}"><small>${esc(label)}</small><b>${esc(meaning)}</b><strong>${missing?'SIGNAL CONFIDENCE LIMITED':`${esc(String(value))}${esc(suffix)}`}</strong></article>`;
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
  return `<div class="admin-pi-resilience-gauge-wrap"><div class="admin-pi-resilience-gauge" style="--gauge:${score}%"><span><b>${raw===null?'—':Math.round(score)}</b><small>/100</small></span></div><div><b>${raw===null?'관측 축적 중':score>=70?'높은 회복력':score>=45?'중간 회복력':'회복력 주의'}</b><p>${resilience.recoveryDays===null||resilience.recoveryDays===undefined?'회복기간 관측 축적 중':`과거 충격 후 회복 ${Number(resilience.recoveryDays).toFixed(1)}일`} · 변동성 ${Number(resilience.volatility||0).toFixed(1)}</p></div></div>`;
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
function adminPiVisualPulse(history={}){
  const observations=history?.person?.observations||[];
  const interest=adminPiPulsePath(observations,'overallInterest');
  const media=adminPiPulsePath(observations,'mediaSpread');
  return `<section class="admin-pi-visual-pulse"><div class="admin-pi-visual-pulse-head"><div><span>30D INTELLIGENCE PULSE</span><h3>관심 · 미디어 흐름</h3></div><div class="admin-pi-pulse-legend"><span><i class="interest"></i>종합 관심 ${interest.last===null?'—':Math.round(interest.last)}</span><span><i class="media"></i>미디어 확산 ${media.last===null?'—':Math.round(media.last)}</span></div></div>${interest.count||media.count?`<svg class="admin-pi-pulse-svg" viewBox="0 0 520 126" role="img" aria-label="최근 정치 인텔리전스 변화"><line x1="10" y1="31" x2="510" y2="31"></line><line x1="10" y1="63" x2="510" y2="63"></line><line x1="10" y1="95" x2="510" y2="95"></line>${interest.points?`<polyline class="interest" points="${interest.points}"></polyline>`:''}${media.points?`<polyline class="media" points="${media.points}"></polyline>`:''}</svg>`:`<div class="admin-pi-pulse-empty">HISTORY 관측이 쌓이면 이곳에 시계열 흐름이 표시됩니다.</div>`}</section>`;
}

function adminPiSignalList(title,meaning,items=[],tone="risk"){
  return `<article class="admin-pi-signal-list ${tone}"><div><b>${esc(title)}</b><small>${esc(meaning)}</small></div>${items.map(x=>`<p>${esc(x)}</p>`).join('')}</article>`;
}
function adminPiConfidenceBand(value,status='VALID_SIGNAL'){
  if(status!=='VALID_SIGNAL')return 'LIMITED';
  const n=piNumber(value);if(n===null)return 'LIMITED';
  return n>=80?'HIGH':'MEDIUM';
}
function adminPiCohortAxis(label,meaning,row={}){
  const valid=row?.status==='VALID_SIGNAL'&&piNumber(row?.value)!==null;
  const confidence=piNumber(row?.confidence),band=adminPiConfidenceBand(confidence,row?.status);
  if(!valid)return `<article class="admin-pi-axis admin-pi-cohort-axis is-insufficient"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>SIGNAL CONFIDENCE LIMITED</strong></div><div class="admin-pi-cohort-meta"><span>CONFIDENCE ${band}</span><span>JCS HISTORY 정상 유지</span></div><div class="admin-pi-axis-track"><i></i></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
  const x=Math.max(-50,Math.min(50,Number(row.value))),pos=x+50,intensity=axisIntensityBand(x),text=x>0?`+${Math.round(x)}`:String(Math.round(x));
  return `<article class="admin-pi-axis admin-pi-cohort-axis intensity-${intensity}"><div class="admin-pi-axis-head"><div><b>${esc(label)}</b><small>${esc(meaning)}</small></div><strong>${text}</strong></div><div class="admin-pi-cohort-meta"><span>CONFIDENCE ${band}${confidence===null?'':` · ${Math.round(confidence)}%`}</span><span>SUPPORT MOMENTUM · JCS EST.</span></div><div class="admin-pi-axis-track"><i></i><em style="left:${pos}%"></em></div><div class="admin-pi-axis-scale"><span>-50</span><span>0</span><span>+50</span></div></article>`;
}
function adminPiCohortCell(label,row={}){
  const valid=row?.status==='VALID_SIGNAL'&&piNumber(row?.value)!==null,confidence=piNumber(row?.confidence),band=adminPiConfidenceBand(confidence,row?.status),evidence=Math.max(0,Number(row?.evidenceCount)||0);
  return `<article class="admin-pi-cohort-cell${valid?'':' is-insufficient'}"><div><b>${esc(label)}</b><small>CONFIDENCE ${band}${valid&&confidence!==null?` · ${Math.round(confidence)}%`:''}</small></div><strong>${valid?piSigned(row.value):'LIMITED'}</strong><span>${valid?`EVIDENCE ${evidence}`:'JCS HISTORY 정상 유지'}</span></article>`;
}
function adminPiSummaryCard(label,row,kind='value'){
  if(!row)return '';
  let main='';
  if(kind==='gap')main=`${esc(row.label||'—')} · ${piNumber(row.value)===null?'—':`${Math.round(Math.abs(Number(row.value)))}P`}`;
  else if(kind==='stable')main=esc(row.cohort||'—');
  else main=`${esc(row.cohort||'—')} · ${piSigned(row.value)}`;
  return `<article><small>${esc(label)}</small><strong>${main}</strong></article>`;
}
function adminPiDemographicSection(pi){
  const cohorts=pi?.cohorts||{},age=cohorts.age||{},gender=cohorts.gender||{},cells=cohorts.cells||{},summary=cohorts.summary||{};
  const ages=[['18–29','18-29'],['30–39','30-39'],['40–49','40-49'],['50–59','50-59'],['60–69','60-69'],['70+','70+']];
  const matrix=[['18–29','18_29_m','18_29_f'],['30–39','30_39_m','30_39_f'],['40–49','40_49_m','40_49_f'],['50–59','50_59_m','50_59_f'],['60–69','60_69_m','60_69_f'],['70+','70_plus_m','70_plus_f']];
  const summaryCards=[adminPiSummaryCard('STRONGEST POSITIVE SIGNAL',summary.strongestPositive),adminPiSummaryCard('STRONGEST NEGATIVE SIGNAL',summary.strongestNegative),adminPiSummaryCard('WIDEST GENDER GAP',summary.widestGenderGap,'gap'),adminPiSummaryCard('FASTEST 30D CHANGE',summary.fastest30dChange),adminPiSummaryCard('MOST STABLE COHORT',summary.mostStableCohort,'stable')].filter(Boolean).join('');
  return `<div class="admin-pi-cohort-suite" data-jcs-age-gender-v2>
    <div class="admin-pi-section-head"><div><span>AGE COHORT SUPPORT MOMENTUM</span><h3>연령별 지지 흐름</h3></div><small>SUPPORT MOMENTUM · JCS EST. · -50 / 0 / +50</small></div>
    <div class="admin-pi-cohort-age-grid">${ages.map(([label,key])=>adminPiCohortAxis(label,'연령 코호트 현재 방향',age[key]||{})).join('')}</div>
    <div class="admin-pi-section-head"><div><span>GENDER SUPPORT MOMENTUM</span><h3>성별 지지 흐름</h3></div><small>유효한 연령×성별 셀만 가중 집계</small></div>
    <div class="admin-pi-cohort-gender-grid">${adminPiCohortAxis('MALE','남성 전체 지지 방향',gender.MALE||{})}${adminPiCohortAxis('FEMALE','여성 전체 지지 방향',gender.FEMALE||{})}</div>
    <div class="admin-pi-section-head"><div><span>AGE × GENDER MATRIX</span><h3>연령 × 성별 세부 흐름</h3></div><small>각 셀: MOMENTUM · CONFIDENCE · EVIDENCE</small></div>
    <div class="admin-pi-cohort-matrix"><div class="admin-pi-cohort-matrix-head"><span>AGE</span><b>MALE</b><b>FEMALE</b></div>${matrix.map(([label,m,f])=>`<section><h4>${esc(label)}</h4><div>${adminPiCohortCell('MALE',cells[m]||{})}${adminPiCohortCell('FEMALE',cells[f]||{})}</div></section>`).join('')}</div>
    <div class="admin-pi-section-head"><div><span>COHORT INTELLIGENCE SUMMARY</span><h3>연령·성별 핵심 판독</h3></div><small>유효 신호만 요약 · 불충분 항목은 생성하지 않음</small></div>
    ${summaryCards?`<div class="admin-pi-cohort-summary">${summaryCards}</div>`:`<div class="notice-box">SIGNAL CONFIDENCE LIMITED · JCS HISTORY 정상 유지</div>`}
  </div>`;
}

function adminPiStrategicSolution(solution={}){
  const priorities=Array.isArray(solution?.priorities)?solution.priorities:[];
  if(!priorities.length)return '';
  return `<div class="admin-pi-strategic">
    <div class="admin-pi-section-head"><div><span>JCS STRATEGIC SOLUTION</span><h3>현재 분석을 기반으로 한 대응 방향</h3></div><small>방향과 우선순위만 제시 · 구체 실행은 별도 전략 설계 영역</small></div>
    <div class="admin-pi-strategic-grid">${priorities.map((x,index)=>`<article><div><span>PRIORITY ${String(index+1).padStart(2,'0')}</span><em>${esc(x.priority||'WATCH')}</em></div><b>${esc(x.code||'STRATEGIC DIRECTION')}</b><small>${esc(x.label||x.meaning||'대응 방향')}</small><p>${esc(x.direction||'현재 분석 신호를 기준으로 대응 방향을 조정할 필요가 있습니다.')}</p></article>`).join('')}</div>
    <div class="admin-pi-conclusion"><div><span>JCS STRATEGIC CONCLUSION</span><small>전략적 결론</small></div><strong>${esc(solution?.conclusion||'구체적인 실행전략은 정치적 환경과 대상별 상황을 함께 고려하여 설계되어야 합니다.')}</strong></div>
  </div>`;
}
function adminPoliticalIntelligence(history,p){
  const pi=history?.politicalIntelligence;if(!pi)return '';
  const support=pi.support||{},media=pi.media||{},confidence=pi.confidence||{},gap=pi.attentionSupportGap||{},resilience=pi.resilience||{};
  const age=support.ageMomentum||{},momentum=media.momentum||{},issues=Array.isArray(pi.issueImpacts)?pi.issueImpacts:[],external=Array.isArray(pi.evidence?.external)?pi.evidence.external:[];
  const persistenceKo={FLASH:'단기 폭발',BUILDING:'확산 형성',SUSTAINED:'지속 흐름',COOLING:'확산 둔화',STABLE:'안정'}[media.persistence]||'분석 중';
  const competitors=Array.isArray(pi.competitorFlow)?pi.competitorFlow:[];
  return `<div class="admin-political-intelligence admin-pi-report-main">
    <section class="admin-pi-executive">
      <div class="admin-pi-hero"><div><span class="eyebrow">JCS POLITICAL INTELLIGENCE</span><h2>${esc(p.name)} Intelligence Brief</h2><p>SEARCH ENGINE · NEWS PORTAL · JCS HISTORY를 포함한 LEADING EXTERNAL INSTITUTIONS의 데이터를 JCS INTELLIGENCE ENGINE으로 재해석한 관리자 전용 분석결과입니다.</p></div><div class="admin-pi-trust"><b>JCS EST.</b><strong>${piNumber(confidence.score)===null?'—':`${Math.round(piNumber(confidence.score))}%`}</strong><small>CONFIDENCE ${esc(confidence.label||'LOW')} · ${Number(confidence.observedDays)||0} DAYS OBSERVED</small></div></div>
      <div class="admin-pi-diagnosis"><div><span>JCS CURRENT DIAGNOSIS</span><small>현재 정치상태 진단</small></div><strong>${esc(pi.diagnosis?.label||'SIGNAL CONFIDENCE LIMITED · JCS HISTORY 정상 유지')}</strong><em>${piSigned(pi.diagnosis?.condition)}</em></div>
      ${adminPiVisualPulse(history)}
    </section>

    <section class="admin-pi-report-block admin-pi-tone-demographic">
      ${adminPiDemographicSection(pi,age)}
    </section>

    <section class="admin-pi-report-block admin-pi-tone-support">
      <div class="admin-pi-section-head"><div><span>CORE SUPPORT DYNAMICS</span><h3>강성지지층 변화</h3></div><small>핵심 지지 기반의 이탈과 신규 유입 추정</small></div>
      <div class="admin-pi-metric-grid">${adminPiMetric('CORE SUPPORT ATTRITION','강성지지층 이탈 추정',piNumber(support.coreAttritionPct)===null?null:piNumber(support.coreAttritionPct).toFixed(1),'%')}${adminPiMetric('NEW SUPPORT INFLOW','신규지지층 유입 추정',piNumber(support.newSupportInflowPct)===null?null:piNumber(support.newSupportInflowPct).toFixed(1),'%')}${adminPiMetric('ATTENTION → SUPPORT GAP','관심 대비 지지전환',piNumber(gap.gap)===null?null:piSigned(gap.gap),'')}${adminPiMetric('POLITICAL RESILIENCE','정치적 회복력',piNumber(resilience.score)===null?null:Math.round(piNumber(resilience.score)),'/100')}</div>
      <div class="admin-pi-visual-duo"><section class="admin-pi-support-quality-visual"><div class="admin-pi-section-head compact"><div><span>SUPPORT QUALITY</span><h3>지지 기반의 질</h3></div><small>구성비</small></div>${adminPiSupportDonut(support.quality||{})}${adminPiQuality(support.quality||{})}</section><section class="admin-pi-resilience-visual"><div class="admin-pi-section-head compact"><div><span>POLITICAL RESILIENCE</span><h3>정치적 회복력</h3></div><small>회복 속도 · 변동성</small></div>${adminPiResilienceGauge(resilience)}</section></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-media">
      <div class="admin-pi-section-head"><div><span>MEDIA PROPAGATION</span><h3>미디어 확산 흐름</h3></div><small>현재 뉴스·검색·이슈 구조 기반 확산 추정</small></div>
      <div class="admin-pi-axis-grid media">${adminPiAxis('NEWS MOMENTUM','뉴스 확산 흐름',momentum.news)}${adminPiAxis('YOUTUBE MOMENTUM','유튜브 확산 추정',momentum.youtube)}${adminPiAxis('SNS MOMENTUM','SNS 확산 추정',momentum.sns)}${adminPiAxis('COMMUNITY MOMENTUM','커뮤니티 확산 추정',momentum.community)}</div>
      <div class="admin-pi-media-meta"><span><b>PERSISTENCE</b>${esc(media.persistence||'STABLE')} · ${esc(persistenceKo)}</span><span><b>BURST</b>${piNumber(media.burst)===null?'—':`×${piNumber(media.burst).toFixed(1)}`}</span><span><b>SOURCE BREADTH</b>${piNumber(media.breadth)===null?'—':`${Math.round(piNumber(media.breadth))}/4`}</span></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-issues">
      <div class="admin-pi-section-head"><div><span>ISSUE IMPACT MAP</span><h3>이슈별 영향</h3></div><small>최근 기사 제목과 현재 신호를 사건 유형으로 분류한 JCS 추정</small></div>
      <div class="admin-pi-issues">${issues.length?issues.map(x=>`<article><span>${esc(x.category||'GENERAL')}</span><b>${esc(x.title||'')}</b>${adminPiIssueBars(x)}</article>`).join(''):`<div class="notice-box">분석 가능한 최근 이슈 제목을 축적 중입니다.</div>`}</div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-risk">
      <div class="admin-pi-section-head"><div><span>RISK & OPPORTUNITY</span><h3>위험·기회 신호</h3></div><small>현재 신호에서 먼저 확인할 포인트</small></div>
      <div class="admin-pi-risk-grid">${adminPiSignalList('EARLY WARNING','위험 신호',pi.riskOpportunity?.risks||[],'risk')}${adminPiSignalList('OPPORTUNITY SIGNAL','기회 신호',pi.riskOpportunity?.opportunities||[],'opportunity')}</div>
      <div class="admin-pi-two-col"><section><div class="admin-pi-section-head compact"><div><span>ATTENTION → SUPPORT GAP</span><h3>관심 대비 지지전환</h3></div></div><div class="admin-pi-gap"><span><b>ATTENTION</b><strong>${piSigned(gap.attention)}</strong></span><i>→</i><span><b>SUPPORT</b><strong>${piSigned(gap.support)}</strong></span><p>${esc(gap.label||'분석 중')}</p></div></section><section><div class="admin-pi-section-head compact"><div><span>COMPETITOR FLOW</span><h3>경쟁자 이동 추정</h3></div></div><div class="admin-pi-competitors">${competitors.length?competitors.map(x=>`<p><b>${esc(x.name||x.id)}</b><span>+${Number(x.estimatedShare||0).toFixed(1)}% JCS EST.</span></p>`).join(''):`<p><b>관망·기타</b><span>경쟁자 이동 관측 대기</span></p>`}</div></section></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-evidence">
      <div class="admin-pi-section-head"><div><span>EVIDENCE BASE</span><h3>분석 근거</h3></div><small>${esc(pi.evidence?.basis||'JCS 현재 관측 기반')}</small></div>
      <div class="admin-pi-evidence"><article><b>JCS DATA LAYER</b><p>SEARCH ENGINE · NEWS PORTAL · NOW · JCS HISTORY</p></article><article><b>EXTERNAL INSTITUTIONAL SIGNALS</b><p>유력 외부기관 분석근거 · EVIDENCE ${external.length} · ${external.length?'VERIFIED PUBLIC DATA':'NO MATCHED EXTERNAL EVIDENCE'}</p></article></div>
    </section>

    <section class="admin-pi-report-block admin-pi-tone-strategy">${adminPiStrategicSolution(pi.strategicSolution||{})}</section>
  </div>`;
}
function adminIntelligenceReport(history,p){
  const pi=history?.politicalIntelligence||{},confidence=pi?.confidence||{};
  const confidenceScore=piNumber(confidence.score),diagnosis=pi?.diagnosis?.label||'JCS INTELLIGENCE REPORT';
  return `<details class="content-card admin-intelligence-report-shell" data-admin-political-intelligence>
    <summary class="admin-intelligence-report-gate"><span class="admin-intelligence-report-seal">JCS<small>ADMIN</small></span><div class="admin-intelligence-report-title"><span>PRIVATE POLITICAL INTELLIGENCE · ${esc(p.name)}</span><h2>JCS Political Intelligence Report</h2><p>관리자 전용 분석을 고급 리포트 모드로 확인합니다. 핵심 진단부터 AGE × GENDER · 미디어 · 위험/기회 · HISTORY까지 한 흐름으로 구성했습니다.</p></div><div class="admin-intelligence-report-meta"><small>CONFIDENCE</small><b>${confidenceScore===null?'—':`${Math.round(confidenceScore)}%`}</b><em>${esc(diagnosis)}</em><strong class="admin-intelligence-report-open"><span class="closed-label">리포트 열기</span><span class="open-label">리포트 닫기</span><i>+</i></strong></div></summary>
    <div class="admin-intelligence-report-body">${adminPoliticalIntelligence(history,p)}${adminHistoryIntelligence(history,p)}</div>
  </details>`;
}
function adminPersonIntelligenceSlot(p){
  return `<section class="content-card admin-intelligence-report-shell admin-pi-loading" data-person-admin-intelligence-slot data-person-id="${esc(p.id)}" aria-busy="true"><div class="admin-intelligence-report-gate loading"><span class="admin-intelligence-report-seal">JCS<small>ADMIN</small></span><div class="admin-intelligence-report-title"><span>PRIVATE POLITICAL INTELLIGENCE · ${esc(p.name)}</span><h2>JCS Political Intelligence Report</h2><p>관리자 전용 인텔리전스 리포트를 준비하고 있습니다.</p></div><div class="admin-intelligence-report-meta"><small>LOADING</small><b>···</b></div></div></section>`;
}
export async function hydratePersonAdminIntelligence(){
  const slot=document.querySelector('[data-person-admin-intelligence-slot]');if(!slot)return;
  const personId=String(slot.dataset.personId||'').trim(),p=getPersonSlotById(personId);if(!personId||!p){slot.remove();return;}
  const {getAdminHistoryPersonDetail}=await import('../core/history-repository.js?v=history-v2-detail-perf');
  const history=await getAdminHistoryPersonDetail(personId,'30');
  if(!slot.isConnected)return;
  slot.outerHTML=adminIntelligenceReport(history,p);
}

function adminHistoryDelta(value){
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return `<em class="neutral">관측 부족</em>`;
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
  const row=live?.row||null,news=row?.news||{};
  const photoMarkup=photo ? `<img data-politician-photo src="${esc(photo.url)}" alt="" width="${photo.width}" height="${photo.width}" loading="eager" decoding="async" fetchpriority="high">` : "";
  const adminPhotoEditor=isAdmin?`<form class="detail-politician-photo-form" data-politician-photo-form data-detail-politician-photo-form data-person-id="${esc(p.id)}"><input type="file" accept="image/jpeg,image/png,image/webp" data-politician-photo-input hidden><div class="detail-photo-selected-preview" data-politician-photo-preview hidden></div><button class="detail-photo-admin-trigger" type="button" data-detail-politician-photo-trigger aria-label="${esc(p.name)} 사진 등록 또는 교체"><span>ADMIN</span><b>사진 선택</b></button><button class="detail-photo-admin-save" type="submit" data-politician-photo-save disabled>저장</button><small class="detail-photo-admin-state" data-politician-photo-state>사진을 선택하면 여기서 미리볼 수 있습니다</small></form>`:"";
  const photoNotice=photo
    ? ` · 사진: <a href="${esc(photo.sourcePage||"#")}" target="_blank" rel="noopener noreferrer">${esc(photo.attribution||"프로필 사진")}</a>${photo.licenseUrl?` · <a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(photo.license||"라이선스")}</a>`:""}`
    : " · 사진은 순차 연결 중";
  const rank=n(row?.rank),categoryRank=n(live?.categoryRank),categoryLabel=live?.categoryLabel||p.roleLabel;
  const liveHero=row?`<div class="person-hero-now person-hero-rank-split"><div class="person-hero-rank-cell"><span>전체 NOW</span><strong>${fmt(rank)}위</strong></div><div class="person-hero-rank-cell"><span>${esc(categoryLabel)}</span><strong>${categoryRank?`${fmt(categoryRank)}위`:"—"}</strong></div><div class="person-hero-rank-trend">${trendMarkup(live)}</div></div>`:`<div class="person-hero-now is-empty person-hero-rank-split"><div class="person-hero-rank-cell"><span>전체 NOW</span><strong>—</strong></div><div class="person-hero-rank-cell"><span>${esc(categoryLabel)}</span><strong>—</strong></div><div class="person-hero-rank-trend"><span class="person-trend neutral">게시 데이터 대기</span></div></div>`;
  const newsSection=row?`<section class="content-card person-recent-news"><div class="section-title"><h2>최근 뉴스</h2><span>분석 근거 · 최근 7일 최대 6건</span></div>${recentNews(news)}</section>`:"";
  return pageShell(`<main class="subpage person-live-detail-page person-analysis-report-page">
    <section class="person-detail-hero person-live-hero content-card">
      <div class="person-detail-photo ${photo ? "has-photo" : ""} ${isAdmin ? "admin-photo-editable" : ""}"${photo ? ` style="--photo-position:${esc(photo.focus)}"` : ""} data-detail-photo-shell>${photoMarkup}${adminPhotoEditor}</div>
      <div class="person-detail-title"><span class="eyebrow">${esc(p.roleLabel)} · LIVE PROFILE</span><h1>${esc(p.name)}</h1><p class="person-current-role">${esc(p.office||p.roleLabel)}</p><p>${esc(p.party)} · ${esc(p.jurisdiction)}</p><div class="person-detail-badges"><span>${esc(p.roleLabel)}</span><span>${esc(p.terms||"기본정보")}</span><span>${esc(p.type==="assembly"?(p.committee||"국회의원"):p.jurisdiction)}</span></div></div>
      ${liveHero}
      <div class="detail-action-bar"><button type="button" class="ghost-btn ${favorite?"active":""}" data-person-favorite="${esc(p.id)}">${favorite?"★ 즐겨찾기됨":"☆ 즐겨찾기"}</button><button type="button" class="ghost-btn" data-go="/compare?a=${esc(p.id)}">비교하기</button></div>
    </section>
    ${analysisReport(live)}
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
