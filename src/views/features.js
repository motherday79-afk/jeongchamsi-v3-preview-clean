import { getDomain, getAuthorProfiles } from "../core/repository.js";
import { pageShell, esc } from "./layout.js?v=alpha6.0.36.22-author-partner-hub";
import { GOVERNMENT_SEED } from "../data/government-seed.js?v=alpha6.0.20-function-detail";
import {
  listAssemblyMembers,
  listMetropolitanLeaders,
  listBasicLeaders,
  listAllPoliticians,
  getPersonSlotById,
  PERSON_COUNTS
} from "../data/person-provider.js?v=alpha6.0.20-function-detail";
import {
  getUserSession,
  getUserActivity,
  hasVotedPoll,
  hasGenerationVote,
  generationVoteFor,
  hasNationalEvaluationVote,
  isPostLiked
} from "../core/user.js";
import { authorIdentity, authorOwnerIds } from "./author-identity.js?v=alpha6.0.36.22-author-partner-hub";

function pct(option, options) {
  const total = (options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
  return total ? Math.round(Number(option.votes || 0) * 100 / total) : 0;
}
function bodyHtml(body = "") {
  return String(body || "").split(/\n{2,}|\r?\n/).map(x => x.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("") || `<p>본문이 없습니다.</p>`;
}
function formatDate(v) {
  if (!v) return "";
  try { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v)); }
  catch { return ""; }
}
function slotLabel(person) {
  if (person?.connected && person?.name) return `${person.name}${person.party ? ` · ${person.party}` : ""}${person.jurisdiction ? ` · ${person.jurisdiction}` : ""}`;
  return `${person.roleLabel} ${String(person.slot).padStart(3, "0")}`;
}
const PARTY_ALIASES = Object.freeze([
  { canonical:"더불어민주당", aliases:["더불어민주당","더불어 민주당","민주당","더민주"] },
  { canonical:"국민의힘", aliases:["국민의힘","국민의 힘","국힘"] },
  { canonical:"조국혁신당", aliases:["조국혁신당","조국 혁신당","혁신당","조국당"] },
  { canonical:"개혁신당", aliases:["개혁신당","개혁 신당"] },
  { canonical:"진보당", aliases:["진보당","진보 당"] },
  { canonical:"기본소득당", aliases:["기본소득당","기본 소득당"] },
  { canonical:"사회민주당", aliases:["사회민주당","사회 민주당"] }
]);
function searchNorm(v="") {
  return String(v || "").toLowerCase().replace(/[\s·._\-()'"]/g, "");
}
function resolvePartyAlias(query="") {
  const q=searchNorm(query);
  if (!q) return null;
  return PARTY_ALIASES.find(x => x.aliases.some(a => searchNorm(a) === q)) || null;
}
function searchTerms(query="") {
  const raw=String(query||"").trim();
  const party=resolvePartyAlias(raw);
  const terms=new Set([searchNorm(raw)]);
  if (party) {
    terms.add(searchNorm(party.canonical));
    party.aliases.forEach(x=>terms.add(searchNorm(x)));
  }
  return { party, terms:[...terms].filter(Boolean) };
}
function textMatches(text="", terms=[]) {
  const hay=searchNorm(text);
  return terms.some(t => t && hay.includes(t));
}
function personSearchText(p) {
  return [p?.name,p?.party,p?.region,p?.jurisdiction,p?.office,p?.terms,p?.committee,p?.roleLabel,p?.id].filter(Boolean).join(" ");
}
function memberAgeGroup(birthYear) {
  const year = Number(birthYear || 0);
  const current = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1900 || year > current) return "";
  const age = current - year;
  if (age >= 10 && age < 20) return "10대";
  if (age >= 20 && age < 30) return "20대";
  if (age >= 30 && age < 40) return "30대";
  if (age >= 40 && age < 50) return "40대";
  if (age >= 50 && age < 60) return "50대";
  if (age >= 60) return "60대+";
  return "";
}
function personOptions(selected = "", ids = null) {
  const allowed = Array.isArray(ids) && ids.length ? new Set(ids) : null;
  return listAllPoliticians().filter(p => !allowed || allowed.has(p.id)).map(p => `<option value="${esc(p.id)}" ${p.id === selected ? "selected" : ""}>${esc(slotLabel(p))}</option>`).join("");
}
function emptyLine(label) {
  return `<div><dt>${esc(label)}</dt><dd><span class="info-empty"></span></dd></div>`;
}
function textItems(items, emptyCount = 4) {
  if (items?.length) return `<div class="structured-list">${items.map(x => `<div>${esc(x)}</div>`).join("")}</div>`;
  return `<div class="timeline-shell">${Array.from({ length: emptyCount }, () => `<div class="timeline-row"><span class="timeline-year"></span><div class="timeline-copy"><i></i><i></i></div></div>`).join("")}</div>`;
}

export async function renderPresident() {
  const stored = await getDomain("president");
  const sp = GOVERNMENT_SEED.profile;
  const rp = stored.profile || {};
  const p = {
    ...sp,
    ...Object.fromEntries(Object.entries(rp).filter(([,v]) => String(v || "").trim()))
  };
  const chooseList = (storedList, seedList) => Array.isArray(storedList) && storedList.length ? storedList : seedList;
  const career = chooseList(stored.career, GOVERNMENT_SEED.career);
  const elections = chooseList(stored.elections, GOVERNMENT_SEED.elections);
  const policies = chooseList(stored.policies, GOVERNMENT_SEED.policies);
  const pledges = chooseList(stored.pledges, GOVERNMENT_SEED.pledges);
  const nationalTasks = chooseList(stored.nationalTasks, GOVERNMENT_SEED.nationalTasks);
  const vision = String(stored.vision || "").trim() || GOVERNMENT_SEED.vision;
  const leadership = GOVERNMENT_SEED.leadership;
  const cabinet = GOVERNMENT_SEED.cabinet;

  return pageShell(`<main class="subpage president-page">
    <section class="page-hero"><span class="eyebrow">PRESIDENT · GOVERNMENT</span><h1>대통령 · 정부 주요 인사</h1><p>대통령 기본정보와 국정 방향, 주요 행정인사를 한 페이지에서 확인합니다. 인사정보는 ${esc(GOVERNMENT_SEED.verifiedAt)} 기준 공식 공개자료를 바탕으로 정리했습니다.</p></section>
    <section class="person-detail-hero content-card"><div class="person-detail-photo ${rp.photo ? "has-photo" : ""}" ${rp.photo ? `style="background-image:url('${esc(rp.photo)}')"` : ""}></div><div class="person-detail-title"><span class="eyebrow">PRESIDENT PROFILE</span><h1>${esc(p.name)}</h1><p>${esc(p.office || "대한민국 대통령")} · ${esc(p.term)}</p><div class="person-detail-badges"><span>제21대 대통령</span><span>${esc(p.party)}</span><span>2025.06.04 취임</span></div></div><div class="detail-action-bar"><button class="ghost-btn" type="button" data-go="/search?q=${encodeURIComponent(p.name)}">통합검색</button><button class="ghost-btn" type="button" data-go="/news">관련 NEWS</button></div></section>

    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>기본정보</h2><span>대통령 프로필</span></div><dl class="info-list"><div><dt>이름</dt><dd>${esc(p.name)}</dd></div><div><dt>직책</dt><dd>${esc(p.office)}</dd></div><div><dt>정치 경력</dt><dd>${esc(p.party)}</dd></div><div><dt>출생</dt><dd>${esc(p.birth)}</dd></div><div><dt>학력</dt><dd>${esc(p.education)}</dd></div></dl></section><section class="content-card"><div class="section-title"><h2>취임 · 임기</h2><span>대통령 재임정보</span></div><dl class="info-list"><div><dt>취임일</dt><dd>${esc(p.inauguratedAt)}</dd></div><div><dt>임기</dt><dd>${esc(p.term)}</dd></div><div><dt>최근 선거</dt><dd>2025년 제21대 대통령선거 당선</dd></div><div><dt>정부</dt><dd>국민주권정부</dd></div></dl></section></div>

    <section class="content-card"><div class="section-title"><h2>주요 경력</h2><span>정치 · 행정 경력</span></div>${textItems(career,6)}</section>
    <section class="content-card"><div class="section-title"><h2>선거 이력</h2><span>주요 당선 이력</span></div>${textItems(elections,6)}</section>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>국정 비전</h2><span>국정 방향</span></div><div class="article-body"><p>${esc(vision)}</p></div></section><section class="content-card"><div class="section-title"><h2>주요 정책</h2><span>정부 핵심 방향</span></div>${textItems(policies,6)}</section></div>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>핵심 약속</h2><span>국정 운영 원칙</span></div>${textItems(pledges,5)}</section><section class="content-card"><div class="section-title"><h2>5대 국정 방향</h2><span>청와대 공개 국정 방향</span></div>${textItems(nationalTasks,5)}</section></div>

    <section class="content-card government-section"><div class="section-title"><h2>국정 지휘부</h2><span>${esc(GOVERNMENT_SEED.verifiedAt)} 기준</span></div><div class="government-lead-grid">${leadership.map(x=>`<article><span class="government-avatar"></span><div><small>${esc(x.role)}</small><b>${esc(x.name)}</b><p>${esc(x.area)}</p><em>${esc(x.note)}</em></div></article>`).join("")}</div></section>

    <section class="content-card government-section"><div class="section-title"><h2>주요 부처 장관</h2><span>현재 주요 행정인사</span></div><div class="cabinet-grid">${cabinet.map(x=>`<article><span>${esc(x.office)}</span><b>${esc(x.name)}</b><small>${esc(x.title)}</small><p>${esc(x.area)}</p>${x.note ? `<em>${esc(x.note)}</em>` : ""}</article>`).join("")}</div><div class="notice-box">장관·고위공직자 인사는 변동 가능성이 있어 기준일을 함께 표시합니다. ${esc(GOVERNMENT_SEED.sourceLabel)}.</div></section>

    <section class="content-card"><div class="section-title"><h2>정참시 데이터</h2><span>실시간 지표는 후속</span></div><div class="metric-shell"><article><small>관심도</small><strong>—</strong><span>후속 연결</span></article><article><small>언급량</small><strong>—</strong><span>후속 연결</span></article><article><small>관련 설문</small><strong>—</strong><span>참여 데이터</span></article><article><small>세대별 평가</small><strong>—</strong><span>참여 데이터</span></article></div></section>
    <section class="content-card"><div class="section-title"><h2>관련 콘텐츠</h2><span>정참시 내부 연결</span></div><div class="related-grid"><article role="button" tabindex="0" data-go="/news"><b>정참시 NEWS</b><span>대통령·정부 관련 뉴스</span></article><article role="button" tabindex="0" data-go="/column"><b>COLUMN</b><span>관련 칼럼</span></article><article role="button" tabindex="0" data-go="/community"><b>정뮤니티</b><span>관련 시민 의견</span></article><article role="button" tabindex="0" data-go="/poll"><b>시민들의 선택</b><span>관련 설문</span></article></div></section>
  </main>`);
}

const NOW_TYPES = Object.freeze({
  assembly: { label: "국회의원", count: PERSON_COUNTS.assembly, get: listAssemblyMembers },
  metropolitan: { label: "광역단체장", count: PERSON_COUNTS.metropolitan, get: listMetropolitanLeaders },
  basic: { label: "기초단체장", count: PERSON_COUNTS.basic, get: listBasicLeaders }
});
function nowCard(person) {
  const title = person?.name || `${person.roleLabel} ${String(person.slot).padStart(3, "0")}`;
  const meta = [person?.party, person?.jurisdiction].filter(Boolean).join(" · ");
  const short = person?.type === "assembly"
    ? [person?.terms, person?.committee].filter(Boolean).join(" · ")
    : [person?.office, person?.terms].filter(Boolean).join(" · ");
  return `<a class="person-slot-card data-connected" href="/person/${esc(person.id)}" data-route aria-label="${esc(title)} 상세페이지"><span class="slot-no">#${String(person.slot).padStart(3, "0")}</span><div class="person-photo-placeholder"></div><div class="slot-lines"><b class="slot-data-name">${esc(title)}</b><span class="slot-data-meta">${esc(meta)}</span><span class="slot-data-short">${esc(short)}</span></div></a>`;
}
export async function renderNow(search = "") {
  const params = new URLSearchParams(search || "");
  const partyParam = String(params.get("party") || "").trim();
  const searchParam = String(params.get("search") || "").trim();
  const type = NOW_TYPES[params.get("type")] ? params.get("type") : "assembly";
  const requested = Number(params.get("limit") || 50);

  let all, label, total, nextBase, filterDescription;
  if (partyParam) {
    const party = resolvePartyAlias(partyParam)?.canonical || partyParam;
    all = listAllPoliticians().filter(p => searchNorm(p.party) === searchNorm(party));
    label = `${party} 정치인`;
    total = all.length;
    nextBase = `/now?party=${encodeURIComponent(party)}&limit=`;
    const counts = {
      assembly: all.filter(x=>x.type==="assembly").length,
      metropolitan: all.filter(x=>x.type==="metropolitan").length,
      basic: all.filter(x=>x.type==="basic").length
    };
    filterDescription = `국회의원 ${counts.assembly}명 · 광역단체장 ${counts.metropolitan}명 · 기초단체장 ${counts.basic}명`;
  } else if (searchParam) {
    const {terms}=searchTerms(searchParam);
    all = listAllPoliticians().filter(p => textMatches(personSearchText(p), terms));
    label = `‘${searchParam}’ 정치인`;
    total = all.length;
    nextBase = `/now?search=${encodeURIComponent(searchParam)}&limit=`;
    filterDescription = `이름·정당·지역·직책 기준 검색 결과`;
  } else {
    const meta = NOW_TYPES[type];
    all = meta.get();
    label = meta.label;
    total = meta.count;
    nextBase = `/now?type=${type}&limit=`;
    filterDescription = `543명 텍스트 기본정보 연결 완료 · 사진은 경량 벡터 아바타로 표시`;
  }

  const limit = (!partyParam && !searchParam && type === "metropolitan")
    ? total
    : Math.min(total, Math.max(50, Math.ceil(requested / 50) * 50));
  const shown = all.slice(0, limit);
  const remaining = Math.max(0, total - shown.length);
  const nextLimit = Math.min(total, shown.length + 50);
  const title = partyParam ? `${label} 전체보기` : searchParam ? `${label} 전체보기` : "NOW Rank 전체 정치인";

  return pageShell(`<main class="subpage now-directory-page"><section class="page-hero"><span class="eyebrow">NOW RANK · ALL POLITICIANS</span><h1>${esc(title)}</h1><p>${partyParam || searchParam ? esc(filterDescription) : "메인의 TOP 15는 요약입니다. 전체페이지에서는 국회의원 300명, 광역단체장 16명, 기초단체장 227명 등 총 543명을 탐색합니다."}</p><div class="capacity-line"><span>${esc(filterDescription)}</span><b>총 ${total}명</b></div></section>${!partyParam && !searchParam ? `<nav class="now-category-tabs" aria-label="정치인 분류">${Object.entries(NOW_TYPES).map(([key,x])=>`<button type="button" class="${type===key?"active":""}" data-go="/now?type=${key}&limit=50"><b>${x.label}</b><span>${x.count}명</span></button>`).join("")}</nav>` : `<div class="directory-filter-actions"><button class="ghost-btn" type="button" data-go="/now">전체 정치인 분류로 돌아가기</button><button class="ghost-btn" type="button" data-go="/search?q=${encodeURIComponent(partyParam||searchParam)}">통합검색 결과</button></div>`}<section class="content-card directory-section"><div class="section-title"><h2>${esc(label)}</h2><span>${shown.length} / ${total}명 표시</span></div>${shown.length ? `<div class="person-grid">${shown.map(nowCard).join("")}</div>${remaining ? `<div class="load-more-wrap"><button class="primary-btn load-more-btn" type="button" data-now-load-more="${nextBase}${nextLimit}">50명 더 불러오기 <span>남은 ${remaining}명</span></button></div>` : `<div class="directory-complete">${esc(label)} ${total}명 전체를 불러왔습니다.</div>`}` : `<div class="empty-state"><h2>해당 정치인이 없습니다.</h2><p>검색어나 정당명을 다시 확인해 주세요.</p></div>`}</section></main>`);
}

export async function renderPolls(search = "") {
  const params = new URLSearchParams(search || "");
  const focusPollId = String(params.get("pollId") || "");
  const preselectedOptionId = String(params.get("option") || "");
  const data = await getDomain("polls");
  const allItems = (data.items || []).filter(x => x.published !== false);
  const items = focusPollId ? allItems.filter(x => String(x.id) === focusPollId) : allItems;
  const session = getUserSession();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">CITIZENS’ CHOICE</span><h1>시민들의 선택</h1><p>${focusPollId ? "메인에서 고른 설문의 전체 선택지를 확인한 뒤 최종 투표하세요." : "선택지를 고른 뒤 확인 버튼을 눌러야 투표가 완료됩니다."}</p></section><section class="content-card">${items.length ? `<div class="poll-page-list">${items.map(poll => {
    const voted = session.authenticated && hasVotedPoll(poll.id);
    const total = (poll.options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
    const preselected = !voted && String(poll.id) === focusPollId && (poll.options || []).some(x => String(x.id) === preselectedOptionId) ? preselectedOptionId : "";
    const choices = (poll.options || []).map(opt => {
      const selected = preselected && String(opt.id) === String(preselected);
      return `<button type="button" ${voted ? "disabled" : `data-poll-select data-option-id="${esc(opt.id)}"`} class="${selected ? "selected" : ""}" aria-pressed="${selected ? "true" : "false"}"><span>${esc(opt.label)}</span><i><em style="width:${pct(opt, poll.options)}%"></em></i><b>${pct(opt, poll.options)}%</b></button>`;
    }).join("");
    return `<article class="poll-live-card" data-poll-scope data-poll-id="${esc(poll.id)}" ${preselected ? `data-selected-option="${esc(preselected)}"` : ""}><span class="status-pill"><b>POLL</b>${voted ? "참여완료" : "진행중"}</span><h2>${esc(poll.question)}</h2><p>${esc(poll.description || "정참시 참여자 기반 설문")} · ${total.toLocaleString("ko-KR")}명 참여</p><div class="poll-choice-list">${choices}</div>${voted ? `<small>이 설문에 이미 참여했습니다.</small>` : `<div class="poll-confirm-row"><span data-poll-select-state>${preselected ? "메인에서 선택한 항목입니다. 전체 선택지를 확인해 주세요." : "선택지를 선택해 주세요."}</span><button class="primary-btn" type="button" data-poll-confirm ${preselected ? "" : "disabled"}>투표 확인</button></div>`}</article>`;
  }).join("")}</div>${focusPollId ? `<div class="inline-actions top-gap"><button class="ghost-btn" type="button" data-go="/poll">전체 설문 보기</button></div>` : ""}` : `<div class="empty-state tall"><h2>${focusPollId ? "해당 설문을 찾을 수 없습니다." : "등록된 설문이 없습니다."}</h2><p>${focusPollId ? "설문이 종료되었거나 비공개 상태일 수 있습니다." : "관리자에서 설문을 만들면 이곳과 메인에 동시에 표시됩니다."}</p></div>`}</section></main>`);
}

