import { getDomain, getAuthorProfiles, getNowPublic, getNowCategory, getNowPerson } from "../core/repository.js";
import { pageShell, esc } from "./layout.js";
import { GOVERNMENT_SEED } from "../data/government-seed.js";
import {
  getUserSession,
  getUserActivity,
  hasVotedPoll,
  hasGenerationVote,
  generationVoteFor,
  hasNationalEvaluationVote,
  isPostLiked
} from "../core/user.js";
import { authorIdentity, authorOwnerIds } from "./author-identity.js";
import { renderContentShare } from "./content-share.js?v=jcs-share-v1";
import { getFastNowPerson, getFastAdminCompare, prefetchNowPerson } from "../core/compare-data.js?v=admin-multi-compare-inforeghini";
import {
  CORE_COMPARE_METRICS, AUDIENCE_COMPARE_METRICS, ACTIVITY_COMPARE_METRICS, FLOW_COMPARE_METRICS,
  scoreFor, buildDifferences, buildCompareInsight, relativeCompareAxisValue, axisIntensityBand, trendScoreDelta, trendRankDelta
} from "./compare-intelligence.js?v=03686";
import {
  normalizeNationalEvaluation,
  votesForEvaluationSlot,
  nationalEvaluationTypeLabel
} from "./national-evaluation-model.js";

let personProvider = null;
async function ensurePersonProvider() {
  if (!personProvider) personProvider = await import("../data/person-provider.js");
  return personProvider;
}
function listAssemblyMembers() { return personProvider.listAssemblyMembers(); }
function listMetropolitanLeaders() { return personProvider.listMetropolitanLeaders(); }
function listBasicLeaders() { return personProvider.listBasicLeaders(); }
function listAllPoliticians() { return personProvider.listAllPoliticians(); }
function getPersonSlotById(id) { return personProvider.getPersonSlotById(id); }

