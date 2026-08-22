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
function nowMetric(label,value,sub,cls=""){
  return `<article class="person-now-metric ${cls}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(sub||"")}</span></article>`;
}
function searchSplit(search={}){
  const pc=n(search.monthlyPcQcCnt),mobile=n(search.monthlyMobileQcCnt),total=n(search.monthlyTotalQcCnt)||pc+mobile;
  const pcPct=total?Math.round(pc*100/total):0,mobilePct=total?100-pcPct:0;
  return `<div class="person-search-card"><div class="person-data-card-head"><div><span>NAVER SEARCH ADS</span><h3>월간 검색 관심</h3></div><strong>${fmt(total)}<small>회</small></strong></div><div class="search-split-row"><div><span>PC 검색량</span><b>${fmt(pc)}</b></div><i><em style="width:${pcPct}%"></em></i><small>${pcPct}%</small></div><div class="search-split-row mobile"><div><span>모바일 검색량</span><b>${fmt(mobile)}</b></div><i><em style="width:${mobilePct}%"></em></i><small>${mobilePct}%</small></div><p>PC와 모바일 검색량을 합산한 네이버 월간 검색 관심도입니다.</p></div>`;
}
function newsPulse(news={}){
  return `<div class="person-news-pulse"><div class="person-data-card-head"><div><span>NEWS PULSE</span><h3>최근 뉴스 흐름</h3></div><strong>${fmt(news.count24)}<small>24시간</small></strong></div><div class="news-pulse-grid"><article><small>최근 6시간</small><b>${fmt(news.count6)}건</b><span>가장 빠른 이슈 변화</span></article><article><small>최근 24시간</small><b>${fmt(news.count24)}건</b><span>오늘의 뉴스 노출</span></article><article><small>최근 7일</small><b>${fmt(news.count7d)}건</b><span>일주일 관심 흐름</span></article><article><small>출처 다양성</small><b>${fmt(news.sources24)}곳</b><span>24시간 언론사 기준</span></article></div></div>`;
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

export async function renderPersonDetail(id){
  const p=getPersonSlotById(id);
  if(!p)return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><div class="empty-icon">?</div><h2>존재하지 않는 정치인입니다</h2><button class="primary-btn" type="button" data-go="/now">전체 정치인</button></section></main>`);
  const session=getUserSession(); recordRecentPerson(p.id);
  const favorite=session.authenticated&&isFavoritePerson(p.id);
  const activityTitle=p.type==="assembly"?"의정활동":"행정활동";
  const [live,photo]=await Promise.all([getNowPerson(p.id),Promise.resolve(politicianPhoto(p.id,"profile"))]);
  const row=live?.row||null,search=row?.search||{},news=row?.news||{};
  const photoMarkup=photo ? `<img data-politician-photo src="${esc(photo.url)}" alt="" width="${photo.width}" height="${photo.width}" loading="eager" decoding="async" fetchpriority="high">` : "";
  const photoNotice=photo
    ? ` · 사진: <a href="${esc(photo.sourcePage||"#")}" target="_blank" rel="noopener noreferrer">${esc(photo.attribution||"프로필 사진")}</a>${photo.licenseUrl?` · <a href="${esc(photo.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(photo.license||"라이선스")}</a>`:""}`
    : " · 사진은 순차 연결 중";
  const totalSearch=n(search.monthlyTotalQcCnt),rank=n(row?.rank),score=n(row?.score),publishedAt=dateTime(live?.publishedAt);
  const liveHero=row?`<div class="person-hero-now"><span>NOW RANK</span><strong>#${fmt(rank)}</strong>${trendMarkup(live)}<small>점수 ${score.toFixed(1)} · ${esc(publishedAt||"최근 게시")}</small></div>`:`<div class="person-hero-now is-empty"><span>NOW RANK</span><strong>—</strong><small>게시 데이터 대기</small></div>`;
  const liveSection=row?`<section class="content-card person-now-section"><div class="section-title person-now-title"><div><span class="eyebrow">LIVE POLITICAL PROFILE</span><h2>지금 이 인물</h2></div><span>${esc(publishedAt?`${publishedAt} 게시 데이터`:"최근 게시 데이터")}</span></div><div class="person-now-metrics">${nowMetric("NOW Rank",`#${fmt(rank)}`,live.rankDelta?`${live.rankDelta>0?"▲":"▼"} ${Math.abs(live.rankDelta)}계단`:"현재 순위","rank")}${nowMetric("NOW Score",score.toFixed(1),"검색 + 뉴스 종합","score")}${nowMetric("월간 검색",fmt(totalSearch),"PC + 모바일","search")}${nowMetric("24시간 뉴스",`${fmt(news.count24)}건`,`${fmt(news.sources24)}개 출처`,"news")}</div><div class="why-now-card"><span>WHY NOW</span><div><h3>왜 지금 주목받나요?</h3><p>${esc(live.whyNow||"")}</p></div></div><div class="person-live-data-grid">${searchSplit(search)}${newsPulse(news)}</div></section>`:`<section class="content-card person-now-section person-now-empty"><div class="section-title"><h2>지금 이 인물</h2><span>NOW 데이터 대기</span></div><div class="empty-state"><h2>게시된 NOW 데이터가 아직 없습니다</h2><p>관리자에서 데이터를 수집하고 게시하면 검색량·뉴스·순위가 이 영역에 자동 반영됩니다.</p></div></section>`;
  const newsSection=row?`<section class="content-card person-recent-news"><div class="section-title"><h2>최근 뉴스</h2><span>최근 7일 · 최대 6건</span></div>${recentNews(news)}</section>`:"";
  return pageShell(`<main class="subpage person-live-detail-page">
    <section class="person-detail-hero person-live-hero content-card">
      <div class="person-detail-photo ${photo ? "has-photo" : ""}"${photo ? ` style="--photo-position:${esc(photo.focus)}"` : ""}>${photoMarkup}</div>
      <div class="person-detail-title"><span class="eyebrow">${esc(p.roleLabel)} · LIVE PROFILE</span><h1>${esc(p.name)}</h1><p class="person-current-role">${esc(p.office||p.roleLabel)}</p><p>${esc(p.party)} · ${esc(p.jurisdiction)}</p><div class="person-detail-badges"><span>${esc(p.roleLabel)}</span><span>${esc(p.terms||"기본정보")}</span><span>${esc(p.type==="assembly"?(p.committee||"국회의원"):p.jurisdiction)}</span></div></div>
      ${liveHero}
      <div class="detail-action-bar"><button type="button" class="ghost-btn ${favorite?"active":""}" data-person-favorite="${esc(p.id)}">${favorite?"★ 즐겨찾기됨":"☆ 즐겨찾기"}</button><button type="button" class="ghost-btn" data-go="/compare?a=${esc(p.id)}">비교하기</button></div>
    </section>
    ${liveSection}
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
    <section class="content-card"><div class="notice-box">기본 텍스트 출처: ${esc(p.source)}${photoNotice} · NOW 데이터는 관리자에서 게시한 최신 스냅샷 기준입니다.</div></section>
  </main>`);
}