export async function renderKeywords() {
  const data = await getDomain("keywords");
  const items = (data.items || []).filter(x => x.published !== false).slice(0, 15);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">LIVE POLITICAL KEYWORDS</span><h1>실시간 정치키워드</h1><p>메인에서는 상위 8개, 전체페이지에서는 최대 15개까지 보여줍니다.</p></section><section class="content-card"><div class="section-title"><h2>실시간 TOP 15</h2><span>${items.length}개 등록</span></div>${items.length ? `<div class="keyword-rank-list">${items.map((x, i) => `<article><strong>${i + 1}</strong><b>${esc(x.label)}</b><span>${esc(x.delta || "")}</span></article>`).join("")}</div>` : `<div class="empty-state"><h2>등록된 키워드가 없습니다.</h2><p>관리자에서 최대 15개 키워드를 등록하면 메인과 이 페이지에 표시됩니다.</p></div>`}</section></main>`);
}

function trendingItems() {
  return listAllPoliticians().slice(0,10).map((p,i) => ({
    id:p.id,
    rank:i+1,
    title:p.name || `${p.roleLabel} ${String(p.slot).padStart(3,"0")}`,
    meta:[p.party,p.jurisdiction].filter(Boolean).join(" · "),
    href:`/person/${p.id}`
  }));
}
export async function renderTrending() {
  const items = trendingItems();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">TRENDING NOW</span><h1>실시간 급상승 정치인</h1><p>실시간 변동 데이터가 연결되기 전에는 NOW Rank 순위를 기준으로 정치인을 보여줍니다.</p></section><section class="content-card"><div class="section-title"><h2>정치인 TOP 10</h2><span>NOW Rank fallback</span></div>${items.length ? `<div class="trending-rank-list">${items.map((x, i) => `<button type="button" data-go="${esc(x.href || `/search?q=${encodeURIComponent(x.title || "")}`)}"><strong>${i + 1}</strong><b>${esc(x.title)}${x.meta ? `<small>${esc(x.meta)}</small>` : ""}</b><span>상세 →</span></button>`).join("")}</div>` : `<div class="empty-state"><h2>급상승 데이터가 없습니다.</h2><p>관리자에서 직접 TOP 10을 입력하거나 게시물이 쌓이면 참여지표 기반으로 구성됩니다.</p></div>`}</section></main>`);
}