function pct(option, options) {
  const total = (options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
  return total ? Math.round(Number(option.votes || 0) * 100 / total) : 0;
}
function bodyHtml(body = "") {
  return String(body || "").split(/\n{2,}|\r?\n/).map(x => x.trim()).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join("") || `<p>본문이 없습니다</p>`;
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
function personPhotoMarkup(person, className = "search-person-avatar", { side = "", eager = false, size = 80 } = {}) {
  const photo = String(person?.photo || "");
  const focus = String(person?.photoFocus || "50% 28%");
  const extra = side ? ` ${side}` : "";
  if (!photo) return `<span class="${className}${extra}"></span>`;
  return `<span class="${className}${extra} has-photo" style="--photo-position:${esc(focus)}"><img data-politician-photo src="${esc(photo)}" alt="" width="${size}" height="${size}" loading="${eager ? "eager" : "lazy"}" decoding="async" fetchpriority="${eager ? "high" : "low"}"></span>`;
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
    <section class="page-hero"><span class="eyebrow">PRESIDENT · GOVERNMENT</span><h1>대통령 · 정부 주요 인사</h1><p>대통령 기본정보와 국정 방향, 주요 행정인사를 한 페이지에서 확인합니다. 인사정보는 ${esc(GOVERNMENT_SEED.verifiedAt)} 기준 공식 공개자료를 바탕으로 정리했습니다</p></section>
    <section class="person-detail-hero content-card"><div class="person-detail-photo ${rp.photo ? "has-photo" : ""}" ${rp.photo ? `style="background-image:url('${esc(rp.photo)}')"` : ""}></div><div class="person-detail-title"><span class="eyebrow">PRESIDENT PROFILE</span><h1>${esc(p.name)}</h1><p>${esc(p.office || "대한민국 대통령")} · ${esc(p.term)}</p><div class="person-detail-badges"><span>제21대 대통령</span><span>${esc(p.party)}</span><span>2025.06.04 취임</span></div></div><div class="detail-action-bar"><button class="ghost-btn" type="button" data-go="/search?q=${encodeURIComponent(p.name)}">통합검색</button><button class="ghost-btn" type="button" data-go="/news">관련 NEWS</button></div></section>

    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>기본정보</h2><span>대통령 프로필</span></div><dl class="info-list"><div><dt>이름</dt><dd>${esc(p.name)}</dd></div><div><dt>직책</dt><dd>${esc(p.office)}</dd></div><div><dt>정치 경력</dt><dd>${esc(p.party)}</dd></div><div><dt>출생</dt><dd>${esc(p.birth)}</dd></div><div><dt>학력</dt><dd>${esc(p.education)}</dd></div></dl></section><section class="content-card"><div class="section-title"><h2>취임 · 임기</h2><span>대통령 재임정보</span></div><dl class="info-list"><div><dt>취임일</dt><dd>${esc(p.inauguratedAt)}</dd></div><div><dt>임기</dt><dd>${esc(p.term)}</dd></div><div><dt>최근 선거</dt><dd>2025년 제21대 대통령선거 당선</dd></div><div><dt>정부</dt><dd>국민주권정부</dd></div></dl></section></div>

    <section class="content-card"><div class="section-title"><h2>주요 경력</h2><span>정치 · 행정 경력</span></div>${textItems(career,6)}</section>
    <section class="content-card"><div class="section-title"><h2>선거 이력</h2><span>주요 당선 이력</span></div>${textItems(elections,6)}</section>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>국정 비전</h2><span>국정 방향</span></div><div class="article-body"><p>${esc(vision)}</p></div></section><section class="content-card"><div class="section-title"><h2>주요 정책</h2><span>정부 핵심 방향</span></div>${textItems(policies,6)}</section></div>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>핵심 약속</h2><span>국정 운영 원칙</span></div>${textItems(pledges,5)}</section><section class="content-card"><div class="section-title"><h2>5대 국정 방향</h2><span>청와대 공개 국정 방향</span></div>${textItems(nationalTasks,5)}</section></div>

    <section class="content-card government-section"><div class="section-title"><h2>국정 지휘부</h2><span>${esc(GOVERNMENT_SEED.verifiedAt)} 기준</span></div><div class="government-lead-grid">${leadership.map(x=>`<article><span class="government-avatar"></span><div><small>${esc(x.role)}</small><b>${esc(x.name)}</b><p>${esc(x.area)}</p><em>${esc(x.note)}</em></div></article>`).join("")}</div></section>

    <section class="content-card government-section"><div class="section-title"><h2>주요 부처 장관</h2><span>현재 주요 행정인사</span></div><div class="cabinet-grid">${cabinet.map(x=>`<article><span>${esc(x.office)}</span><b>${esc(x.name)}</b><small>${esc(x.title)}</small><p>${esc(x.area)}</p>${x.note ? `<em>${esc(x.note)}</em>` : ""}</article>`).join("")}</div><div class="notice-box">장관·고위공직자 인사는 변동 가능성이 있어 기준일을 함께 표시합니다. ${esc(GOVERNMENT_SEED.sourceLabel)}</div></section>

    <section class="content-card"><div class="section-title"><h2>정참시 데이터</h2><span>실시간 지표는 후속</span></div><div class="metric-shell"><article><small>관심도</small><strong>—</strong><span>후속 연결</span></article><article><small>언급량</small><strong>—</strong><span>후속 연결</span></article><article><small>관련 설문</small><strong>—</strong><span>참여 데이터</span></article><article><small>세대별 평가</small><strong>—</strong><span>참여 데이터</span></article></div></section>
    <section class="content-card"><div class="section-title"><h2>관련 콘텐츠</h2><span>정참시 내부 연결</span></div><div class="related-grid"><article role="button" tabindex="0" data-go="/news"><b>정참시 NEWS</b><span>대통령·정부 관련 뉴스</span></article><article role="button" tabindex="0" data-go="/column"><b>COLUMN</b><span>관련 칼럼</span></article><article role="button" tabindex="0" data-go="/community"><b>정뮤니티</b><span>관련 시민 의견</span></article><article role="button" tabindex="0" data-go="/poll"><b>시민들의 선택</b><span>관련 설문</span></article></div></section>
  </main>`);
}

function nowTypes() {
  const counts = personProvider.PERSON_COUNTS;
  return {
    assembly: { label: "국회의원", count: counts.assembly, get: listAssemblyMembers },
    metropolitan: { label: "광역단체장", count: counts.metropolitan, get: listMetropolitanLeaders },
    basic: { label: "기초단체장", count: counts.basic, get: listBasicLeaders }
  };
}
function nowCard(person) {
  const title = person?.name || `${person.roleLabel} ${String(person.slot).padStart(3, "0")}`;
  const meta = [person?.party, person?.jurisdiction].filter(Boolean).join(" · ");
  const short = person?.type === "assembly"
    ? [person?.terms, person?.committee].filter(Boolean).join(" · ")
    : [person?.office, person?.terms].filter(Boolean).join(" · ");
  const photo = person?.photo || "";
  const photoMarkup = photo ? `<img data-politician-photo src="${esc(photo)}" alt="" width="160" height="160" loading="lazy" decoding="async" fetchpriority="low">` : "";
  return `<a class="person-slot-card data-connected" href="/person/${esc(person.id)}" data-route aria-label="${esc(title)} 상세페이지"><span class="slot-no">#${String(person.slot).padStart(3, "0")}</span><div class="person-photo-placeholder ${photo ? "has-photo" : ""}"${photo && person.photoFocus ? ` style="--photo-position:${esc(person.photoFocus)}"` : ""}>${photoMarkup}</div><div class="slot-lines"><b class="slot-data-name">${esc(title)}</b><span class="slot-data-meta">${esc(meta)}</span><span class="slot-data-short">${esc(short)}</span></div></a>`;
}
function categoryRankCard(row, typeLabel) {
  const live = row?.person || {};
  const local = getPersonSlotById(live.id) || {};
  const person = { ...local, ...live, photo:local.photo || "", photoFocus:local.photoFocus || "50% 28%" };
  const title = person.name || local.name || typeLabel;
  const meta = [person.party, person.jurisdiction].filter(Boolean).join(" · ");
  const short = [person.office || person.roleLabel, person.terms].filter(Boolean).join(" · ");
  const photo = String(person.photo || "");
  const photoMarkup = photo ? `<img data-politician-photo src="${esc(photo)}" alt="" width="160" height="160" loading="lazy" decoding="async" fetchpriority="low">` : "";
  const categoryRank = Math.max(1, Number(row?.categoryRank) || 1);
  const globalRank = Math.max(1, Number(row?.globalRank) || categoryRank);
  return `<a class="person-slot-card data-connected now-category-card" href="/person/${esc(person.id)}" data-route aria-label="${esc(title)} 상세페이지">
    <span class="slot-no now-category-card-rank">#${categoryRank}</span>
    <div class="person-photo-placeholder ${photo ? "has-photo" : ""}"${photo ? ` style="--photo-position:${esc(person.photoFocus)}"` : ""}>${photoMarkup}</div>
    <div class="slot-lines"><b class="slot-data-name">${esc(title)}</b><span class="slot-data-meta">${esc(meta)}</span><span class="slot-data-short">${esc(short)}</span><span class="now-category-card-meta"><b>${esc(typeLabel)} ${categoryRank}위</b><em>전체 NOW ${globalRank}위</em></span></div>
  </a>`;
}

export async function renderNow(search = "") {
  await ensurePersonProvider();
  const NOW_TYPES = nowTypes();
  const params = new URLSearchParams(search || "");
  const partyParam = String(params.get("party") || "").trim();
  const searchParam = String(params.get("search") || "").trim();
  const type = NOW_TYPES[params.get("type")] ? params.get("type") : "assembly";
  const requested = Number(params.get("limit") || 30);

  let label, total, nextBase, filterDescription, bodyMarkup, shownCount = 0, remaining = 0, nextLimit = 0;
  if (partyParam) {
    const party = resolvePartyAlias(partyParam)?.canonical || partyParam;
    const all = listAllPoliticians().filter(p => searchNorm(p.party) === searchNorm(party));
    label = `${party} 정치인`;
    total = all.length;
    nextBase = `/now?party=${encodeURIComponent(party)}&limit=`;
    const counts = {
      assembly: all.filter(x=>x.type==="assembly").length,
      metropolitan: all.filter(x=>x.type==="metropolitan").length,
      basic: all.filter(x=>x.type==="basic").length
    };
    filterDescription = `국회의원 ${counts.assembly}명 · 광역단체장 ${counts.metropolitan}명 · 기초단체장 ${counts.basic}명`;
    const limit = Math.min(total, Math.max(50, Math.ceil(requested / 50) * 50));
    const shown = all.slice(0, limit);
    shownCount = shown.length; remaining = Math.max(0,total-shownCount); nextLimit = Math.min(total,shownCount+50);
    bodyMarkup = shown.length ? `<div class="person-grid">${shown.map(nowCard).join("")}</div>` : "";
  } else if (searchParam) {
    const {terms}=searchTerms(searchParam);
    const all = listAllPoliticians().filter(p => textMatches(personSearchText(p), terms));
    label = `‘${searchParam}’ 정치인`;
    total = all.length;
    nextBase = `/now?search=${encodeURIComponent(searchParam)}&limit=`;
    filterDescription = `이름·정당·지역·직책 기준 검색 결과`;
    const limit = Math.min(total, Math.max(50, Math.ceil(requested / 50) * 50));
    const shown = all.slice(0, limit);
    shownCount = shown.length; remaining = Math.max(0,total-shownCount); nextLimit = Math.min(total,shownCount+50);
    bodyMarkup = shown.length ? `<div class="person-grid">${shown.map(nowCard).join("")}</div>` : "";
  } else {
    const meta = NOW_TYPES[type];
    label = `${meta.label} NOW Rank`;
    const limit = type === "metropolitan" ? 30 : Math.max(30, Math.ceil(requested / 30) * 30);
    const live = await getNowCategory(type, { offset:0, limit });
    const category = live?.category || { total:0, rows:[], hasMore:false };
    total = Number(category.total || 0);
    const rows = Array.isArray(category.rows) ? category.rows : [];
    shownCount = rows.length;
    remaining = Math.max(0,total-shownCount);
    nextLimit = Math.min(total,shownCount+30);
    nextBase = `/now?type=${type}&limit=`;
    filterDescription = `${meta.label} 안에서 현재 NOW 점수 기준으로 다시 매긴 독립 순위`;
    bodyMarkup = rows.length ? `<div class="person-grid now-category-card-grid">${rows.map(row=>categoryRankCard(row,meta.label)).join("")}</div>` : "";
  }

  const title = partyParam ? `${label} 전체보기` : searchParam ? `${label} 전체보기` : "NOW Rank · 분야별 순위";
  const isCategory = !partyParam && !searchParam;
  const loadStep = isCategory ? 30 : 50;
  const footer = remaining ? `<div class="load-more-wrap"><button class="primary-btn load-more-btn" type="button" data-now-load-more="${nextBase}${nextLimit}">${isCategory ? "30명 더 불러오기" : "50명 더 불러오기"} <span>남은 ${remaining}명</span></button></div>` : shownCount ? `<div class="directory-complete">${esc(label)} ${total}명 전체를 불러왔습니다</div>` : "";

  return pageShell(`<main class="subpage now-directory-page"><section class="page-hero"><span class="eyebrow">NOW RANK · CATEGORY LEAGUE</span><h1>${esc(title)}</h1><p>${partyParam || searchParam ? esc(filterDescription) : "메인 TOP10은 전체 정치인 통합 순위입니다. 전체보기에서는 국회의원·광역단체장·기초단체장별로 같은 NOW 점수를 다시 정렬해 각 분야의 독립 순위를 보여줍니다"}</p><div class="capacity-line"><span>${esc(filterDescription)}</span><b>${isCategory ? `현재 ${total}명` : `총 ${total}명`}</b></div></section>${isCategory ? `<nav class="now-category-tabs" aria-label="정치인 분류">${Object.entries(NOW_TYPES).map(([key,x])=>`<button type="button" class="${type===key?"active":""}" data-go="/now?type=${key}&limit=${key==="metropolitan"?30:30}"><b>${x.label}</b><span>${x.count}명</span></button>`).join("")}</nav>` : `<div class="directory-filter-actions"><button class="ghost-btn" type="button" data-go="/now">분야별 NOW Rank로 돌아가기</button><button class="ghost-btn" type="button" data-go="/search?q=${encodeURIComponent(partyParam||searchParam)}">통합검색 결과</button></div>`}<section class="content-card directory-section"><div class="section-title"><h2>${esc(label)}</h2><span>${shownCount} / ${total}명 표시</span></div>${bodyMarkup || `<div class="empty-state"><h2>게시된 NOW 순위 데이터가 없습니다</h2><p>관리자에서 NOW 데이터를 게시하면 분야별 순위가 자동으로 구성됩니다</p></div>`}${footer}</section></main>`);
}

export async function appendNowRankMore(button) {
  const target = String(button?.dataset?.nowLoadMore || "");
  const section = button?.closest?.(".directory-section");
  const currentGrid = section?.querySelector?.(".now-category-card-grid, .person-grid");
  if (!target || !section || !currentGrid) return { ok:false, error:"NOW_APPEND_TARGET_MISSING" };

  const url = new URL(target, location.origin);
  const html = await renderNow(url.search);
  const template = document.createElement("template");
  template.innerHTML = String(html || "").trim();
  const nextPage = template.content.querySelector(".now-directory-page");
  const nextGrid = nextPage?.querySelector(".now-category-card-grid, .person-grid");
  if (!nextPage || !nextGrid) return { ok:false, error:"NOW_APPEND_RENDER_FAILED" };

  const currentCount = currentGrid.children.length;
  const nextCards = Array.from(nextGrid.children).slice(currentCount);
  for (const card of nextCards) currentGrid.append(card.cloneNode(true));

  const nextCount = nextPage.querySelector(".directory-section .section-title span");
  const currentCountLabel = section.querySelector(".section-title span");
  if (nextCount && currentCountLabel) currentCountLabel.textContent = nextCount.textContent;

  const currentFooter = section.querySelector(".load-more-wrap, .directory-complete");
  const nextFooter = nextPage.querySelector(".load-more-wrap, .directory-complete");
  if (currentFooter && nextFooter) currentFooter.replaceWith(nextFooter.cloneNode(true));
  else if (currentFooter && !nextFooter) currentFooter.remove();
  else if (!currentFooter && nextFooter) section.append(nextFooter.cloneNode(true));

  history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  return { ok:true, appended:nextCards.length };
}

export async function renderPolls(search = "") {
  const params = new URLSearchParams(search || "");
  const focusPollId = String(params.get("pollId") || "");
  const preselectedOptionId = String(params.get("option") || "");
  const data = await getDomain("polls");
  const allItems = (data.items || []).filter(x => x.published !== false);
  const items = focusPollId ? allItems.filter(x => String(x.id) === focusPollId) : allItems;
  const session = getUserSession();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">CITIZENS’ CHOICE</span><h1>시민들의 선택</h1><p>${focusPollId ? "메인에서 고른 설문의 전체 선택지를 확인한 뒤 최종 투표하세요" : "선택지를 고른 뒤 확인 버튼을 눌러야 투표가 완료됩니다"}</p></section><section class="content-card">${items.length ? `<div class="poll-page-list">${items.map(poll => {
    const voted = session.authenticated && hasVotedPoll(poll.id);
    const total = (poll.options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
    const preselected = !voted && String(poll.id) === focusPollId && (poll.options || []).some(x => String(x.id) === preselectedOptionId) ? preselectedOptionId : "";
    const choices = (poll.options || []).map(opt => {
      const selected = preselected && String(opt.id) === String(preselected);
      return `<button type="button" ${voted ? "disabled" : `data-poll-select data-option-id="${esc(opt.id)}"`} class="${selected ? "selected" : ""}" aria-pressed="${selected ? "true" : "false"}"><span>${esc(opt.label)}</span><i><em style="width:${pct(opt, poll.options)}%"></em></i><b>${pct(opt, poll.options)}%</b></button>`;
    }).join("");
    return `<article class="poll-live-card" data-poll-scope data-poll-id="${esc(poll.id)}" ${preselected ? `data-selected-option="${esc(preselected)}"` : ""}><span class="status-pill"><b>POLL</b>${voted ? "참여완료" : "진행중"}</span><h2>${esc(poll.question)}</h2><p>${esc(poll.description || "정참시 참여자 기반 설문")} · ${total.toLocaleString("ko-KR")}명 참여</p><div class="poll-choice-list">${choices}</div>${voted ? `<small>이 설문에 이미 참여했습니다</small>` : `<div class="poll-confirm-row"><span data-poll-select-state>${preselected ? "메인에서 선택한 항목입니다. 전체 선택지를 확인해 주세요" : "선택지를 선택해 주세요"}</span><button class="primary-btn" type="button" data-poll-confirm ${preselected ? "" : "disabled"}>투표 확인</button></div>`}</article>`;
  }).join("")}</div>${focusPollId ? `<div class="inline-actions top-gap"><button class="ghost-btn" type="button" data-go="/poll">전체 설문 보기</button></div>` : ""}` : `<div class="empty-state tall"><h2>${focusPollId ? "해당 설문을 찾을 수 없습니다" : "등록된 설문이 없습니다"}</h2><p>${focusPollId ? "설문이 종료되었거나 비공개 상태일 수 있습니다" : "관리자에서 설문을 만들면 이곳과 메인에 동시에 표시됩니다"}</p></div>`}</section></main>`);
}

