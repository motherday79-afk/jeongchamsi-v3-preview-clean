import { pageShell, esc } from "./layout.js";
import { getPersonSlotById } from "../data/person-provider.js";
import { politicianPhoto } from "../data/politician-photo-index.js";
import { getNowPerson } from "../core/repository.js";
import { getUserSession, isFavoritePerson, recordRecentPerson } from "../core/user.js";

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
  return {score,axis,label:axis>0?`+${axis}`:String(axis)};
}
function analysisAxis(label,desc,value,leftLabel,rightLabel,tone="mint"){
  const point=analysisAxisValue(value);
  return `<article class="person-analysis-axis-metric ${tone}">
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
      <div class="section-title person-analysis-title"><div><span class="eyebrow">AUDIENCE LANDSCAPE</span><h2>관심 구조 분석</h2></div><span>관심 성향과 확장 방향의 상대적 구조</span></div>
      <div class="person-analysis-landscape-grid"><div class="person-interest-axis"><div class="person-interest-axis-labels"><span>심층 탐색형</span><span>대중 확산형</span></div><div class="person-interest-axis-track"><i></i><em style="left:${audienceAxisLeft}%"><b class="person-interest-axis-value">${audienceAxisLabel}</b></em></div><div class="person-interest-axis-scale" aria-label="관심 구조 상대축"><span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span></div><strong>${esc(audience.label||"관심 구조 분석")}</strong><p>관심의 깊이와 확산 범위가 어느 방향으로 형성되는지 상대적 위치로 판독합니다.</p></div><div class="person-analysis-mini-grid">${analysisBar("관심층 확장",gd("audienceExpansion","기존 관심 범위를 넘어 새로운 관심군으로 확산되는 정도"),scores.audienceExpansion,"blue")}${analysisBar("반응 확장력",gd("mobileResponse","새로운 관심이 보다 넓은 이용자층으로 빠르게 확산되는 정도"),scores.mobileResponse,"mint")}${analysisBar("대중 침투력",gd("massPenetration","정치 고관여층을 넘어 일반적인 대중 관심으로 연결되는 힘"),scores.massPenetration,"orange")}${analysisBar("심층 유지력",gd("coreRetention","단기 화제 이후에도 정보 탐색형 관심이 지속되는 정도"),scores.coreRetention,"navy")}</div></div>
    </section>

    <section class="content-card person-analysis-activity">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">ACTIVITY & MEDIA</span><h2>활동 · 미디어 분석</h2></div><span>활동의 속도 · 집중 · 지속 · 확산 방향</span></div>
      <div class="person-analysis-dual"><div class="person-analysis-panel"><h3>정치 활동성</h3>${analysisAxis("활동성",gd("activity","최근 활동과 이슈 노출이 얼마나 활발하게 포착되고 있는지"),scores.activity,"정체","활발","orange")}${analysisAxis("활동 가속도",gd("activityAcceleration","최근 활동과 관련 노출의 증가 속도가 얼마나 빨라지고 있는지"),scores.activityAcceleration,"둔화","가속","red")}${analysisAxis("활동 집중도",gd("activityConcentration","최근 짧은 기간에 활동과 관심이 얼마나 집중되고 있는지"),scores.activityConcentration,"분산","집중","mint")}${analysisAxis("활동 지속성",gd("activityPersistence","일회성 이슈가 아닌 연속적인 활동 흐름이 유지되는 정도"),scores.activityPersistence,"단기","지속","navy")}</div><div class="person-analysis-panel"><h3>미디어 움직임</h3>${analysisAxis("미디어 가속도",gd("newsAcceleration","관련 보도와 언급이 이전 흐름보다 빠르게 확대되는 정도"),scores.newsAcceleration,"둔화","확산","red")}${analysisAxis("이슈 신선도",gd("issueFreshness","현재 관심이 최근 발생한 이슈에 얼마나 집중되어 있는지"),scores.issueFreshness,"누적","최신","orange")}${analysisAxis("이슈 지속성",gd("issuePersistence","특정 이슈에 대한 관심이 단발성 반응을 넘어 유지되는 정도"),scores.issuePersistence,"단발","지속","blue")}${analysisAxis("채널 다양성",gd("mediaDiversity","특정 정보원에 편중되지 않고 다양한 경로에서 다뤄지는 정도"),scores.mediaDiversity,"편중","다변화","violet")}</div></div>
    </section>

    <section class="content-card person-analysis-issue">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">ATTENTION FLOW</span><h2>관심 전이 분석</h2></div><span>이슈 노출이 대중 관심으로 연결되는 흐름</span></div>
      <div class="person-analysis-transition-grid">${analysisMetric("미디어→대중 전이",gd("newsSearchTransition","이슈 노출이 실제 대중 관심으로 연결되는 정도"),scores.newsSearchTransition,"mint")}${analysisMetric("이슈 유입력",gd("issueInflux","새로운 정치적 이슈가 추가적인 관심을 끌어들이는 힘"),scores.issueInflux,"orange")}${analysisMetric("미디어·대중 괴리",gd("mediaPublicGap","정보 노출 강도와 실제 대중 관심 사이의 차이"),scores.mediaPublicGap,"blue")}${analysisMetric("이슈 폭발력",gd("issueExplosiveness","짧은 시간 안에 이슈 노출과 대중 관심이 동시에 증폭되는 힘"),scores.issueExplosiveness,"red")}</div>
      <div class="person-analysis-diagnosis"><span>정참시 종합진단</span><strong>${esc(signal.label||"분석 데이터 대기")}</strong><p>${esc(signal.diagnosis||"다중 관측 신호를 종합해 현재 관심 국면을 판독합니다.")}</p></div>
    </section>

    <details class="person-analysis-deep content-card">
      <summary><span><small>DEEP ANALYSIS</small><b>정참시 심층분석 더보기</b></span><em>+</em></summary>
      <div class="person-analysis-deep-body"><div class="person-analysis-deep-grid"><article><h3>관심 전이</h3>${analysisAxis("미디어→대중 전이",gd("newsSearchTransition","이슈 노출이 능동적인 대중 관심으로 연결되는 정도"),scores.newsSearchTransition,"분리","전이","mint")}${analysisAxis("미디어·대중 괴리",gd("mediaPublicGap","정보 노출과 대중 관심 사이의 간격"),scores.mediaPublicGap,"낮은 괴리","큰 괴리","blue")}${analysisAxis("관심층 확장",gd("audienceExpansion","기존 관심 범위를 넘어 새로운 관심군으로 확산되는 정도"),scores.audienceExpansion,"정체","확장","orange")}</article><article><h3>시간 흐름</h3>${analysisAxis("단기 가속",gd("newsAcceleration","최근 관심과 노출의 변화 속도"),scores.newsAcceleration,"둔화","가속","red")}${analysisAxis("일간 집중",gd("activityConcentration","최근 활동과 관심이 특정 시점에 집중되는 정도"),scores.activityConcentration,"분산","집중","orange")}${analysisAxis("주간 지속",gd("activityPersistence","관심과 활동 흐름이 연속적으로 유지되는 정도"),scores.activityPersistence,"단기","지속","navy")}</article><article><h3>이슈 구조</h3>${analysisAxis("이슈 신선도",gd("issueFreshness","현재 관심이 새로운 이슈에 집중되는 정도"),scores.issueFreshness,"누적","최신","violet")}${analysisAxis("대중 침투",gd("massPenetration","관심이 일반적인 대중 영역으로 확장되는 힘"),scores.massPenetration,"제한","침투","mint")}${analysisAxis("이슈 폭발",gd("issueExplosiveness","짧은 시간 안에 관심이 증폭되는 힘"),scores.issueExplosiveness,"안정","폭발","red")}</article></div><!-- ANALYSIS TREND -->${analysisTrend(live)}</div>
    </details>`;
}

export async function renderPersonDetail(id){
  const p=getPersonSlotById(id);
  if(!p)return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>존재하지 않는 정치인입니다</h2><button class="primary-btn" type="button" data-go="/now">전체 정치인</button></section></main>`);
  const session=getUserSession(); recordRecentPerson(p.id);
  const favorite=session.authenticated&&isFavoritePerson(p.id);
  const activityTitle=p.type==="assembly"?"의정활동":"행정활동";
  const [live,photo]=await Promise.all([getNowPerson(p.id),Promise.resolve(politicianPhoto(p.id,"profile"))]);
  const row=live?.row||null,news=row?.news||{};
  const isAdmin=session.authenticated&&session.user?.role==="admin";
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