export async function renderAcademy() {
  const data = await getDomain("academy");
  const session = getUserSession();
  const activity = getUserActivity();
  const config = {
    eyebrow:"JEONGCHAMSI ACADEMY",
    title:"정참시 아카데미",
    headline:"정치의 꿈을 실제 준비로.",
    description:"정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳.",
    cta:"수강 가능 일정 확인",
    ...(data.config || {})
  };
  const slots = (data.slots || []).filter(x => x.published !== false).slice().sort((a,b)=>`${a.date||""} ${a.startTime||""}`.localeCompare(`${b.date||""} ${b.startTime||""}`));
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">${esc(config.eyebrow)}</span><h1>${esc(config.title)}</h1><p>${esc(config.description)}</p>${session.authenticated && session.user?.role === "admin" ? `<div class="inline-actions top-gap"><button class="ghost-btn" type="button" data-go="/admin?tab=academy">아카데미 편집</button></div>` : ""}</section><section class="content-card academy-detail-intro"><h2>${esc(config.headline)}</h2><p>${esc(config.description)}</p></section><section class="content-card"><div class="section-title"><h2>수강 가능 일정</h2><span>${slots.length}개</span></div>${slots.length ? `<div class="academy-slot-list">${slots.map(s => {
    const applied = (activity.academyApplications || []).includes(String(s.id));
    const status = s.status || (s.closed ? "closed" : "open");
    const time = [s.startTime,s.endTime].filter(Boolean).join("–");
    const unavailable = status === "closed" || status === "scheduled";
    const label = status === "closed" ? "마감" : status === "scheduled" ? "예정" : applied ? "신청완료" : session.authenticated ? "수강신청" : "로그인 후 신청";
    return `<article><div><b>${esc(s.date || "날짜 미정")}${time ? ` · ${esc(time)}` : ""}</b><span>${esc(s.title || "정참시 아카데미")} · ${esc(s.description || "")}</span></div><button type="button" data-academy-apply="${esc(s.id)}" ${unavailable || applied ? "disabled" : ""}>${label}</button></article>`;
  }).join("")}</div>` : `<div class="empty-state"><h2>등록된 일정이 없습니다.</h2><p>관리자에서 날짜와 시간을 지정해 일정을 등록하면 메인과 이곳에 동시에 표시됩니다.</p></div>`}</section></main>`);
}