export async function renderKeywords() {
  const live = await getNowPublic();
  const items = Array.isArray(live?.signals?.keywords) ? live.signals.keywords.slice(0,15) : [];
  const publishedAt = live?.current?.publishedAt ? formatDate(live.current.publishedAt) : "";
  return pageShell(`<main class="subpage live-keywords-page"><section class="page-hero"><span class="eyebrow">LIVE POLITICAL KEYWORDS</span><h1>실시간 정치키워드</h1><p>게시된 NOW 데이터의 최근 뉴스 제목을 분석해 지금 반복해서 등장하는 정치 이슈를 보여줍니다</p></section><section class="content-card"><div class="section-title"><h2>실시간 TOP 15</h2><span>${publishedAt ? `NOW 게시 ${esc(publishedAt)}` : "NOW 게시 데이터 대기"}</span></div>${items.length ? `<div class="keyword-rank-list live-keyword-rank-list">${items.map((x, i) => `<article><strong>${i + 1}</strong><b>${esc(x.label)}<small>${Number(x.peopleCount||0)}명 정치인 뉴스에서 포착</small></b><span>${esc(x.meta || `뉴스 ${Number(x.mentions||0)}건`)}</span></article>`).join("")}</div>` : `<div class="empty-state"><h2>아직 추출된 실시간 키워드가 없습니다</h2><p>NOW 데이터를 새로 수집해 게시하면 최근 정치뉴스를 기준으로 자동 생성됩니다</p></div>`}</section></main>`);
}

export async function renderTrending() {
  const live = await getNowPublic();
  const items = Array.isArray(live?.signals?.rising) ? live.signals.rising.slice(0,10) : [];
  const publishedAt = live?.current?.publishedAt ? formatDate(live.current.publishedAt) : "";
  return pageShell(`<main class="subpage live-trending-page"><section class="page-hero"><span class="eyebrow">TRENDING NOW</span><h1>실시간 급상승 정치인</h1><p>직전 게시 순위 변화가 있으면 순위 상승폭을 우선하고, 첫 게시이거나 동률이면 최근 6시간 뉴스 가속도로 정렬합니다</p></section><section class="content-card"><div class="section-title"><h2>급상승 TOP 10</h2><span>${publishedAt ? `NOW 게시 ${esc(publishedAt)}` : "NOW 게시 데이터 대기"}</span></div>${items.length ? `<div class="trending-rank-list live-trending-rank-list">${items.map((x, i) => `<button type="button" data-go="${esc(x.href)}"><strong>${i + 1}</strong><b>${esc(x.title)}<small>${esc([x.party,x.jurisdiction,`NOW ${x.rank}위`].filter(Boolean).join(" · "))}</small></b><span class="trend-page-signal ${Number(x.rankDelta)>0?"up":x.trendLabel==="NEW"?"new":""}">${esc(x.trendLabel || "NOW")}</span></button>`).join("")}</div>` : `<div class="empty-state"><h2>아직 급상승 데이터가 없습니다</h2><p>NOW 데이터를 게시하면 실시간 급상승 정치인이 자동 구성됩니다</p></div>`}</section></main>`);
}

