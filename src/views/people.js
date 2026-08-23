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
function analysisReport(live){
  const row=live?.row||null;
  const analysis=live?.analysis||null;
  const scores=analysis?.scores||{};
  const grades=analysis?.grades||{};
  const score=n(row?.score);
  const signal=analysis?.signal||{};
  const audience=analysis?.audience||{};
  const mediaPublic=analysis?.mediaPublic||{};
  const signalCopy=analysis?.signal?.diagnosis||(row?(live?.whyNow||"현재 검색·뉴스 흐름을 정참시 분석지표로 해석합니다."):"게시 데이터가 연결되면 정참시 분석지표가 표시됩니다.");
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
        ${analysisMetric("종합 관심",gd("overallInterest","전체 관심 강도"),scores.overallInterest,"navy")}
        ${analysisMetric("고관여 관심",gd("highEngagement","PC 기반 정보탐색 성향"),scores.highEngagement,"mint")}
        ${analysisMetric("대중 확산",gd("massExpansion","모바일 기반 대중 확산력"),scores.massExpansion,"blue")}
        ${analysisMetric("활동성",gd("activity","정치·행정 활동 노출 강도"),scores.activity,"orange")}
        ${analysisMetric("이슈 온도",gd("issueHeat","현재 이슈 집중도"),scores.issueHeat,"red")}
        ${analysisMetric("미디어 확산",gd("mediaSpread","언론 노출의 폭과 다양성"),scores.mediaSpread,"violet")}
      </div>
    </section>

    <section class="content-card person-analysis-landscape">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">AUDIENCE LANDSCAPE</span><h2>관심 구조 분석</h2></div><span>검색 행동의 상대적 구조 분석</span></div>
      <div class="person-analysis-landscape-grid"><div class="person-interest-axis"><div class="person-interest-axis-labels"><span>고관여 관심</span><span>대중 확산</span></div><div class="person-interest-axis-track"><i></i><em style="left:${Math.max(2,Math.min(98,n(audience.position)||50))}%"></em></div><strong>${esc(audience.label||"관심 구조 분석")}</strong><p>PC·모바일 검색의 절대량은 노출하지 않고 전체 정치인 대비 상대점수와 구성 차이로 관심 성격을 해석합니다.</p></div><div class="person-analysis-mini-grid">${analysisBar("관심층 확장",gd("audienceExpansion","기존 관심층 밖으로 확장되는 신호"),scores.audienceExpansion,"blue")}${analysisBar("모바일 반응",gd("mobileResponse","모바일 중심 대중 반응 강도"),scores.mobileResponse,"mint")}${analysisBar("대중 침투력",gd("massPenetration","대중적 검색 반응의 강도"),scores.massPenetration,"orange")}${analysisBar("고관여 유지력",gd("coreRetention","지속적 정보탐색 관심"),scores.coreRetention,"navy")}</div></div>
    </section>

    <section class="content-card person-analysis-activity">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">ACTIVITY & MEDIA</span><h2>활동 · 미디어 분석</h2></div><span>6시간 · 24시간 · 7일 노출 속도 분석</span></div>
      <div class="person-analysis-dual"><div class="person-analysis-panel"><h3>정치 활동성</h3>${analysisBar("활동성",gd("activity","최근 정치·행정 활동 노출"),scores.activity,"orange")}${analysisBar("활동 가속도",gd("activityAcceleration","최근 노출 증가 속도"),scores.activityAcceleration,"red")}${analysisBar("활동 집중도",gd("activityConcentration","최근 시점에 활동이 몰린 정도"),scores.activityConcentration,"mint")}${analysisBar("활동 지속성",gd("activityPersistence","단발성이 아닌 지속 노출"),scores.activityPersistence,"navy")}</div><div class="person-analysis-panel"><h3>미디어 움직임</h3>${analysisBar("뉴스 가속도",gd("newsAcceleration","보도 발생 속도의 변화"),scores.newsAcceleration,"red")}${analysisBar("이슈 신선도",gd("issueFreshness","최근 발생 이슈의 비중"),scores.issueFreshness,"orange")}${analysisBar("이슈 지속성",gd("issuePersistence","관심이 이어지는 힘"),scores.issuePersistence,"blue")}${analysisBar("매체 다양성",gd("mediaDiversity","여러 언론사로 확산된 정도"),scores.mediaDiversity,"violet")}</div></div>
    </section>

    <section class="content-card person-analysis-issue">
      <div class="section-title person-analysis-title"><div><span class="eyebrow">ISSUE TRANSITION</span><h2>이슈 · 관심 전이 분석</h2></div><span>뉴스와 검색 반응의 동조·괴리 분석</span></div>
      <div class="person-analysis-transition-grid">${analysisMetric("뉴스→검색 전이",gd("newsSearchTransition","뉴스 노출과 검색 반응의 동조 신호"),scores.newsSearchTransition,"mint")}${analysisMetric("이슈 유입",gd("issueInflux","새로운 이슈로 관심이 유입되는 강도"),scores.issueInflux,"orange")}${analysisMetric("미디어/대중 괴리",gd("mediaPublicGap",mediaPublic.label||"보도와 대중 반응의 간격"),scores.mediaPublicGap,"blue")}${analysisMetric("이슈 폭발력",gd("issueExplosiveness","단기간 관심이 급격히 집중되는 정도"),scores.issueExplosiveness,"red")}</div>
      <div class="person-analysis-diagnosis"><span>정참시 종합진단</span><strong>${esc(signal.label||"분석 데이터 대기")}</strong><p>${esc(signal.diagnosis||"검색과 뉴스 데이터를 바탕으로 현재 관심 국면을 분석합니다.")}</p></div>
    </section>

    <details class="person-analysis-deep content-card">
      <summary><span><small>DEEP ANALYSIS</small><b>정참시 심층분석 더보기</b></span><em>+</em></summary>
      <div class="person-analysis-deep-body"><div class="person-analysis-deep-grid"><article><h3>관심 전이</h3>${analysisBar("뉴스→검색 전이",gd("newsSearchTransition","미디어 노출과 검색 행동의 동조"),scores.newsSearchTransition,"mint")}${analysisBar("미디어/대중 괴리",gd("mediaPublicGap",mediaPublic.label||"보도량과 대중 반응 간 차이"),scores.mediaPublicGap,"blue")}${analysisBar("관심층 확장",gd("audienceExpansion","새로운 관심층 유입 신호"),scores.audienceExpansion,"orange")}</article><article><h3>시간 흐름</h3>${analysisBar("단기 가속",gd("newsAcceleration","최근 6시간 뉴스 속도"),scores.newsAcceleration,"red")}${analysisBar("일간 집중",gd("activityConcentration","24시간 활동 집중도"),scores.activityConcentration,"orange")}${analysisBar("주간 지속",gd("activityPersistence","7일 관심 유지력"),scores.activityPersistence,"navy")}</article><article><h3>이슈 구조</h3>${analysisBar("이슈 신선도",gd("issueFreshness","최근 이슈 집중 신호"),scores.issueFreshness,"violet")}${analysisBar("대중 침투",gd("massPenetration","검색 반응 확산 강도"),scores.massPenetration,"mint")}${analysisBar("이슈 폭발",gd("issueExplosiveness","단기 관심 집중도"),scores.issueExplosiveness,"red")}</article></div><div class="person-analysis-trend-shell"><div><span>ANALYSIS TREND</span><h3>관심 변화 · NOW 이력</h3><p>게시 이력이 누적될수록 현재 분석점수와 순위 변화의 시간축을 확장할 수 있습니다.</p></div><div class="person-analysis-trend-placeholder"><i></i><i></i><i></i><i></i><i></i><i></i></div></div></div>
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
  const photoMarkup=photo ? `<img data-politician-photo src="${esc(photo.url)}" alt="" width="${photo.width}" height="${photo.width}" loading="eager" decoding="async" fetchpriority="high">` : "";
  const photoNotice=photo
    ? ` · 사진: <a href="${esc(photo.sourcePage||"#")}" target="_blank" rel="noopener noreferrer">${esc(photo.attribution||"프로필 사진")}</a>${photo.licenseUrl?` · <a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(photo.license||"라이선스")}</a>`:""}`
    : " · 사진은 순차 연결 중";
  const rank=n(row?.rank),score=n(row?.score),publishedAt=dateTime(live?.publishedAt);
  const liveHero=row?`<div class="person-hero-now"><span>NOW RANK</span><strong>#${fmt(rank)}</strong>${trendMarkup(live)}<small>NOW 지수 ${score.toFixed(1)} · ${esc(publishedAt||"최근 게시")}</small></div>`:`<div class="person-hero-now is-empty"><span>NOW RANK</span><strong>—</strong><small>게시 데이터 대기</small></div>`;
  const newsSection=row?`<section class="content-card person-recent-news"><div class="section-title"><h2>최근 뉴스</h2><span>분석 근거 · 최근 7일 최대 6건</span></div>${recentNews(news)}</section>`:"";
  return pageShell(`<main class="subpage person-live-detail-page person-analysis-report-page">
    <section class="person-detail-hero person-live-hero content-card">
      <div class="person-detail-photo ${photo ? "has-photo" : ""}"${photo ? ` style="--photo-position:${esc(photo.focus)}"` : ""}>${photoMarkup}</div>
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
    <section class="content-card"><div class="notice-box">기본 텍스트 출처: ${esc(p.source)}${photoNotice} · NOW 데이터는 관리자에서 게시한 최신 스냅샷 기준입니다. 분석지표는 검색·뉴스 데이터를 전체 정치인 분포와 시간대별 흐름에 따라 정참시 점수체계로 재해석한 상대지표입니다.</div></section>
  </main>`);
}