function publishedItsme(data) { return (data.items || []).filter(x => x.published !== false).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); }
export async function renderItsme(search = "") {
  const data = await getDomain("itsme");
  const session = getUserSession();
  const searchParams = new URLSearchParams(search || "");
  const category = searchParams.get("category") || "";
  const q = String(searchParams.get("q") || "").trim();
  const qNorm = q.toLowerCase().replace(/\s+/g,"");
  const items = publishedItsme(data).filter(x => (!category || x.category === category) && (!q || `${x.title||""} ${x.summary||""} ${x.body||""} ${x.category||""} ${x.author||""}`.toLowerCase().replace(/\s+/g,"").includes(qNorm)));
  const authorProfiles = await getAuthorProfiles(authorOwnerIds(items));
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">IT’S ME · POLICY PROPOSAL</span><h1>IT’S ME</h1><p>“내가 대통령이라면, 내가 국회의원이라면, 내가 시장이라면, 내가 장관이라면”을 말머리로 정책과 아이디어를 직접 제안하는 참여 게시판입니다.</p></section><section class="content-card"><div class="board-toolbar"><div class="itsme-category-tabs"><button type="button" class="${!category ? "active" : ""}" data-go="/itsme">전체</button>${(data.categories || []).map(c => `<button type="button" class="${category === c ? "active" : ""}" data-go="/itsme?category=${encodeURIComponent(c)}">${esc(c)}</button>`).join("")}</div>${session.authenticated ? `<button class="primary-btn" type="button" data-go="/itsme/write">IT’S ME 글쓰기</button>` : `<button class="primary-btn" type="button" data-go="/login">로그인 후 글쓰기</button>`}</div>${items.length ? `<div class="board-list itsme-board-list">${items.map(item => `<article class="no-thumb"><a href="/itsme/${esc(item.id)}" data-route><span class="type">${esc(item.category || "IT’S ME")}</span><h2>${esc(item.title)}</h2><p>${esc(item.summary || item.body || "")}</p></a><small>${authorIdentity(item.author || "정참시 회원", item.ownerId, authorProfiles)} · ${formatDate(item.createdAt)} · 좋아요 ${Number(item.likes || 0)}</small></article>`).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">ME</div><h2>아직 등록된 제안이 없습니다.</h2><p>로그인 후 첫 정책 제안을 작성할 수 있습니다.</p></div>`}</section></main>`);
}
export async function renderItsmeWrite(search = "") {
  const session = getUserSession();
  if (!session.authenticated) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>로그인이 필요합니다.</h2><p>IT’S ME 글쓰기는 회원 참여 기능입니다.</p><button class="primary-btn" type="button" data-go="/login">로그인</button></section></main>`);
  const data = await getDomain("itsme");
  const id = new URLSearchParams(search || "").get("id") || "";
  const old = id ? (data.items || []).find(x => String(x.id) === id) : null;
  const isAdmin = session.user?.role === "admin";
  if (old && String(old.ownerId || "") !== String(session.user.id) && !isAdmin) return pageShell(`<main class="subpage"><section class="content-card empty-state"><h2>수정 권한이 없습니다.</h2><button class="primary-btn" type="button" data-go="/itsme">목록으로</button></section></main>`);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">WRITE · IT’S ME</span><h1>${old ? "IT’S ME 제안 수정" : "IT’S ME 제안 작성"}</h1><p>말머리를 선택하고 내가 그 역할이라면 추진하고 싶은 정책이나 아이디어를 작성하세요.</p></section><section class="content-card"><form class="member-post-form" data-user-post-form="itsme" data-item-id="${esc(old?.id || "")}"><label>말머리<select name="category" required>${(data.categories || []).map(c => `<option ${old?.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label><label>제목<input name="title" maxlength="30" required value="${esc(old?.title || "")}" placeholder="제안의 핵심을 제목으로 작성하세요"><span class="field-help">최대 30자</span></label><label>한 줄 요약<input name="summary" maxlength="15" value="${esc(old?.summary || "")}" placeholder="목록용 짧은 요약"><span class="field-help">최대 15자</span></label><label>내용<textarea name="body" rows="14" maxlength="3000" required placeholder="정책·아이디어와 이유를 자유롭게 작성하세요.">${esc(old?.body || "")}</textarea><span class="field-help">최대 3,000자</span></label><div class="auth-error" data-user-post-error></div><div class="admin-form-actions"><button class="primary-btn" type="submit">${old ? "수정 저장" : "등록"}</button><button class="ghost-btn" type="button" data-go="${old ? `/itsme/${esc(old.id)}` : "/itsme"}">취소</button></div></form></section></main>`);
}
export async function renderItsmeDetail(id) {
  let data = await getDomain("itsme");
  let item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  if (!item) {
    data = await getDomain("itsme", { fresh:true });
    item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  }
  if (!item) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>IT’S ME 게시물을 찾을 수 없습니다.</h2><button class="primary-btn" type="button" data-go="/itsme">목록으로</button></section></main>`);
  const session = getUserSession();
  const liked = session.authenticated && isPostLiked("itsme", id);
  const isAdmin = session.authenticated && session.user?.role === "admin";
  const mine = session.authenticated && String(item.ownerId || "") === String(session.user.id);
  const canManage = isAdmin || mine;
  const commentsData = await getDomain("comments");
  const comments = (commentsData.items || []).filter(c => c.published !== false && c.domain === "itsme" && String(c.postId) === String(id)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const authorProfiles = await getAuthorProfiles(authorOwnerIds([item, ...comments]));
  return pageShell(`<main class="subpage"><article class="content-card article-detail"><span class="eyebrow">IT’S ME · ${esc(item.category || "정책 제안")}</span><h1>${esc(item.title)}</h1><div class="article-meta"><span>${authorIdentity(item.author || "정참시 회원", item.ownerId, authorProfiles)}</span><span>${formatDate(item.createdAt)}</span><span>좋아요 ${Number(item.likes || 0)}</span></div>${item.summary ? `<div class="article-lead">${esc(item.summary)}</div>` : ""}<div class="article-body">${bodyHtml(item.body)}</div><div class="article-actions"><button type="button" class="ghost-btn ${liked ? "active" : ""}" data-post-like="itsme" data-post-id="${esc(id)}">${liked ? "♥ 좋아요 취소" : "♡ 좋아요"}</button>${canManage ? `<button type="button" class="ghost-btn" data-go="/itsme/write?id=${encodeURIComponent(id)}">수정</button><button type="button" class="danger-btn" data-user-post-delete="itsme" data-id="${esc(id)}">삭제</button>` : ""}<button type="button" class="primary-btn" data-go="/itsme">IT’S ME 목록으로</button></div></article><section class="content-card comment-section"><div class="section-title"><h2>댓글</h2><span>${comments.length}개</span></div>${session.authenticated ? `<form class="comment-form" data-comment-form="itsme" data-post-id="${esc(id)}"><textarea name="comment" rows="3" maxlength="1000" required placeholder="의견을 남겨보세요."></textarea><div class="admin-form-actions"><button class="primary-btn" type="submit">댓글 등록</button><span data-comment-state></span></div></form>` : `<div class="member-login-prompt"><span>댓글은 로그인 후 작성할 수 있습니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`}${comments.length ? `<div class="comment-list">${comments.map(c => `<article><div><b>${authorIdentity(c.author, c.ownerId, authorProfiles)}</b><span>${formatDate(c.createdAt)}</span></div><p>${esc(c.text)}</p></article>`).join("")}</div>` : `<div class="empty-inline">아직 댓글이 없습니다.</div>`}</section></main>`);
}

function compareSampleMetrics(person) {
  const slot = Number(person?.slot || 1);
  const typeSeed = person?.type === "assembly" ? 7 : person?.type === "metropolitan" ? 13 : 19;
  return {
    활동도: 55 + ((slot * 7 + typeSeed) % 36),
    관심도: 52 + ((slot * 11 + typeSeed) % 39),
    참여도: 50 + ((slot * 13 + typeSeed) % 41),
    정책주목도: 54 + ((slot * 17 + typeSeed) % 37)
  };
}
function compareNarrative(person, metrics, side) {
  const entries = Object.entries(metrics).sort((a, b) => b[1] - a[1]);
  const strong = entries[0];
  const weak = entries[entries.length - 1];
  return `<article><span>${side} 분석</span><h3>${esc(slotLabel(person))}</h3><p><b>${esc(strong[0])}</b>가 ${strong[1]}점으로 가장 강하게 나타납니다. 반면 <b>${esc(weak[0])}</b>는 ${weak[1]}점으로 상대적으로 약합니다. 강점은 유지하면서 ${esc(weak[0])} 관련 활동·정책 설명·시민 접점을 보완하면 균형 잡힌 평가로 이어질 수 있습니다.</p></article>`;
}

export async function renderCompare(search = "") {
  const params = new URLSearchParams(search || "");
  const a = params.get("a") || "";
  const b = params.get("b") || "";
  const pa = getPersonSlotById(a);
  const pb = getPersonSlotById(b);
  let result = "";
  if (pa && pb) {
    const ma = compareSampleMetrics(pa);
    const mb = compareSampleMetrics(pb);
    const labels = Object.keys(ma);
    result = `<section class="content-card"><div class="section-title"><h2>비교 결과 요약</h2><span>검수용 예시 분석 · 실제 데이터 연결 전</span></div><div class="compare-demo"><div><span class="fake-avatar a"></span><h2>${esc(slotLabel(pa))}</h2><p>선택 정치인 A</p></div><div class="compare-demo-bars">${labels.map(label => `<label>${esc(label)} <i><em style="width:${ma[label]}%"></em></i>${ma[label]} / ${mb[label]}</label>`).join("")}</div><div><span class="fake-avatar b"></span><h2>${esc(slotLabel(pb))}</h2><p>선택 정치인 B</p></div></div><div class="compare-analysis-text">${compareNarrative(pa, ma, "A")}${compareNarrative(pb, mb, "B")}</div><div class="notice-box">현재 수치는 비교 기능 검수용 예시값입니다. 실제 정치인 공급자와 NOW 지표가 연결되면 같은 레이아웃에서 실데이터 분석 문장으로 교체됩니다.</div></section>`;
  }
  const aLabel = pa ? slotLabel(pa) : "";
  const bLabel = pb ? slotLabel(pb) : "";
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">COMPARE POLITICIANS</span><h1>정치인 비교분석</h1><p>이름·정당·지역을 검색하고 결과에서 바로 선택해 비교하세요.</p></section><section class="content-card"><form class="compare-picker compare-picker-quick" data-compare-form><label class="person-quick-picker compare-person-quick-picker">정치인 A 검색<input type="search" id="compare-person-search-a" value="${esc(aLabel)}" placeholder="이름·정당·지역 검색" autocomplete="off" data-person-quick-search="#compare-person-a" data-person-quick-results="#compare-person-results-a"><div class="person-quick-results" id="compare-person-results-a" hidden></div><select id="compare-person-a" name="a" required aria-hidden="true" tabindex="-1"><option value="">정치인 A 선택</option>${personOptions(a)}</select></label><span class="compare-vs">VS</span><label class="person-quick-picker compare-person-quick-picker">정치인 B 검색<input type="search" id="compare-person-search-b" value="${esc(bLabel)}" placeholder="이름·정당·지역 검색" autocomplete="off" data-person-quick-search="#compare-person-b" data-person-quick-results="#compare-person-results-b"><div class="person-quick-results" id="compare-person-results-b" hidden></div><select id="compare-person-b" name="b" required aria-hidden="true" tabindex="-1"><option value="">정치인 B 선택</option>${personOptions(b)}</select></label><button class="primary-btn" type="submit">비교하기</button></form></section>${result}</main>`);
}

export async function renderGeneration(search = "") {
  const data = await getDomain("generation");
  const session = getUserSession();
  const ages = ["10대", "20대", "30대", "40대", "50대", "60대+"];
  const results = data.demoMode === true ? (data.demoResults || {}) : (data.results || {});
  const params = new URLSearchParams(search || "");
  const userAge = session.authenticated ? memberAgeGroup(session.user.birthYear) : "";
  const requestedAge = params.get("age") || "";
  const selectedAge = ages.includes(requestedAge) ? requestedAge : (ages.includes(userAge) ? userAge : ages[0]);
  const selectedVotes = results[selectedAge] || {};
  const sortedSelected = Object.entries(selectedVotes)
    .filter(([,count]) => Number(count || 0) > 0)
    .sort((a,b) => Number(b[1] || 0) - Number(a[1] || 0));
  const selectedTotal = sortedSelected.reduce((sum,[,count]) => sum + Number(count || 0), 0);
  const tabs = ages.map(age => {
    const total = Object.values(results[age] || {}).reduce((sum,count)=>sum+Number(count||0),0);
    return `<button type="button" class="generation-age-tab ${age === selectedAge ? "active" : ""}" data-go="/generation-president?age=${encodeURIComponent(age)}"><b>${esc(age)}</b><span>${total.toLocaleString("ko-KR")}표</span></button>`;
  }).join("");
  const top15 = sortedSelected.slice(0,15).map(([personId,count], index) => {
    const person = getPersonSlotById(personId);
    const name = person?.name || slotLabel(person || { roleLabel:"정치인", slot:0 });
    const meta = [person?.party, person?.jurisdiction].filter(Boolean).join(" · ") || "정치인 정보";
    const share = selectedTotal ? Math.round(Number(count || 0) * 100 / selectedTotal) : 0;
    const photo = person?.photo || "";
    return `<article class="generation-top15-row" role="button" tabindex="0" data-go="/person/${esc(personId)}"><span class="generation-top15-rank">${index + 1}</span><span class="generation-top15-photo ${photo ? "has-photo" : ""}" ${photo ? `style="background-image:url('${esc(photo)}')"` : ""}></span><span class="generation-top15-person"><b>${esc(name)}</b><small>${esc(meta)}</small></span><span class="generation-top15-result"><i><em style="width:${share}%"></em></i><small>${Number(count || 0).toLocaleString("ko-KR")}표 · ${share}%</small></span></article>`;
  }).join("");
  const ranking = top15 || `<div class="empty-state generation-top15-empty"><h2>${esc(selectedAge)} 투표 결과를 기다리고 있습니다.</h2><p>첫 투표가 들어오면 이곳에 상위 15명까지 순위가 표시됩니다.</p></div>`;

  let voteArea = `<div class="member-login-prompt"><span>세대별 모의투표는 로그인 후 참여할 수 있습니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`;
  if (session.authenticated) {
    const ageGroup = memberAgeGroup(session.user.birthYear);
    if (data.enabled === false) voteArea = `<div class="empty-inline">현재 세대별 모의투표가 일시 중지되어 있습니다.</div>`;
    else if (!ageGroup) voteArea = `<div class="member-login-prompt"><span>정확한 세대별 집계를 위해 회원정보에 출생연도를 먼저 등록해 주세요.</span><button class="primary-btn" type="button" data-go="/mypage/profile">출생연도 등록</button></div>`;
    else if (hasGenerationVote(ageGroup)) voteArea = `<div class="empty-inline">${esc(ageGroup)} 투표에 이미 참여했습니다. 선택: ${esc(slotLabel(getPersonSlotById(generationVoteFor(ageGroup)) || { roleLabel: "정치인", slot: 0 }))}</div>`;
    else voteArea = `<form class="generation-vote-form generation-vote-fixed generation-vote-searchable" data-generation-vote-form><input type="hidden" name="ageGroup" value="${esc(ageGroup)}"><label>내 세대<input value="${esc(ageGroup)}" disabled></label><label class="person-quick-picker">대통령 후보 검색<input type="search" placeholder="이름·정당·지역 검색" autocomplete="off" id="generation-person-search" data-person-quick-search="#generation-person" data-person-quick-results="#generation-quick-results"><div class="person-quick-results" id="generation-quick-results" hidden></div><select id="generation-person" name="personId" required><option value="">정치인 선택</option>${personOptions("", data.candidates || [])}</select></label><button class="primary-btn" type="submit">투표하기</button><div class="save-state" data-generation-vote-state></div></form>`;
  }

  let generationAdmin = "";
  if (session.authenticated && session.user?.role === "admin") {
    const adminTools = await import("./generation-admin.js?v=alpha6.0.36.22-author-partner-hub");
    generationAdmin = adminTools.renderGenerationAdminEditor(data, { context:"detail", open:false });
  }

  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h1>세대가 뽑은 대통령</h1><p>세대를 선택하면 현재 투표수 기준 상위 15명까지 확인할 수 있습니다. 정치인을 누르면 사진과 전체 인물정보가 있는 상세페이지로 이동합니다.</p></section>${generationAdmin}<section class="content-card generation-ranking-card"><div class="section-title"><h2>${esc(selectedAge)}가 선택한 대통령</h2><span>TOP 15 · 총 ${selectedTotal.toLocaleString("ko-KR")}표</span></div><div class="generation-age-tabs">${tabs}</div><div class="generation-top15-list">${ranking}</div></section><section class="content-card"><div class="section-title"><h2>모의투표 참여</h2><span>${session.authenticated ? "회원 출생연도 기준 세대 자동 적용" : "로그인 필요"}</span></div>${voteArea}</section></main>`);
}

function nationalEvaluationDisplayVotes(data = {}, personId = "") {
  const id = String(personId || data.subjectId || "");
  if (!id) return { positive:0, neutral:0, negative:0 };
  const source = data.demoMode === true ? data.demoResults : data.results;
  return { positive:0, neutral:0, negative:0, ...((source || {})[id] || {}) };
}

export async function renderNationalEvaluation() {
  const data = await getDomain("nationalEvaluation");
  const session = getUserSession();
  const person = data.subjectId ? getPersonSlotById(data.subjectId) : null;
  const votes = person ? nationalEvaluationDisplayVotes(data, person.id) : { positive: 0, neutral: 0, negative: 0 };
  const total = Number(votes.positive || 0) + Number(votes.neutral || 0) + Number(votes.negative || 0);
  const share = key => total ? Math.round(Number(votes[key] || 0) * 100 / total) : 0;
  const voted = person && hasNationalEvaluationVote(person.id);
  const voting = data.enabled === true && person;
  const explicitHistory = Array.isArray(data.history) ? data.history : [];
  const historyIds = [...explicitHistory.map(x => x.subjectId), ...Object.keys(data.results || {})]
    .filter(id => /^assembly-\d{3}$/.test(String(id || "")) && id !== data.subjectId)
    .filter((id, i, arr) => arr.indexOf(id) === i);
  const history = historyIds.map(id => {
    const p = getPersonSlotById(id);
    const v = { positive: 0, neutral: 0, negative: 0, ...(data.results?.[id] || {}) };
    const count = Number(v.positive || 0) + Number(v.neutral || 0) + Number(v.negative || 0);
    const percent = key => count ? Math.round(Number(v[key] || 0) * 100 / count) : 0;
    return { id, label: p ? slotLabel(p) : id, count, positive: percent("positive"), neutral: percent("neutral"), negative: percent("negative") };
  });
  const historyMarkup = `<section class="content-card"><div class="section-title"><h2>지난 전국 평가</h2><span>${history.length}건</span></div>${history.length ? `<div class="evaluation-history-list">${history.map(x => `<article><div><b>${esc(x.label)}</b><span>${x.count}명 참여</span></div><p>긍정 ${x.positive}% · 보통 ${x.neutral}% · 부정 ${x.negative}%</p></article>`).join("")}</div>` : `<div class="empty-inline">아직 종료된 이전 평가가 없습니다.</div>`}</section>`;
  let nationalAdmin = "";
  if (session.authenticated && session.user?.role === "admin") {
    const tools = await import("./national-evaluation-admin.js?v=alpha6.0.36.22-author-partner-hub");
    nationalAdmin = tools.renderNationalEvaluationAdminEditor(data, { context:"detail", open:false });
  }
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">NATIONAL EVALUATION</span><h1>국회의원 전국 평가제</h1><p>현재 평가와 지난 평가 결과를 한 페이지에서 확인합니다.</p></section>${nationalAdmin}${person ? `<section class="person-detail-hero content-card"><div class="person-detail-photo"></div><div class="person-detail-title"><span class="eyebrow">CURRENT SUBJECT</span><h1>${esc(slotLabel(person))}</h1><p>${esc(person.party || "")} · ${esc(person.jurisdiction || "")}</p><div class="person-detail-badges"><span>전국 평가 대상</span><span>${data.enabled ? "평가 진행중" : "평가 일시중지"}</span></div></div><div class="detail-action-bar"><button class="ghost-btn" type="button" data-go="/person/${esc(person.id)}">상세페이지</button></div></section><section class="content-card"><div class="section-title"><h2>현재 평가 결과</h2><span>${total}명 참여</span></div><div class="evaluation-result-grid"><article><small>긍정</small><strong>${share("positive")}%</strong><span>${Number(votes.positive || 0)}표</span></article><article><small>보통</small><strong>${share("neutral")}%</strong><span>${Number(votes.neutral || 0)}표</span></article><article><small>부정</small><strong>${share("negative")}%</strong><span>${Number(votes.negative || 0)}표</span></article></div></section><section class="content-card"><div class="section-title"><h2>전국 평가 참여</h2><span>${voted ? "참여 완료" : voting ? "평가 진행중" : "평가 중지"}</span></div>${!session.authenticated ? `<div class="member-login-prompt"><span>평가 참여는 로그인 후 가능합니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>` : !voting ? `<div class="empty-inline">관리자가 평가를 활성화하면 참여할 수 있습니다.</div>` : voted ? `<div class="empty-inline">이 평가에 이미 참여했습니다.</div>` : `<form class="evaluation-vote-form" data-national-evaluation-form data-person-id="${esc(person.id)}"><label><input type="radio" name="rating" value="positive" required><b>긍정 평가</b><span>전반적으로 잘하고 있다고 봅니다.</span></label><label><input type="radio" name="rating" value="neutral" required><b>보통</b><span>긍정과 아쉬움이 비슷합니다.</span></label><label><input type="radio" name="rating" value="negative" required><b>부정 평가</b><span>전반적으로 아쉽다고 봅니다.</span></label><button class="primary-btn" type="submit">평가 제출</button><div class="save-state" data-national-evaluation-state></div></form>`}</section>` : `<section class="content-card"><div class="empty-state tall"><div class="empty-icon">評</div><h2>평가 대상 선택 전</h2><p>관리자에서 국회의원 300개 슬롯 중 한 명을 선택하면 이 페이지에서 바로 평가할 수 있습니다.</p></div></section>`}${historyMarkup}</main>`);
}