export async function renderAcademy() {
  const data = await getDomain("academy");
  const session = getUserSession();
  const activity = getUserActivity();
  const config = {
    eyebrow:"JEONGCHAMSI ACADEMY",
    title:"정참시 아카데미",
    headline:"정치의 꿈을 실제 준비로",
    description:"정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳",
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
  }).join("")}</div>` : `<div class="empty-state"><h2>등록된 일정이 없습니다</h2><p>관리자에서 날짜와 시간을 지정해 일정을 등록하면 메인과 이곳에 동시에 표시됩니다</p></div>`}</section></main>`);
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
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">IT’S ME · POLICY PROPOSAL</span><h1>IT’S ME</h1><p>“내가 대통령이라면, 내가 국회의원이라면, 내가 시장이라면, 내가 장관이라면”을 말머리로 정책과 아이디어를 직접 제안하는 참여 게시판입니다</p></section><section class="content-card"><div class="board-toolbar"><div class="itsme-category-tabs"><button type="button" class="${!category ? "active" : ""}" data-go="/itsme">전체</button>${(data.categories || []).map(c => `<button type="button" class="${category === c ? "active" : ""}" data-go="/itsme?category=${encodeURIComponent(c)}">${esc(c)}</button>`).join("")}</div>${session.authenticated ? `<button class="primary-btn" type="button" data-go="/itsme/write">IT’S ME 글쓰기</button>` : `<button class="primary-btn" type="button" data-go="/login">로그인 후 글쓰기</button>`}</div>${items.length ? `<div class="board-list itsme-board-list">${items.map(item => `<article class="no-thumb"><a href="/itsme/${esc(item.id)}" data-route><span class="type">${esc(item.category || "IT’S ME")}</span><h2>${esc(item.title)}</h2><p>${esc(item.summary || item.body || "")}</p></a><small>${authorIdentity(item.author || "정참시 회원", item.ownerId, authorProfiles)} · ${formatDate(item.createdAt)} · 좋아요 ${Number(item.likes || 0)}</small></article>`).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">ME</div><h2>아직 등록된 제안이 없습니다</h2><p>로그인 후 첫 정책 제안을 작성할 수 있습니다</p></div>`}</section></main>`);
}
export async function renderItsmeWrite(search = "") {
  const session = getUserSession();
  if (!session.authenticated) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>로그인이 필요합니다</h2><p>IT’S ME 글쓰기는 회원 참여 기능입니다</p><button class="primary-btn" type="button" data-go="/login">로그인</button></section></main>`);
  const data = await getDomain("itsme");
  const id = new URLSearchParams(search || "").get("id") || "";
  const old = id ? (data.items || []).find(x => String(x.id) === id) : null;
  const isAdmin = session.user?.role === "admin";
  if (old && String(old.ownerId || "") !== String(session.user.id) && !isAdmin) return pageShell(`<main class="subpage"><section class="content-card empty-state"><h2>수정 권한이 없습니다</h2><button class="primary-btn" type="button" data-go="/itsme">목록으로</button></section></main>`);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">WRITE · IT’S ME</span><h1>${old ? "IT’S ME 제안 수정" : "IT’S ME 제안 작성"}</h1><p>말머리를 선택하고 내가 그 역할이라면 추진하고 싶은 정책이나 아이디어를 작성하세요</p></section><section class="content-card"><form class="member-post-form" data-user-post-form="itsme" data-item-id="${esc(old?.id || "")}"><label>말머리<select name="category" required>${(data.categories || []).map(c => `<option ${old?.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label><label>제목<input name="title" maxlength="30" required value="${esc(old?.title || "")}" placeholder="제안의 핵심을 제목으로 작성하세요"><span class="field-help">최대 30자</span></label><label>한 줄 요약<input name="summary" maxlength="15" value="${esc(old?.summary || "")}" placeholder="목록용 짧은 요약"><span class="field-help">최대 15자</span></label><label>내용<textarea name="body" rows="14" maxlength="3000" required placeholder="정책·아이디어와 이유를 자유롭게 작성하세요">${esc(old?.body || "")}</textarea><span class="field-help">최대 3,000자</span></label><div class="auth-error" data-user-post-error></div><div class="admin-form-actions"><button class="primary-btn" type="submit">${old ? "수정 저장" : "등록"}</button><button class="ghost-btn" type="button" data-go="${old ? `/itsme/${esc(old.id)}` : "/itsme"}">취소</button></div></form></section></main>`);
}
export async function renderItsmeDetail(id) {
  let data = await getDomain("itsme");
  let item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  if (!item) {
    data = await getDomain("itsme", { fresh:true });
    item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  }
  if (!item) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>IT’S ME 게시물을 찾을 수 없습니다</h2><button class="primary-btn" type="button" data-go="/itsme">목록으로</button></section></main>`);
  const session = getUserSession();
  const liked = session.authenticated && isPostLiked("itsme", id);
  const isAdmin = session.authenticated && session.user?.role === "admin";
  const mine = session.authenticated && String(item.ownerId || "") === String(session.user.id);
  const canManage = isAdmin || mine;
  const commentsData = await getDomain("comments");
  const comments = (commentsData.items || []).filter(c => c.published !== false && c.domain === "itsme" && String(c.postId) === String(id)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const authorProfiles = await getAuthorProfiles(authorOwnerIds([item, ...comments]));
  return pageShell(`<main class="subpage"><article class="content-card article-detail"><span class="eyebrow">IT’S ME · ${esc(item.category || "정책 제안")}</span><h1>${esc(item.title)}</h1><div class="article-meta"><span>${authorIdentity(item.author || "정참시 회원", item.ownerId, authorProfiles)}</span><span>${formatDate(item.createdAt)}</span><span>좋아요 ${Number(item.likes || 0)}</span></div>${item.summary ? `<div class="article-lead">${esc(item.summary)}</div>` : ""}<div class="article-body">${bodyHtml(item.body)}</div>${renderContentShare({ title:item.title, path:`/itsme/${id}` })}<div class="article-actions"><button type="button" class="ghost-btn ${liked ? "active" : ""}" data-post-like="itsme" data-post-id="${esc(id)}">${liked ? "♥ 좋아요 취소" : "♡ 좋아요"}</button>${canManage ? `<button type="button" class="ghost-btn" data-go="/itsme/write?id=${encodeURIComponent(id)}">수정</button><button type="button" class="danger-btn" data-user-post-delete="itsme" data-id="${esc(id)}">삭제</button>` : ""}<button type="button" class="primary-btn" data-go="/itsme">IT’S ME 목록으로</button></div></article><section class="content-card comment-section"><div class="section-title"><h2>댓글</h2><span>${comments.length}개</span></div>${session.authenticated ? `<form class="comment-form" data-comment-form="itsme" data-post-id="${esc(id)}"><textarea name="comment" rows="3" maxlength="1000" required placeholder="의견을 남겨보세요"></textarea><div class="admin-form-actions"><button class="primary-btn" type="submit">댓글 등록</button><span data-comment-state></span></div></form>` : `<div class="member-login-prompt"><span>댓글은 로그인 후 작성할 수 있습니다</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`}${comments.length ? `<div class="comment-list">${comments.map(c => `<article><div><b>${authorIdentity(c.author, c.ownerId, authorProfiles)}</b><span>${formatDate(c.createdAt)}</span></div><p>${esc(c.text)}</p></article>`).join("")}</div>` : `<div class="empty-inline">아직 댓글이 없습니다</div>`}</section></main>`);
}

function compareScoreText(value) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.round(n * 10) / 10) : "—";
}
function compareRankText(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n).toLocaleString("ko-KR")}위` : "—";
}
function comparePersonHero(person, live, side) {
  const avatar = personPhotoMarkup(person, "compare-live-avatar", { side, eager:true, size:180 });
  const signal = live?.analysis?.signal?.label || "분석 데이터 대기";
  const rank = live?.row?.rank;
  const categoryRank = live?.categoryRank;
  const categoryLabel = live?.categoryLabel || person?.roleLabel || "분야";
  return `<article class="compare-live-person ${side}">
    ${avatar}
    <span class="compare-live-side">POLITICIAN ${side.toUpperCase()}</span>
    <h2>${esc(person?.name || "")}</h2>
    <p>${esc([person?.party, person?.jurisdiction].filter(Boolean).join(" · "))}</p>
    <div class="compare-rank-split"><span><small>전체 NOW</small><strong>${compareRankText(rank)}</strong></span><span><small>${esc(categoryLabel)}</small><strong>${compareRankText(categoryRank)}</strong></span></div>
    <div class="compare-person-signal"><small>JEONGCHAMSI SIGNAL</small><b>${esc(signal)}</b></div>
  </article>`;
}
function compareMetricRow(metric, liveA, liveB, personA, personB) {
  const diff = buildDifferences(liveA, liveB, [metric], 4)[0];
  const a = diff?.a, b = diff?.b;
  const axis = relativeCompareAxisValue(a,b);
  const axisLeft = axis === null ? 50 : axis + 50;
  const axisLabel = axis === null ? "—" : compareScoreText(Math.abs(axis));
  const axisIntensity = axisIntensityBand(axis);
  const difference = axis === null ? "관측 대기" : diff?.leader === "a" ? `${esc(personA.name)} 상대강세` : diff?.leader === "b" ? `${esc(personB.name)} 상대강세` : "근접";
  return `<article class="compare-metric-row">
    <div class="compare-metric-center"><b>${esc(metric.label)}</b><small>${esc(metric.description)}</small></div>
    <div class="compare-relative-axis intensity-${axisIntensity}">
      <div class="compare-relative-axis-labels"><span>${esc(personA.name)}</span><span>${esc(personB.name)}</span></div>
      <div class="compare-relative-axis-track"><i></i><em style="left:${axisLeft}%"><b>${axisLabel}</b></em></div>
      <div class="compare-relative-axis-scale" aria-label="${esc(metric.label)} 비교 상대축"><span>50</span><span>25</span><span>0</span><span>25</span><span>50</span></div>
      <strong class="compare-relative-axis-verdict">${difference}</strong>
    </div>
  </article>`;
}
function compareMetricSection(eyebrow, title, subtitle, metrics, liveA, liveB, personA, personB, className="") {
  return `<section class="content-card compare-analysis-section ${className}"><div class="section-title"><div><span class="eyebrow">${esc(eyebrow)}</span><h2>${esc(title)}</h2></div><span>${esc(subtitle)}</span></div><div class="compare-metric-list">${metrics.map(metric=>compareMetricRow(metric,liveA,liveB,personA,personB)).join("")}</div></section>`;
}
function compareTrendPoints(live, key, rankMode=false) {
  const points = Array.isArray(live?.trend?.points) ? live.trend.points : [];
  return points.map(point => rankMode ? Number(point?.[key]) : Number(point?.scores?.[key])).filter(value => Number.isFinite(value) && (!rankMode || value > 0));
}
function compareTrendSvg(live, key, rankMode=false) {
  const values = compareTrendPoints(live,key,rankMode);
  if (!values.length) return `<span class="compare-trend-empty">관측 대기</span>`;
  const width=150,height=38,pad=3;
  const min=rankMode?Math.min(...values):0;
  const max=rankMode?Math.max(...values):100;
  const span=Math.max(1,max-min);
  const coords=values.map((value,index)=>{
    const x=values.length===1?width/2:pad+(width-pad*2)*(index/(values.length-1));
    const y=rankMode ? pad+(height-pad*2)*((value-min)/span) : pad+(height-pad*2)*(1-value/100);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="compare-trend-spark" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><line x1="3" y1="19" x2="147" y2="19"></line><polyline points="${coords}"></polyline></svg>`;
}
function compareTrendCurrent(live,key,rankMode=false) {
  const values=compareTrendPoints(live,key,rankMode);
  if(values.length)return values[values.length-1];
  if(rankMode)return key==="globalRank"?Number(live?.row?.rank)||null:Number(live?.categoryRank)||null;
  return scoreFor(live,key);
}
function compareTrendDeltaLabel(live,key,rankMode=false) {
  const delta=rankMode?trendRankDelta(live,key):trendScoreDelta(live,key);
  if(delta===null)return "첫 관측";
  if(rankMode)return delta>0?`▲ ${compareScoreText(delta)}`:delta<0?`▼ ${compareScoreText(Math.abs(delta))}`:"유지";
  return delta>0?`+${compareScoreText(delta)}`:compareScoreText(delta);
}
function compareTrendCard(label,key,liveA,liveB,personA,personB,rankMode=false) {
  const a=compareTrendCurrent(liveA,key,rankMode),b=compareTrendCurrent(liveB,key,rankMode);
  const current=value=>rankMode?compareRankText(value):compareScoreText(value);
  return `<article class="compare-trend-card"><h3>${esc(label)}</h3><div class="compare-trend-person a"><span><b>${esc(personA.name)}</b><strong>${current(a)}</strong><em>${compareTrendDeltaLabel(liveA,key,rankMode)}</em></span>${compareTrendSvg(liveA,key,rankMode)}</div><div class="compare-trend-person b"><span><b>${esc(personB.name)}</b><strong>${current(b)}</strong><em>${compareTrendDeltaLabel(liveB,key,rankMode)}</em></span>${compareTrendSvg(liveB,key,rankMode)}</div></article>`;
}
function compareTrendSection(liveA, liveB, personA, personB) {
  return `<section class="content-card compare-analysis-trend"><div class="section-title"><div><span class="eyebrow">ANALYSIS TREND</span><h2>관심 변화 · NOW 이력 비교</h2></div><span>공식 게시 스냅샷 기준 변화</span></div><div class="compare-trend-grid">
    ${compareTrendCard("전체 NOW 순위","globalRank",liveA,liveB,personA,personB,true)}
    ${compareTrendCard("카테고리 순위","categoryRank",liveA,liveB,personA,personB,true)}
    ${compareTrendCard("종합 관심","overallInterest",liveA,liveB,personA,personB)}
    ${compareTrendCard("대중 확산","massExpansion",liveA,liveB,personA,personB)}
    ${compareTrendCard("활동성","activity",liveA,liveB,personA,personB)}
    ${compareTrendCard("미디어 확산","mediaSpread",liveA,liveB,personA,personB)}
  </div></section>`;
}
function compareLiveResult(personA,liveA,personB,liveB) {
  if(!liveA?.analysis || !liveB?.analysis) return `<section class="content-card empty-state compare-live-wait"><h2>비교 분석 데이터가 준비되지 않았습니다</h2><p>두 정치인의 최신 NOW 게시 데이터가 모두 준비되면 같은 기준으로 비교합니다.</p></section>`;
  const insight=buildCompareInsight(personA,liveA,personB,liveB);
  return `<div class="compare-live-report">
    <section class="content-card compare-live-hero">
      ${comparePersonHero(personA,liveA,"a")}
      <div class="compare-live-signal"><span class="eyebrow">COMPARE SIGNAL</span><strong>VS</strong><h2>${esc(insight.headline)}</h2><p>${esc(insight.summary)}</p><div class="compare-signal-counts"><span><b>${insight.advantageA}</b>${esc(personA.name)} 상대강세</span><span><b>${insight.balanced}</b>근접</span><span><b>${insight.advantageB}</b>${esc(personB.name)} 상대강세</span></div></div>
      ${comparePersonHero(personB,liveB,"b")}
    </section>
    ${compareMetricSection("CORE INTELLIGENCE","핵심 관심지표 비교","비교 상대축 · 50 ← 0 → 50 · 초록 → 빨강 = 차이 강도",CORE_COMPARE_METRICS,liveA,liveB,personA,personB,"compare-core-section")}
    ${compareMetricSection("AUDIENCE LANDSCAPE","관심 구조 비교","관심의 깊이와 확장 방향",AUDIENCE_COMPARE_METRICS,liveA,liveB,personA,personB,"compare-audience-section")}
    ${compareMetricSection("ACTIVITY & MEDIA","활동 · 미디어 비교","속도 · 집중 · 지속 · 확산",ACTIVITY_COMPARE_METRICS,liveA,liveB,personA,personB,"compare-activity-section")}
    ${compareMetricSection("ATTENTION FLOW","관심 전이 비교","이슈 노출이 실제 관심으로 연결되는 흐름",FLOW_COMPARE_METRICS,liveA,liveB,personA,personB,"compare-flow-section")}
    ${compareTrendSection(liveA,liveB,personA,personB)}
    <section class="content-card compare-final-diagnosis"><span class="eyebrow">JEONGCHAMSI COMPARE DIAGNOSIS</span><h2>${esc(insight.headline)}</h2><p>${esc(insight.summary)}</p><div><button class="ghost-btn" type="button" data-go="/person/${esc(personA.id)}">${esc(personA.name)} 상세분석</button><button class="ghost-btn" type="button" data-go="/person/${esc(personB.id)}">${esc(personB.name)} 상세분석</button></div><small>지표의 상대강세는 정치적 우열이나 지지율을 의미하지 않으며, 동일한 정참시 분석기준에서 현재 관측된 관심·활동 신호의 차이를 보여줍니다.</small></section>
  </div>`;
}