export async function renderSearch(query = "") {
  const rawQ = String(query || "").trim();
  const { party, terms } = searchTerms(rawQ);
  const [columns, community, news, itsme] = await Promise.all([
    getDomain("columns"), getDomain("community"), getDomain("news"), getDomain("itsme")
  ]);

  const sourceGroups = [
    { label:"정참시 NEWS", route:"news", items:news.items || [] },
    { label:"COLUMN", route:"column", items:columns.items || [] },
    { label:"IT’S ME", route:"itsme", items:itsme.items || [] },
    { label:"정뮤니티", route:"community", items:community.items || [] }
  ];
  const contentGroups = rawQ ? sourceGroups.map(g => ({
    ...g,
    matches:g.items.filter(x => x.published !== false && textMatches(`${x.title||""} ${x.summary||""} ${x.body||""} ${x.author||""} ${x.category||""}`,terms))
  })) : [];
  const searchAuthorProfiles = await getAuthorProfiles(authorOwnerIds(contentGroups.flatMap(g => g.matches || [])));

  const evaluationData = rawQ ? await getDomain("nationalEvaluation") : { results:{}, history:[] };
  const evaluationPeople = rawQ ? [evaluationData.subjectId, ...(evaluationData.history || []).map(x=>x.subjectId), ...Object.keys(evaluationData.results || {})]
    .filter(Boolean)
    .filter((id,i,arr)=>arr.indexOf(id)===i)
    .map(id=>getPersonSlotById(id))
    .filter(Boolean)
    .filter(person => party ? searchNorm(person.party) === searchNorm(party.canonical) : textMatches(personSearchText(person),terms)) : [];


  const allPeople = rawQ ? listAllPoliticians().filter(p => {
    if (party) return searchNorm(p.party) === searchNorm(party.canonical);
    return textMatches(personSearchText(p),terms);
  }) : [];
  const peoplePreview = allPeople.slice(0,12);

  const governmentSearchText = [
    GOVERNMENT_SEED.profile.name,
    GOVERNMENT_SEED.profile.office,
    GOVERNMENT_SEED.profile.party,
    GOVERNMENT_SEED.vision,
    ...GOVERNMENT_SEED.leadership.flatMap(x => [x.name,x.role,x.area]),
    ...GOVERNMENT_SEED.cabinet.flatMap(x => [x.name,x.office,x.title,x.area])
  ].filter(Boolean).join(" ");
  const presidentText = governmentSearchText;
  const presidentMatch = rawQ && textMatches(presidentText,terms);

  const hasResults = allPeople.length || contentGroups.some(g=>g.matches.length) || evaluationPeople.length || presidentMatch;
  const partyLabel = party?.canonical || "";
  const partyCounts = party ? {
    assembly:allPeople.filter(x=>x.type==="assembly").length,
    metropolitan:allPeople.filter(x=>x.type==="metropolitan").length,
    basic:allPeople.filter(x=>x.type==="basic").length
  } : null;

  const peopleSection = allPeople.length ? `<section class="content-card search-people-section"><div class="section-title"><h2>${party ? `${esc(partyLabel)} 정치인` : "정치인"}</h2><span>총 ${allPeople.length}명</span></div>${partyCounts ? `<div class="search-party-counts"><span>국회의원 <b>${partyCounts.assembly}</b></span><span>광역단체장 <b>${partyCounts.metropolitan}</b></span><span>기초단체장 <b>${partyCounts.basic}</b></span></div>` : ""}<div class="search-person-grid">${peoplePreview.map(p=>`<button type="button" data-go="/person/${esc(p.id)}"><span class="search-person-avatar"></span><div><b>${esc(p.name)}</b><small>${esc(p.party)} · ${esc(p.jurisdiction)}</small></div></button>`).join("")}</div>${allPeople.length > peoplePreview.length || party ? `<div class="search-all-people"><button class="primary-btn" type="button" data-go="${party ? `/now?party=${encodeURIComponent(partyLabel)}&limit=50` : `/now?search=${encodeURIComponent(rawQ)}&limit=50`}">${party ? `${esc(partyLabel)} 정치인 전체보기` : `정치인 ${allPeople.length}명 전체보기`} →</button></div>` : ""}</section>` : "";

  const presidentSection = presidentMatch ? `<section class="content-card search-president-result"><div class="section-title"><h2>대통령 · 정부</h2><span>1건</span></div><button type="button" data-go="/president"><span class="search-person-avatar president"></span><div><b>${esc(GOVERNMENT_SEED.profile.name)} 대통령</b><small>${esc(GOVERNMENT_SEED.profile.office)} · 대통령·총리·장관·주요 행정인사</small></div><em>대통령 페이지 →</em></button></section>` : "";

  const exampleCopy = (label) => ({
    "정참시 NEWS":"관련 정치 뉴스 제목 · 주요 이슈 요약 · 등록일",
    "COLUMN":"관련 칼럼 제목 · 필자 · 핵심 관점",
    "IT’S ME":"관련 시민 정책제안 · 카테고리 · 참여정보",
    "정뮤니티":"관련 시민 게시글 · 작성자 · 반응"
  }[label] || "관련 콘텐츠가 등록되면 이곳에 표시됩니다.");

  const contentMarkup = contentGroups.map(g=>`<section class="content-card search-board-group"><div class="section-title"><h2>${esc(g.label)}</h2><span>${g.matches.length}건</span></div>${g.matches.length ? `<div class="board-list">${g.matches.slice(0,5).map(x=>`<article class="no-thumb"><a href="/${g.route}/${esc(x.id)}" data-route><span class="type">${esc(g.label)}</span><h2>${esc(x.title)}</h2><p>${esc(x.summary||x.body||"")}</p></a><small>${authorIdentity(x.author||"정참시", x.ownerId, searchAuthorProfiles)} · ${formatDate(x.createdAt)}</small></article>`).join("")}</div>${g.matches.length>5?`<div class="search-group-more"><button class="ghost-btn" type="button" data-go="/${g.route}?q=${encodeURIComponent(rawQ)}">관련 ${esc(g.label)} 전체보기 →</button></div>`:""}` : `<div class="search-empty-example"><b>아직 ‘${esc(rawQ)}’ 관련 ${esc(g.label)}가 없습니다.</b><p>향후 관련 콘텐츠가 등록되면 이 카테고리에 자동으로 표시됩니다.</p><article><span>노출 예시</span><strong>${esc(exampleCopy(g.label))}</strong></article></div>`}</section>`).join("");
  const evaluationMarkup = `<section class="content-card search-board-group"><div class="section-title"><h2>전국평가제</h2><span>${evaluationPeople.length}건</span></div>${evaluationPeople.length ? `<div class="search-evaluation-list">${evaluationPeople.slice(0,5).map(p=>`<button type="button" data-go="/national-evaluation"><span class="search-person-avatar"></span><div><b>${esc(p.name)}</b><small>${esc(p.party)} · ${esc(p.jurisdiction)}</small></div><em>평가 보기 →</em></button>`).join("")}</div>` : `<div class="search-empty-example"><b>아직 ‘${esc(rawQ)}’ 관련 전국평가 데이터가 없습니다.</b><p>해당 정치인이 전국평가 대상으로 등록되면 이곳에 표시됩니다.</p><article><span>노출 예시</span><strong>정치인 이름 · 긍정/보통/부정 평가 · 참여자 수</strong></article></div>`}</section>`;

  return pageShell(`<main class="subpage search-page"><section class="page-hero"><span class="eyebrow">SEARCH · INTEGRATED</span><h1>통합검색</h1><p>검색어: <b>${esc(rawQ || "—")}</b>${party ? ` · <span>${esc(partyLabel)}로 정규화해 검색했습니다.</span>` : ""}</p></section>${peopleSection}${presidentSection}${contentMarkup}${rawQ ? evaluationMarkup : ""}${!rawQ ? `<section class="content-card"><div class="empty-state tall"><h2>검색어를 입력해 주세요.</h2><p>정치인 이름·정당 별칭·지역·정책·게시글을 한 번에 검색할 수 있습니다.</p></div></section>` : !hasResults ? `<section class="content-card"><div class="empty-state tall"><h2>검색 결과가 없습니다.</h2><p>띄어쓰기와 정당 별칭도 함께 처리하지만 다른 검색어를 시도해 보세요.</p></div></section>` : ""}</main>`);
}

export { trendingItems };