async function renderPublicCompare(search = "") {
  await ensurePersonProvider();
  const params = new URLSearchParams(search || "");
  const a = params.get("a") || "";
  const b = params.get("b") || "";
  const pa = getPersonSlotById(a);
  const pb = getPersonSlotById(b);
  let result = "";
  if (pa && pb && pa.id === pb.id) {
    result = `<section class="content-card empty-state"><h2>서로 다른 정치인을 선택해주세요</h2><p>같은 기준에서 두 정치인의 현재 흐름을 비교합니다.</p></section>`;
  } else if (pa && pb) {
    const [liveA,liveB] = await Promise.all([getFastNowPerson(pa.id), getFastNowPerson(pb.id)]);
    result = compareLiveResult(pa,liveA,pb,liveB);
  }
  const aLabel = pa ? slotLabel(pa) : "";
  const bLabel = pb ? slotLabel(pb) : "";
  return pageShell(`<main class="subpage compare-live-page"><section class="page-hero"><span class="eyebrow">COMPARE POLITICIANS · MULTI-INTELLIGENCE</span><h1>정치인 비교분석</h1><p>두 정치인의 NOW 순위와 관심·활동·미디어 흐름을 동일한 정참시 분석기준으로 비교합니다.</p></section><section class="content-card compare-picker-card"><form class="compare-picker compare-picker-quick" data-compare-form><label class="person-quick-picker compare-person-quick-picker">정치인 A 검색<input type="search" id="compare-person-search-a" value="${esc(aLabel)}" placeholder="이름·정당·지역 검색" autocomplete="off" data-person-quick-search="#compare-person-a" data-person-quick-results="#compare-person-results-a"><div class="person-quick-results" id="compare-person-results-a" hidden></div><select id="compare-person-a" name="a" required aria-hidden="true" tabindex="-1"><option value="">정치인 A 선택</option>${personOptions(a)}</select></label><span class="compare-vs">VS</span><label class="person-quick-picker compare-person-quick-picker">정치인 B 검색<input type="search" id="compare-person-search-b" value="${esc(bLabel)}" placeholder="이름·정당·지역 검색" autocomplete="off" data-person-quick-search="#compare-person-b" data-person-quick-results="#compare-person-results-b"><div class="person-quick-results" id="compare-person-results-b" hidden></div><select id="compare-person-b" name="b" required aria-hidden="true" tabindex="-1"><option value="">정치인 B 선택</option>${personOptions(b)}</select></label><button class="primary-btn" type="submit">비교하기</button></form></section>${result}</main>`);
}


function adminCompareNumber(value, suffix="") {
  const n=Number(value);return Number.isFinite(n)?`${n>0?"+":""}${Math.round(n*10)/10}${suffix}`:"—";
}
function adminComparePi(entry){return entry?.politicalIntelligence||{};}
function adminComparePersonCard(person,entry,index){
  const pi=adminComparePi(entry),confidence=Number(pi?.confidence?.score),diagnosis=pi?.diagnosis?.label||"JCS INTELLIGENCE";
  return `<article class="admin-compare-person-card"><span class="admin-compare-order">#${index+1}</span>${personPhotoMarkup(person,"admin-compare-avatar",{eager:true,size:120})}<div><h3>${esc(person.name)}</h3><p>${esc([person.party,person.jurisdiction].filter(Boolean).join(" · "))}</p><strong>${esc(diagnosis)}</strong><small>CONFIDENCE ${Number.isFinite(confidence)?Math.round(confidence):"—"}</small></div><button class="ghost-btn" type="button" data-go="/person/${esc(person.id)}">상세</button></article>`;
}
const ADMIN_COMPARE_METRICS=[
  ["종합 관심","CORE INTELLIGENCE",e=>e?.person?.summary?.latest?.scores?.overallInterest],
  ["심층 관심","CORE INTELLIGENCE",e=>e?.person?.summary?.latest?.scores?.highEngagement],
  ["대중 확산","CORE INTELLIGENCE",e=>e?.person?.summary?.latest?.scores?.massExpansion],
  ["활동성","CORE INTELLIGENCE",e=>e?.person?.summary?.latest?.scores?.activity],
  ["이슈 온도","CORE INTELLIGENCE",e=>e?.person?.summary?.latest?.scores?.issueHeat],
  ["미디어 확산","CORE INTELLIGENCE",e=>e?.person?.summary?.latest?.scores?.mediaSpread],
  ["강성지지 이탈","SUPPORT",e=>adminComparePi(e)?.support?.coreAttritionPct],
  ["신규지지 유입","SUPPORT",e=>adminComparePi(e)?.support?.newSupportInflowPct],
  ["관심→지지 GAP","SUPPORT",e=>adminComparePi(e)?.attentionSupportGap?.gap],
  ["정치 회복력","SUPPORT",e=>adminComparePi(e)?.resilience?.score],
  ["뉴스 모멘텀","MEDIA",e=>adminComparePi(e)?.media?.momentum?.news],
  ["SNS 모멘텀","MEDIA",e=>adminComparePi(e)?.media?.momentum?.sns]
];
function adminCompareMetricTable(people,entries){
  return `<section class="content-card admin-compare-table-card"><div class="section-title"><div><span class="eyebrow">CORE INTELLIGENCE</span><h2>다자간 핵심 비교</h2></div><span>선택 인물 동일축 비교</span></div><div class="admin-compare-table-wrap"><table class="admin-compare-table"><thead><tr><th>지표</th>${people.map(p=>`<th>${esc(p.name)}</th>`).join("")}</tr></thead><tbody>${ADMIN_COMPARE_METRICS.map(([label,group,getter])=>{const vals=entries.map(getter);const finite=vals.map((v,i)=>[Number(v),i]).filter(([v])=>Number.isFinite(v)).sort((a,b)=>b[0]-a[0]);const top=finite[0]?.[1];return `<tr><th><small>${esc(group)}</small>${esc(label)}</th>${vals.map((v,i)=>`<td class="${i===top?"is-leader":""}">${adminCompareNumber(v)}</td>`).join("")}</tr>`;}).join("")}</tbody></table></div></section>`;
}
const ADMIN_AGES=[["18–29","18-29"],["30–39","30-39"],["40–49","40-49"],["50–59","50-59"],["60–69","60-69"],["70+","70+"]];
function adminCompareCohortTable(people,entries){
  const cells=[["18–29 M","18_29_m"],["18–29 F","18_29_f"],["30–39 M","30_39_m"],["30–39 F","30_39_f"],["40–49 M","40_49_m"],["40–49 F","40_49_f"],["50–59 M","50_59_m"],["50–59 F","50_59_f"],["60–69 M","60_69_m"],["60–69 F","60_69_f"],["70+ M","70_plus_m"],["70+ F","70_plus_f"]];
  return `<section class="content-card admin-compare-table-card"><div class="section-title"><div><span class="eyebrow">AGE × GENDER</span><h2>연령·성별 다자간 비교</h2></div><span>JCS SUPPORT MOMENTUM</span></div><div class="admin-compare-table-wrap"><table class="admin-compare-table"><thead><tr><th>COHORT</th>${people.map(p=>`<th>${esc(p.name)}</th>`).join("")}</tr></thead><tbody>${ADMIN_AGES.map(([label,key])=>`<tr><th>${esc(label)}</th>${entries.map(e=>`<td>${adminCompareNumber(adminComparePi(e)?.cohorts?.age?.[key]?.value)}</td>`).join("")}</tr>`).join("")}<tr><th>MALE</th>${entries.map(e=>`<td>${adminCompareNumber(adminComparePi(e)?.cohorts?.gender?.MALE?.value)}</td>`).join("")}</tr><tr><th>FEMALE</th>${entries.map(e=>`<td>${adminCompareNumber(adminComparePi(e)?.cohorts?.gender?.FEMALE?.value)}</td>`).join("")}</tr>${cells.map(([label,key])=>`<tr><th><small>AGE × GENDER CELL</small>${esc(label)}</th>${entries.map(e=>`<td>${adminCompareNumber(adminComparePi(e)?.cohorts?.cells?.[key]?.value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}
function adminCompareHistoryTable(people,entries){
  const rows=[["30D 종합관심 변화","overallInterest"],["30D 심층관심 변화","highEngagement"],["30D 대중확산 변화","massExpansion"],["30D 활동성 변화","activity"],["30D 이슈온도 변화","issueHeat"],["30D 미디어확산 변화","mediaSpread"]];
  return `<section class="content-card admin-compare-table-card"><div class="section-title"><div><span class="eyebrow">HISTORY</span><h2>최근 변화 비교</h2></div><span>JCS HISTORY DELTA</span></div><div class="admin-compare-table-wrap"><table class="admin-compare-table"><thead><tr><th>변화</th>${people.map(p=>`<th>${esc(p.name)}</th>`).join("")}</tr></thead><tbody>${rows.map(([label,key])=>`<tr><th>${esc(label)}</th>${entries.map(e=>`<td>${adminCompareNumber(e?.person?.summary?.coreDeltas?.[key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}
function adminComparePicker(selected=[]){
  const ids=[...new Set(selected.filter(Boolean))].slice(0,5);
  const chips=ids.map((id,index)=>{const person=getPersonSlotById(id);if(!person)return "";return `<span class="admin-compare-selected-chip"><b>${index+1}. ${esc(person.name)}</b><small>${esc([person.party,person.jurisdiction].filter(Boolean).join(" · "))}</small><button type="button" data-admin-compare-remove="${esc(id)}" aria-label="${esc(person.name)} 비교에서 제거">×</button></span>`;}).join("");
  const add=ids.length<5?`<label class="person-quick-picker admin-compare-add-picker"><span>${ids.length<2?"정치인을 추가하세요 · 최소 2명":"정치인 추가 · 최대 5명"}</span><input type="search" id="admin-compare-search" placeholder="이름·정당·지역 검색" autocomplete="off" data-person-quick-search="#admin-compare-add-select" data-person-quick-results="#admin-compare-add-results"><div class="person-quick-results" id="admin-compare-add-results" hidden></div><select id="admin-compare-add-select" data-admin-compare-add aria-hidden="true" tabindex="-1"><option value="">정치인 추가</option>${personOptions("")}</select></label>`:`<div class="admin-compare-max"><b>5명 선택 완료</b><span>다른 인물을 비교하려면 위 선택에서 한 명을 제거하세요.</span></div>`;
  return `<section class="content-card compare-picker-card admin-compare-picker-card"><div class="admin-compare-selected">${chips||`<span class="admin-compare-empty">선택된 정치인이 없습니다.</span>`}</div>${add}</section>`;
}
async function renderAdminCompare(search=""){
  await ensurePersonProvider();
  const params=new URLSearchParams(search||"");
  let ids=params.getAll("p").filter(Boolean);
  if(ids.length<2)ids=[params.get("a"),params.get("b")].filter(Boolean);
  ids=[...new Set(ids)].slice(0,5);
  ids.forEach(prefetchNowPerson);
  const people=ids.map(getPersonSlotById).filter(Boolean);
  let result="";
  if(people.length>=2){
    const data=await getFastAdminCompare(people.map(p=>p.id),"30");
    const byId=new Map((data?.people||[]).map(x=>[String(x.personId),x]));
    const entries=people.map(p=>byId.get(String(p.id))||{});
    result=`<div class="admin-multi-compare"><section class="admin-compare-grid">${people.map((p,i)=>adminComparePersonCard(p,entries[i],i)).join("")}</section>${adminCompareMetricTable(people,entries)}${adminCompareCohortTable(people,entries)}${adminCompareHistoryTable(people,entries)}</div>`;
  } else result=`<section class="content-card empty-state"><h2>관리자 다자간 비교</h2><p>최소 2명, 최대 5명의 정치인을 선택하세요.</p></section>`;
  return pageShell(`<main class="subpage compare-live-page admin-compare-page"><section class="page-hero"><span class="eyebrow">ADMIN INTELLIGENCE COMPARE</span><h1>관리자 다자간 정치 인텔리전스 비교</h1><p>2–5명의 정치인을 JCS 관리자 데이터 · AGE × GENDER · HISTORY · CORE INTELLIGENCE 기준으로 한 번에 비교합니다.</p></section>${adminComparePicker(ids)}${result}</main>`);
}

export async function renderCompare(search=""){
  const session=getUserSession();
  const isAdmin=Boolean(session?.authenticated&&session.user?.role==="admin");
  return isAdmin?renderAdminCompare(search):renderPublicCompare(search);
}

export async function renderGeneration(search = "") {
  await ensurePersonProvider();
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
    const photoShell = photo
      ? `<span class="generation-top15-photo has-photo" style="--photo-position:${esc(person?.photoFocus || "50% 28%")}"><img data-politician-photo src="${esc(photo)}" alt="" width="64" height="64" loading="lazy" decoding="async" fetchpriority="low"></span>`
      : `<span class="generation-top15-photo"></span>`;
    return `<article class="generation-top15-row" role="button" tabindex="0" data-go="/person/${esc(personId)}"><span class="generation-top15-rank">${index + 1}</span>${photoShell}<span class="generation-top15-person"><b>${esc(name)}</b><small>${esc(meta)}</small></span><span class="generation-top15-result"><i><em style="width:${share}%"></em></i><small>${Number(count || 0).toLocaleString("ko-KR")}표 · ${share}%</small></span></article>`;
  }).join("");
  const ranking = top15 || `<div class="empty-state generation-top15-empty"><h2>${esc(selectedAge)} 투표 결과를 기다리고 있습니다</h2><p>첫 투표가 들어오면 이곳에 상위 15명까지 순위가 표시됩니다</p></div>`;

  let voteArea = `<div class="member-login-prompt"><span>세대별 모의투표는 로그인 후 참여할 수 있습니다</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`;
  if (session.authenticated) {
    const ageGroup = memberAgeGroup(session.user.birthYear);
    if (data.enabled === false) voteArea = `<div class="empty-inline">현재 세대별 모의투표가 일시 중지되어 있습니다</div>`;
    else if (!ageGroup) voteArea = `<div class="member-login-prompt"><span>정확한 세대별 집계를 위해 회원정보에 출생연도를 먼저 등록해 주세요</span><button class="primary-btn" type="button" data-go="/mypage/profile">출생연도 등록</button></div>`;
    else if (hasGenerationVote(ageGroup)) voteArea = `<div class="empty-inline">${esc(ageGroup)} 투표에 이미 참여했습니다. 선택: ${esc(slotLabel(getPersonSlotById(generationVoteFor(ageGroup)) || { roleLabel: "정치인", slot: 0 }))}</div>`;
    else voteArea = `<form class="generation-vote-form generation-vote-fixed generation-vote-searchable" data-generation-vote-form><input type="hidden" name="ageGroup" value="${esc(ageGroup)}"><label>내 세대<input value="${esc(ageGroup)}" disabled></label><label class="person-quick-picker">대통령 후보 검색<input type="search" placeholder="이름·정당·지역 검색" autocomplete="off" id="generation-person-search" data-person-quick-search="#generation-person" data-person-quick-results="#generation-quick-results"><div class="person-quick-results" id="generation-quick-results" hidden></div><select id="generation-person" name="personId" required><option value="">정치인 선택</option>${personOptions("", data.candidates || [])}</select></label><button class="primary-btn" type="submit">투표하기</button><div class="save-state" data-generation-vote-state></div></form>`;
  }

  let generationAdmin = "";
  if (session.authenticated && session.user?.role === "admin") {
    const adminTools = await import("./generation-admin.js");
    generationAdmin = adminTools.renderGenerationAdminEditor(data, { context:"detail", open:false });
  }

  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h1>세대의 선택, 대통령</h1><p>세대를 선택하면 현재 투표수 기준 상위 15명까지 확인할 수 있습니다. 정치인을 누르면 사진과 전체 인물정보가 있는 상세페이지로 이동합니다</p></section>${generationAdmin}<section class="content-card generation-ranking-card"><div class="section-title"><h2>${esc(selectedAge)}가 선택한 대통령</h2><span>TOP 15 · 총 ${selectedTotal.toLocaleString("ko-KR")}표</span></div><div class="generation-age-tabs">${tabs}</div><div class="generation-top15-list">${ranking}</div></section><section class="content-card"><div class="section-title"><h2>모의투표 참여</h2><span>${session.authenticated ? "회원 출생연도 기준 세대 자동 적용" : "로그인 필요"}</span></div>${voteArea}</section></main>`);
}

function nationalEvaluationShare(votes, key) {
  const total = Number(votes.positive || 0) + Number(votes.neutral || 0) + Number(votes.negative || 0);
  return total ? Math.round(Number(votes[key] || 0) * 100 / total) : 0;
}
function nationalEvaluationSlotMarkup(data, slotKey, session) {
  const slot = data.slots?.[slotKey] || {};
  const person = slot.subjectId ? getPersonSlotById(slot.subjectId) : null;
  const slotName = slotKey === "assembly" ? "국회의원" : "광역·기초단체장";
  const slotCode = slotKey === "assembly" ? "SLOT A" : "SLOT B";
  if (!person) {
    return `<section class="content-card national-evaluation-public-slot empty"><div class="national-evaluation-slot-kicker"><span>${slotCode}</span><b>${slotName}</b></div><div class="empty-state"><div class="empty-icon">評</div><h2>평가 대상 선택 전</h2><p>${slotKey === "assembly" ? "관리자가 국회의원 한 명을 선택하면 이곳에서 평가가 시작됩니다" : "관리자가 광역단체장 또는 기초단체장 한 명을 선택하면 이곳에서 평가가 시작됩니다"}</p></div></section>`;
  }
  const votes = votesForEvaluationSlot(data, slot);
  const total = votes.positive + votes.neutral + votes.negative;
  const active = slot.enabled === true && !slot.closedAt;
  const ended = !!slot.closedAt;
  const typeLabel = nationalEvaluationTypeLabel(person.id);
  const voted = hasNationalEvaluationVote(slot.evaluationId, String(slot.evaluationId || "").startsWith("legacy-") ? person.id : "");
  const photo = person?.photo
    ? `<div class="national-evaluation-person-photo has-photo" style="--photo-position:${esc(person.photoFocus || "50% 28%")}"><img data-politician-photo src="${esc(person.photo)}" alt="" width="112" height="112" loading="eager" decoding="async" fetchpriority="high"></div>`
    : `<div class="national-evaluation-person-photo"></div>`;
  const stateLabel = ended ? "평가 종료" : active ? "평가 진행중" : "평가 일시중지";
  let participation = "";
  if (!session.authenticated) participation = `<div class="member-login-prompt"><span>평가 참여는 로그인 후 가능합니다</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`;
  else if (!active) participation = `<div class="empty-inline">${ended ? "이 평가는 종료되었습니다. 최종 결과를 확인할 수 있습니다" : "현재 평가 참여가 일시중지되어 있습니다"}</div>`;
  else if (voted) participation = `<div class="empty-inline">이 평가에 이미 참여했습니다</div>`;
  else participation = `<form class="evaluation-vote-form" data-national-evaluation-form data-evaluation-id="${esc(slot.evaluationId)}" data-person-id="${esc(person.id)}"><label><input type="radio" name="rating" value="positive" required><b>긍정 평가</b><span>전반적으로 잘하고 있다고 봅니다</span></label><label><input type="radio" name="rating" value="neutral" required><b>보통</b><span>긍정과 아쉬움이 비슷합니다</span></label><label><input type="radio" name="rating" value="negative" required><b>부정 평가</b><span>전반적으로 아쉽다고 봅니다</span></label><button class="primary-btn" type="submit">평가 제출</button><div class="save-state" data-national-evaluation-state></div></form>`;
  return `<section class="content-card national-evaluation-public-slot ${ended ? "ended" : active ? "active" : "paused"}">
    <div class="national-evaluation-slot-kicker"><span>${slotCode}</span><b>${esc(typeLabel)}</b><em>${esc(stateLabel)}</em></div>
    <div class="national-evaluation-person-head">${photo}<div><small>현재 평가 대상</small><h2>${esc(person.name)}</h2><p>${esc([person.party,person.jurisdiction].filter(Boolean).join(" · "))}</p><button class="ghost-btn" type="button" data-go="/person/${esc(person.id)}">상세페이지</button></div></div>
    <div class="section-title national-evaluation-result-title"><h2>${ended ? "최종 평가 결과" : "현재 평가 결과"}</h2><span>${total.toLocaleString("ko-KR")}명 참여</span></div>
    <div class="evaluation-result-grid"><article><small>긍정</small><strong>${nationalEvaluationShare(votes,"positive")}%</strong><span>${votes.positive.toLocaleString("ko-KR")}표</span></article><article><small>보통</small><strong>${nationalEvaluationShare(votes,"neutral")}%</strong><span>${votes.neutral.toLocaleString("ko-KR")}표</span></article><article><small>부정</small><strong>${nationalEvaluationShare(votes,"negative")}%</strong><span>${votes.negative.toLocaleString("ko-KR")}표</span></article></div>
    <div class="national-evaluation-participation"><div class="section-title"><h2>정참시민 평가 참여</h2><span>${voted ? "참여 완료" : stateLabel}</span></div>${participation}</div>
  </section>`;
}
function nationalEvaluationHistoryMarkup(data) {
  const currentEvaluationIds = new Set(Object.values(data.slots || {}).map(x=>String(x?.evaluationId || "")).filter(Boolean));
  const rows = (Array.isArray(data.history) ? data.history : []).map((item, index) => {
    const subjectId = String(item?.subjectId || "");
    const person = subjectId ? getPersonSlotById(subjectId) : null;
    if (!person) return null;
    const evaluationId = String(item?.evaluationId || "");
    const stored = (evaluationId && data.results?.[evaluationId]) || data.results?.[subjectId] || {};
    const votes = {
      positive: Math.max(0, Number(item?.positive ?? stored.positive ?? 0) || 0),
      neutral: Math.max(0, Number(item?.neutral ?? stored.neutral ?? 0) || 0),
      negative: Math.max(0, Number(item?.negative ?? stored.negative ?? 0) || 0)
    };
    const total = votes.positive + votes.neutral + votes.negative;
    return { key:evaluationId || `${subjectId}-${item?.closedAt || index}`, subjectId, person, type:nationalEvaluationTypeLabel(subjectId), votes, total, closedAt:item?.closedAt || "" };
  }).filter(Boolean).filter(x=>!currentEvaluationIds.has(String(x.key || ""))).filter((x,i,arr)=>arr.findIndex(y=>y.key===x.key)===i);
  return `<section class="content-card"><div class="section-title"><h2>지난 전국 평가</h2><span>${rows.length}건</span></div>${rows.length ? `<div class="evaluation-history-list">${rows.map(x=>`<article><div><b>${esc(x.person.name)} <small>${esc(x.type)}</small></b><span>${x.total.toLocaleString("ko-KR")}명 참여${x.closedAt ? ` · ${esc(formatDate(x.closedAt))}` : ""}</span></div><p>긍정 ${nationalEvaluationShare(x.votes,"positive")}% · 보통 ${nationalEvaluationShare(x.votes,"neutral")}% · 부정 ${nationalEvaluationShare(x.votes,"negative")}%</p></article>`).join("")}</div>` : `<div class="empty-inline">아직 종료된 이전 평가가 없습니다</div>`}</section>`;
}

export async function renderNationalEvaluation() {
  await ensurePersonProvider();
  const data = normalizeNationalEvaluation(await getDomain("nationalEvaluation"));
  const session = getUserSession();
  let nationalAdmin = "";
  if (session.authenticated && session.user?.role === "admin") {
    const tools = await import("./national-evaluation-admin.js");
    nationalAdmin = tools.renderNationalEvaluationAdminEditor(data, { context:"detail", open:true });
  }
  return pageShell(`<main class="subpage national-evaluation-page"><section class="page-hero"><span class="eyebrow">NATIONAL EVALUATION · JEONGCHAMSI CITIZENS</span><h1>정참시민 전국 평가제</h1><p>국회의원 한 명과 광역단체장·기초단체장 중 한 명을 정참시민이 각각 독립적으로 평가합니다</p></section>${nationalAdmin}<div class="national-evaluation-two-slot-page">${nationalEvaluationSlotMarkup(data,"assembly",session)}${nationalEvaluationSlotMarkup(data,"local",session)}</div>${nationalEvaluationHistoryMarkup(data)}</main>`);
}

export async function renderSearch(query = "") {
  await ensurePersonProvider();
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

  const evaluationData = rawQ ? normalizeNationalEvaluation(await getDomain("nationalEvaluation")) : normalizeNationalEvaluation({});
  const evaluationPersonIds = rawQ ? [
    ...Object.values(evaluationData.slots || {}).map(x=>x?.subjectId),
    ...(evaluationData.history || []).map(x=>x?.subjectId),
    ...Object.keys(evaluationData.results || {}).filter(id=>/^(?:assembly|metropolitan|basic)-\d{3}$/.test(id))
  ].filter(Boolean).filter((id,i,arr)=>arr.indexOf(id)===i) : [];
  const evaluationPeople = evaluationPersonIds
    .map(id=>getPersonSlotById(id))
    .filter(Boolean)
    .filter(person => party ? searchNorm(person.party) === searchNorm(party.canonical) : textMatches(personSearchText(person),terms));


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

  const peopleSection = allPeople.length ? `<section class="content-card search-people-section"><div class="section-title"><h2>${party ? `${esc(partyLabel)} 정치인` : "정치인"}</h2><span>총 ${allPeople.length}명</span></div>${partyCounts ? `<div class="search-party-counts"><span>국회의원 <b>${partyCounts.assembly}</b></span><span>광역단체장 <b>${partyCounts.metropolitan}</b></span><span>기초단체장 <b>${partyCounts.basic}</b></span></div>` : ""}<div class="search-person-grid">${peoplePreview.map(p=>`<button type="button" data-go="/person/${esc(p.id)}">${personPhotoMarkup(p, "search-person-avatar", { size:72 })}<div><b>${esc(p.name)}</b><small>${esc(p.party)} · ${esc(p.jurisdiction)}</small></div></button>`).join("")}</div>${allPeople.length > peoplePreview.length || party ? `<div class="search-all-people"><button class="primary-btn" type="button" data-go="${party ? `/now?party=${encodeURIComponent(partyLabel)}&limit=50` : `/now?search=${encodeURIComponent(rawQ)}&limit=50`}">${party ? `${esc(partyLabel)} 정치인 전체보기` : `정치인 ${allPeople.length}명 전체보기`} →</button></div>` : ""}</section>` : "";

  const presidentSection = presidentMatch ? `<section class="content-card search-president-result"><div class="section-title"><h2>대통령 · 정부</h2><span>1건</span></div><button type="button" data-go="/president"><span class="search-person-avatar president"></span><div><b>${esc(GOVERNMENT_SEED.profile.name)} 대통령</b><small>${esc(GOVERNMENT_SEED.profile.office)} · 대통령·총리·장관·주요 행정인사</small></div><em>대통령 페이지 →</em></button></section>` : "";

  const exampleCopy = (label) => ({
    "정참시 NEWS":"관련 정치 뉴스 제목 · 주요 이슈 요약 · 등록일",
    "COLUMN":"관련 칼럼 제목 · 필자 · 핵심 관점",
    "IT’S ME":"관련 시민 정책제안 · 카테고리 · 참여정보",
    "정뮤니티":"관련 시민 게시글 · 작성자 · 반응"
  }[label] || "관련 콘텐츠가 등록되면 이곳에 표시됩니다");

  const contentMarkup = contentGroups.map(g=>`<section class="content-card search-board-group"><div class="section-title"><h2>${esc(g.label)}</h2><span>${g.matches.length}건</span></div>${g.matches.length ? `<div class="board-list">${g.matches.slice(0,5).map(x=>`<article class="no-thumb"><a href="/${g.route}/${esc(x.id)}" data-route><span class="type">${esc(g.label)}</span><h2>${esc(x.title)}</h2><p>${esc(x.summary||x.body||"")}</p></a><small>${authorIdentity(x.author||"정참시", x.ownerId, searchAuthorProfiles)} · ${formatDate(x.createdAt)}</small></article>`).join("")}</div>${g.matches.length>5?`<div class="search-group-more"><button class="ghost-btn" type="button" data-go="/${g.route}?q=${encodeURIComponent(rawQ)}">관련 ${esc(g.label)} 전체보기 →</button></div>`:""}` : `<div class="search-empty-example"><b>아직 ‘${esc(rawQ)}’ 관련 ${esc(g.label)}가 없습니다.</b><p>향후 관련 콘텐츠가 등록되면 이 카테고리에 자동으로 표시됩니다</p><article><span>노출 예시</span><strong>${esc(exampleCopy(g.label))}</strong></article></div>`}</section>`).join("");
  const evaluationMarkup = `<section class="content-card search-board-group"><div class="section-title"><h2>정참시민 전국평가제</h2><span>${evaluationPeople.length}건</span></div>${evaluationPeople.length ? `<div class="search-evaluation-list">${evaluationPeople.slice(0,5).map(p=>`<button type="button" data-go="/national-evaluation">${personPhotoMarkup(p, "search-person-avatar", { size:72 })}<div><b>${esc(p.name)}</b><small>${esc(p.party)} · ${esc(p.jurisdiction)}</small></div><em>평가 보기 →</em></button>`).join("")}</div>` : `<div class="search-empty-example"><b>아직 ‘${esc(rawQ)}’ 관련 전국평가 데이터가 없습니다.</b><p>해당 정치인이 전국평가 대상으로 등록되면 이곳에 표시됩니다</p><article><span>노출 예시</span><strong>정치인 이름 · 긍정/보통/부정 평가 · 참여자 수</strong></article></div>`}</section>`;

  return pageShell(`<main class="subpage search-page"><section class="page-hero"><span class="eyebrow">SEARCH · INTEGRATED</span><h1>통합검색</h1><p>검색어: <b>${esc(rawQ || "—")}</b>${party ? ` · <span>${esc(partyLabel)}로 정규화해 검색했습니다</span>` : ""}</p></section>${peopleSection}${presidentSection}${contentMarkup}${rawQ ? evaluationMarkup : ""}${!rawQ ? `<section class="content-card"><div class="empty-state tall"><h2>검색어를 입력해 주세요</h2><p>정치인 이름·정당 별칭·지역·정책·게시글을 한 번에 검색할 수 있습니다</p></div></section>` : !hasResults ? `<section class="content-card"><div class="empty-state tall"><h2>검색 결과가 없습니다</h2><p>띄어쓰기와 정당 별칭도 함께 처리하지만 다른 검색어를 시도해 보세요</p></div></section>` : ""}</main>`);
}

