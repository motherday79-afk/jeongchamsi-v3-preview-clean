import { HOME_NOW_PREVIEW } from "../data/home-person-preview.js";
import { politicianPhoto } from "../data/politician-photo-index.js";
import { getHomeSnapshot, getAuthorProfiles } from "../core/repository.js";
import { drawer, siteHeader, footer } from "./layout.js";
import { getUserSummary, hasVotedPoll } from "../core/user.js";
import { launcherServices, serviceIconSvg } from "../data/service-catalog.js";
import { badgeByKey, badgeGemSvg } from "../data/badge-catalog.js";
import { authorIdentity, authorOwnerIds } from "./author-identity.js";
import { normalizeNationalEvaluation, votesForEvaluationSlot, nationalEvaluationTypeLabel } from "./national-evaluation-model.js";

const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[c]));

function recentPersonSlotLabel(id = "", getPerson = null) {
  const person = typeof getPerson === "function" ? getPerson(id) : null;
  if (person?.connected && person?.name) {
    return {
      group: person.roleLabel,
      number: String(person.slot),
      name: person.name,
      short: [person.name, person.party, person.jurisdiction].filter(Boolean).join(" · ")
    };
  }
  const raw = String(id || "");
  const match = raw.match(/^(assembly|metropolitan|basic)-(\d{3})$/);
  if (!match) return { group:"정치인", number:"", name:"정치인", short:"정치인" };
  const group = match[1] === "assembly" ? "국회의원" : (match[1] === "metropolitan" ? "광역단체장" : "기초단체장");
  const number = String(Number(match[2]));
  return { group, number, name:`${group} ${number}`, short:`${group} ${number}` };
}

function safeImage(v = "") {
  const s = String(v || "");
  return s.startsWith("data:image/") || s.startsWith("https://") ? s : "";
}

function photoAsset(id = "", variant = "mini", alt = "정치인 사진", options = {}) {
  const photo = politicianPhoto(id, variant);
  if (!photo) return { photo:null, img:"" };
  const loading = options.loading || "lazy";
  const fetchpriority = options.fetchpriority || "low";
  const sizes = options.sizes ? ` sizes="${esc(options.sizes)}"` : "";
  return {
    photo,
    img:`<img data-politician-photo src="${esc(photo.url)}" alt="" width="${photo.width}" height="${photo.width}" loading="${loading}" decoding="async" fetchpriority="${fetchpriority}"${sizes}>`
  };
}

function dateLabel(v) {
  if (!v) return "";
  try { return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(new Date(v)); }
  catch { return ""; }
}

function published(items = []) {
  return items.filter(x => x && x.published !== false);
}

function brandHero(data = {}) {
  const hero = {
    kicker:"정참시 — 정치에 참여할 시간",
    headline:"바라볼 때가 아닌, 행동할 때 정치가 시작됩니다",
    subline1:"알고, 비교하고, 선택하고, 평가하는 것",
    subline2:"한 사람의 작은 행동이 정치의 방향을 만듭니다",
    learnLabel:"정참시 더 알아보기",
    supportLabel:"정참시 후원하기",
    artImage:"",
    ...(data.hero || {})
  };
  const art = safeImage(hero.artImage) || "/assets/brand/hero-art.webp";
  const headline = esc(hero.headline).replace("행동할 때", '<strong>행동할 때</strong>');
  return `<section class="brand-hero module" id="brand-hero">
    <div class="brand-hero-copy">
      <span class="brand-kicker">${esc(hero.kicker)}</span>
      <h1>${headline}</h1>
      <div class="brand-subcopy"><p>${esc(hero.subline1)}</p><p>${esc(hero.subline2)}</p></div>
      <div class="brand-hero-actions">
        <button class="brand-primary" type="button" data-go="/about">${esc(hero.learnLabel)} <span>→</span></button>
        <a class="brand-secondary" href="https://toon.at/donate/jungchamsi" target="_blank" rel="noopener noreferrer">${esc(hero.supportLabel)} <span>♡</span></a>
      </div>
    </div>
    <div class="brand-hero-art" aria-hidden="true" style="background-image:url('${esc(art)}')"></div>
  </section>`;
}

function safeHeroHref(value = "", fallback = "/") {
  const href = String(value || "").trim();
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  try { const url = new URL(href); return url.protocol === "https:" ? url.toString() : fallback; }
  catch { return fallback; }
}
function heroAction(label, href, className) {
  const target = safeHeroHref(href, "/");
  const external = target.startsWith("https://");
  return `<a class="${className}" href="${esc(target)}" ${external ? `target="_blank" rel="noopener noreferrer"` : `data-route`}>${esc(label)} <span>${className.includes("secondary") ? "♡" : "→"}</span></a>`;
}
function productHero(brand = {}) {
  const hero = {
    productKicker:"JEONGCHAMSI",
    productTagline:"정치에 참여할 시간",
    productHeadline:"정치를 보는 것에서 움직이는 것으로!",
    productAccentText:"움직이는 것",
    productDescription:"인물·이슈·여론·제안을 한곳에서 보고, 비교하고, 직접 참여하세요",
    productPrimaryLabel:"정참시 응원하기",
    productPrimaryHref:"/about",
    productSecondaryLabel:"정참시 후원하기",
    productSecondaryHref:"https://toon.at/donate/jungchamsi",
    productHeadlineTone:"white",
    productAccentTone:"yellow",
    productDescriptionTone:"mint",
    artImage:"",
    ...(brand?.hero || {})
  };
  const productHeadline = String(hero.productHeadline || "정치를 보는 것에서 움직이는 것으로!").trim() || "정치를 보는 것에서 움직이는 것으로!";
  const accentText = String(hero.productAccentText ?? "움직이는 것").trim();
  const accentIndex = accentText ? productHeadline.indexOf(accentText) : -1;
  let headlineHtml = esc(productHeadline).replace(/\n/g, "<br>");
  if (accentIndex >= 0) {
    const prefix = productHeadline.slice(0, accentIndex);
    const suffix = productHeadline.slice(accentIndex + accentText.length);
    const autoBreak = accentText === "움직이는 것" && !productHeadline.includes("\n") && prefix;
    headlineHtml = `${esc(prefix).replace(/\n/g,"<br>")}${autoBreak ? "<br>" : ""}<strong>${esc(accentText)}</strong>${esc(suffix).replace(/\n/g,"<br>")}`;
  }
  const allowedTone = value => ["default","white","mint","yellow","dark"].includes(String(value || "")) ? String(value) : "default";
  const art = safeImage(hero.artImage);
  const heroClass = `product-hero product-hero-participation product-hero-headline-tone-${allowedTone(hero.productHeadlineTone)} product-hero-accent-tone-${allowedTone(hero.productAccentTone)} product-hero-description-tone-${allowedTone(hero.productDescriptionTone)}${art ? " product-hero-has-art" : ""}`;
  const artStyle = art ? ` style="--product-hero-art:url('${esc(art)}')"` : "";
  return `<section class="${heroClass}" aria-label="정참시 참여 허브"${artStyle}>
    <div class="product-hero-copy">
      <div class="product-hero-kicker"><span>${esc(hero.productKicker)}</span><em>${esc(hero.productTagline)}</em></div>
      <h1>${headlineHtml}</h1>
      <p>${esc(hero.productDescription)}</p>
      <div class="product-hero-actions">${heroAction(hero.productPrimaryLabel,hero.productPrimaryHref,"hero-action-primary")}${heroAction(hero.productSecondaryLabel,hero.productSecondaryHref,"hero-action-secondary")}</div>
    </div>
    <div class="product-hero-live hero-participation-hub">
      <button type="button" class="hero-hub-card hero-hub-request" data-go="/request-politician"><span class="hero-hub-label">POLITICIAN REQUEST</span><strong>찾는 정치인이 없나요?</strong><p>이름만 남겨주세요. 정보를 확인해 등록합니다</p><em>정치인 등록 요청 →</em></button>
      <button type="button" class="hero-hub-card hero-hub-partners" data-go="/partners"><span class="hero-hub-label">JEONGCHAMSI PARTNERS</span><strong>정참시와 함께 콘텐츠를 만들어주세요</strong><p>PARTNER는 COLUMN·NEWS를 직접 작성할 수 있습니다</p><em>파트너스 신청 →</em></button>
    </div>
  </section>`;
}
function productLauncher() {
  const items = launcherServices();
  return `<section class="product-launcher product-launcher-compact"><div class="product-launcher-head"><div><span>EXPLORE JEONGCHAMSI</span><h2>정참시는 여러분의 참여로 만들어갑니다</h2></div><button type="button" data-drawer-open>전체 서비스 <span>＋</span></button></div><div class="product-launcher-grid">${items.map(item=>`<button type="button" class="launcher-card launcher-${item.key === "poll" ? "choice" : item.key}" data-go="${item.href}" aria-label="${esc(item.label)} · ${esc(item.description)}"><span class="launcher-icon">${serviceIconSvg(item.key)}</span><span class="launcher-copy"><b>${esc(item.shortLabel || item.label)}</b></span><span class="launcher-cue">→</span></button>`).join("")}</div></section>`;
}

function columnMini(item, authorProfiles = {}) {
  if (!item) return `<article class="column-card"><div class="column-thumb"></div><div class="column-card-copy"><span class="skeleton small-title"></span><span class="skeleton mini"></span></div></article>`;
  const cover = safeImage(item.coverImage);
  return `<article class="column-card" role="button" tabindex="0" data-go="/column/${esc(item.id)}">
    <div class="column-thumb ${cover ? "has-cover" : ""}" ${cover ? `style="background-image:url('${cover}')"` : ""}></div>
    <div class="column-card-copy live"><b>${esc(item.title)}</b><span>${authorIdentity(item.author || "정참시", item.ownerId, authorProfiles)} · ${dateLabel(item.createdAt)}</span></div>
  </article>`;
}


function communityRow(item, index, authorProfiles = {}) {
  if (!item) return `<div class="community-row"><span class="community-order">${String(index + 1).padStart(2, "0")}</span><span class="community-copy"><b>정뮤니티 게시물 제목 영역</b><em>말머리 · 작성자 · 시간</em></span><span class="community-stats">댓글 · 조회</span></div>`;
  return `<div class="community-row live" role="button" tabindex="0" data-go="/community/${esc(item.id)}"><span class="community-order">${String(index + 1).padStart(2, "0")}</span><span class="community-copy"><b>${esc(item.title)}</b><em>${authorIdentity(item.author || "정참시", item.ownerId, authorProfiles)} · ${dateLabel(item.createdAt)}</em></span><span class="community-stats">좋아요 ${Number(item.likes || 0)} · 조회 ${Number(item.views || 0)}</span></div>`;
}

function sideNewsRow(item, i) {
  if (!item) return `<div class="side-row"><span>${i + 1}</span><i></i></div>`;
  return `<div class="side-row live" role="button" tabindex="0" data-go="/news/${esc(item.id)}"><span>${i + 1}</span><i>${esc(item.title)}</i></div>`;
}

function itsmeHomeCard(item, index) {
  if (!item) return `<article class="itsme-card itsme-empty"><span>${String(index + 1).padStart(2, "0")}</span><b>아직 등록된 정책이 없습니다</b></article>`;
  return `<article class="itsme-card" role="button" tabindex="0" data-go="/itsme/${esc(item.id)}"><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(item.title || "정책 제안")}</b></article>`;
}

function nationalEvaluationHomeSlot(data, slotKey, getPerson = null) {
  const slot = data.slots?.[slotKey] || {};
  const person = slot.subjectId && typeof getPerson === "function" ? getPerson(slot.subjectId) : null;
  const slotLabel = slotKey === "assembly" ? "국회의원" : "광역·기초단체장";
  const slotCode = slotKey === "assembly" ? "SLOT A" : "SLOT B";
  if (!person) return `<article class="national-eval-home-card empty"><div class="national-eval-home-type"><span>${slotCode}</span><b>${slotLabel}</b></div><div class="eval-person"><span class="eval-avatar"></span><div><small>이번 평가 대상</small><b>대상 선택 전</b></div></div><div class="eval-score"><small>전국 평가</small><strong>—</strong><span>준비중</span></div></article>`;
  const subjectPhoto = photoAsset(person.id, "sidebar", person.name, { sizes:"58px" });
  const avatar = `<span class="eval-avatar ${subjectPhoto.photo ? "has-photo" : ""}"${subjectPhoto.photo ? ` style="--photo-position:${esc(subjectPhoto.photo.focus)}"` : ""}>${subjectPhoto.img}</span>`;
  const votes = votesForEvaluationSlot(data, slot);
  const total = votes.positive + votes.neutral + votes.negative;
  const positiveShare = total ? Math.round(votes.positive * 100 / total) : 0;
  const state = slot.closedAt ? "평가 종료" : slot.enabled ? "평가 진행중" : "평가 일시중지";
  const typeLabel = nationalEvaluationTypeLabel(person.id);
  return `<article class="national-eval-home-card ${slot.closedAt ? "ended" : slot.enabled ? "active" : "paused"}" role="button" tabindex="0" data-go="/national-evaluation"><div class="national-eval-home-type"><span>${slotCode}</span><b>${esc(typeLabel)}</b></div><div class="eval-person">${avatar}<div><small>이번 평가 대상</small><b>${esc(person.name)}</b><em>${esc([person.party,person.jurisdiction].filter(Boolean).join(" · "))}</em></div></div><div class="eval-score"><small>긍정 평가</small><strong>${total ? `${positiveShare}%` : "—"}</strong><span>${total ? `${total.toLocaleString("ko-KR")}명 참여` : state}</span></div></article>`;
}

function nationalEvaluationHomeMarkup(input = {}, getPerson = null) {
  const data = normalizeNationalEvaluation(input);
  return `<div class="national-eval-dual">${nationalEvaluationHomeSlot(data,"assembly",getPerson)}${nationalEvaluationHomeSlot(data,"local",getPerson)}</div>`;
}

function pollMarkup(poll) {
  if (!poll) return `<div class="poll-main"><div class="poll-question"><span class="poll-status">준비중</span><h3>시민들의 선택 설문 영역</h3><p>관리자가 설문을 등록하면 최대 3개 선택지를 미리 보여줍니다</p></div><div class="poll-vote-panel"><div class="poll-options">${Array.from({length:3},()=>`<button type="button" disabled><span>선택지</span><i><em style="width:0%"></em></i><b>—</b></button>`).join("")}</div></div></div>`;
  const total = (poll.options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
  const optionMarkup = (poll.options || []).slice(0,3).map(opt => {
    const pct = total ? Math.round(Number(opt.votes || 0) * 100 / total) : 0;
    return `<button type="button" data-go="/poll?pollId=${encodeURIComponent(poll.id)}&option=${encodeURIComponent(opt.id)}" aria-label="${esc(opt.label)} 선택 후 전체 설문 보기"><span>${esc(opt.label)}</span><i><em style="width:${pct}%"></em></i><b>${pct}%</b></button>`;
  }).join("");
  return `<div class="poll-main"><div class="poll-question"><h3>${esc(poll.question)}</h3></div><div class="poll-vote-panel"><div class="poll-options">${optionMarkup}</div><div class="poll-confirm-row"><span>항목을 누르면 전체 설문으로 이동합니다</span><button class="ghost-btn" type="button" data-go="/poll?pollId=${encodeURIComponent(poll.id)}">전체 선택지 보기</button></div></div></div>`;
}

function academyRows(slots = []) {
  const rows = slots.slice(0,4);
  while (rows.length < 4) rows.push(null);
  return rows.map(slot => {
    if (!slot) return `<div class="schedule-row empty"><span class="schedule-date">—</span><span class="schedule-line"><em>일정 준비중</em></span><button type="button" disabled>예정</button></div>`;
    const rawDate = String(slot.date || "");
    let dateLabel = rawDate || "날짜 미정";
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y,m,d] = rawDate.split("-");
      const day = ["일","월","화","수","목","금","토"][new Date(Number(y),Number(m)-1,Number(d)).getDay()];
      dateLabel = `${m}.${d} ${day}`;
    }
    const time = [slot.startTime, slot.endTime].filter(Boolean).join("–");
    const status = slot.status || (slot.closed ? "closed" : "open");
    const statusLabel = status === "closed" ? "마감" : status === "scheduled" ? "예정" : "신청가능";
    return `<div class="schedule-row"><span class="schedule-date">${esc(dateLabel)}${time ? `<small>${esc(time)}</small>` : ""}</span><span class="schedule-line"><em>${esc(slot.title || "정참시 아카데미")}</em></span><button type="button" data-go="/academy" ${status === "closed" ? "disabled" : ""}>${statusLabel}</button></div>`;
  }).join("");
}


let nowRankRotationTimer = 0;
export function hydrateHomeNowCarousel(){
  const carousel=document.querySelector('[data-now-rank-carousel]');
  if(!carousel)return;
  const pages=[...carousel.querySelectorAll('[data-now-rank-page]')];
  if(!pages.length)return;
  let index=Math.max(0,Math.min(pages.length-1,Number(carousel.dataset.page||0)));
  const status=carousel.querySelector('[data-now-rank-status]');
  const show=next=>{index=(next+pages.length)%pages.length;carousel.dataset.page=String(index);pages.forEach((page,i)=>{page.hidden=i!==index;page.classList.toggle('is-active',i===index);});if(status)status.textContent=`${index+1} / ${pages.length}`;};
  const stop=()=>{if(nowRankRotationTimer){clearInterval(nowRankRotationTimer);nowRankRotationTimer=0;}};
  const start=()=>{stop();if(pages.length>1)nowRankRotationTimer=setInterval(()=>show(index+1),4000);};
  carousel.querySelector('[data-now-rank-prev]')?.addEventListener('click',()=>{show(index-1);start();});
  carousel.querySelector('[data-now-rank-next]')?.addEventListener('click',()=>{show(index+1);start();});
  carousel.addEventListener('pointerenter',stop);carousel.addEventListener('pointerleave',start);carousel.addEventListener('focusin',stop);carousel.addEventListener('focusout',start);
  show(index);start();
}

export async function renderHome() {
  const data = await getHomeSnapshot();
  const userSummary = getUserSummary();
  const userSession = userSummary.session;
  const userReady = !document.documentElement.classList.contains("jcv3-user-pending");
  let getPerson = null;
  const generationDisplayResults = data.generation?.demoMode === true ? (data.generation?.demoResults || {}) : (data.generation?.results || {});
  const generationHasVotes = Object.values(generationDisplayResults).some(votes => Object.values(votes || {}).some(v => Number(v || 0) > 0));
  const needsPersonLookup = userReady && ((userSummary.recentPeople || []).length || data.nationalEvaluation?.subjectId || generationHasVotes);
  if (needsPersonLookup) {
    const provider = await import("../data/person-lite.js");
    getPerson = provider.getPersonLiteById;
  }
  const columns = published(data.columns?.items || []);
  const columnCards = columns.slice(0, 4);
  while (columnCards.length < 4) columnCards.push(null);

  const community = published(data.community?.items || []);
  const general = community.slice(0, 5);
  while (general.length < 5) general.push(null);

  const news = published(data.news?.items || []).slice(0, 5);
  while (news.length < 5) news.push(null);

  const homeAuthorProfiles = await getAuthorProfiles(authorOwnerIds([...columnCards, ...general].filter(Boolean)));

  const poll = published(data.polls?.items || [])[0] || null;
  const itsmeHomeItems = published(data.itsme?.items || [])
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);
  while (itsmeHomeItems.length < 6) itsmeHomeItems.push(null);
  const nationalEvaluation = data.nationalEvaluation || {};
  const academyConfig = {
    eyebrow:"JEONGCHAMSI ACADEMY",
    title:"정참시 아카데미",
    headline:"정치의 꿈을 실제 준비로",
    cta:"수강 가능 일정 확인",
    ...(data.academy?.config || {})
  };
  const academySlots = [...(data.academy?.slots || [])].filter(x => x.published !== false).sort((a,b)=>`${a.date||""} ${a.startTime||""}`.localeCompare(`${b.date||""} ${b.startTime||""}`)).slice(0, 4);

  const nowSignals = data.nowSignals || { source:"none", keywords:[], rising:[] };
  const manualKeywords = (data.keywords?.items || []).filter(x => x.published !== false).slice(0, 8);
  const keywords = Array.isArray(nowSignals.keywords) && nowSignals.keywords.length ? nowSignals.keywords.slice(0, 8) : manualKeywords;
  const recentPeople = userSummary.recentPeople || [];

  const publishedNowRows = Array.isArray(data.nowRank?.ranked) ? data.nowRank.ranked : [];
  const nowPeople = publishedNowRows.length
    ? publishedNowRows.map(row => ({
        ...(row.person || {}),
        rank: Number(row.rank || 0),
        score: Number(row.score || 0),
        search: row.search || {},
        news: row.news || {}
      })).filter(p => p.id && p.name)
    : HOME_NOW_PREVIEW;
  const trending = Array.isArray(nowSignals.rising) && nowSignals.rising.length
    ? nowSignals.rising.slice(0,5).map(x => ({
        ...x,
        meta:[x.trendLabel, `NOW ${x.rank}위`, x.party, x.jurisdiction].filter(Boolean).join(" · ")
      }))
    : nowPeople.slice(0,5).map((p,i) => ({
        title:p.name,
        meta:[`NOW ${p.rank || i + 1}위`,p.party,p.jurisdiction].filter(Boolean).join(" · "),
        href:`/person/${p.id}`,
        rank:p.rank || i+1,
        trendLabel:"NOW"
      }));
  const partyToneClass = (party = "") => {
    const name = String(party || "");
    if (name.includes("더불어민주당") || name === "민주당") return "party-democratic";
    if (name.includes("국민의힘")) return "party-peoplepower";
    if (name.includes("개혁신당")) return "party-reform";
    if (name.includes("조국혁신당")) return "party-innovation";
    if (name.includes("진보당")) return "party-progressive";
    if (name.includes("기본소득당")) return "party-basicincome";
    if (name.includes("사회민주당")) return "party-socialdemocratic";
    return "party-independent";
  };
  const partyToneMark = (party = "") => {
    const name = String(party || "");
    if (name.includes("더불어민주당") || name === "민주당") return "민";
    if (name.includes("국민의힘")) return "국";
    if (name.includes("개혁신당")) return "개";
    if (name.includes("조국혁신당")) return "조";
    if (name.includes("진보당")) return "진";
    if (name.includes("기본소득당")) return "기";
    if (name.includes("사회민주당")) return "사";
    return "무";
  };
  const rankTop30 = nowPeople.slice(0,30);
  const rankPages = Array.from({length:Math.max(1,Math.ceil(rankTop30.length/10))},(_,pageIndex)=>{
    const cards=rankTop30.slice(pageIndex*10,pageIndex*10+10).map((p,localIndex)=>{
      const absoluteIndex=pageIndex*10+localIndex,photo=politicianPhoto(p.id,"mini");
      const photoMarkup=photo ? `<img data-politician-photo src="${esc(photo.url)}" alt="" width="${photo.width}" height="${photo.width}" loading="lazy" decoding="async" fetchpriority="low">` : "";
      return `<article class="rank-top-card ${partyToneClass(p.party)}" role="button" tabindex="0" data-go="/person/${esc(p.id)}"><span class="rank-party-flag" title="${esc(p.party || "무소속")}" aria-label="${esc(p.party || "무소속")}">${partyToneMark(p.party)}</span><div class="rank-top-no">${Number(p.rank)||absoluteIndex+1}</div><div class="rank-top-avatar ${photo ? "has-photo" : ""}"${photo ? ` style="--photo-position:${esc(photo.focus)}"` : ""}>${photoMarkup}</div><div class="rank-top-copy"><b>${esc(p.name)}</b><span>${esc(p.party)} · ${esc(p.jurisdiction)}</span></div></article>`;
    }).join("");
    return `<div class="rank-top-grid rank-top-grid-10 now-rank-page" data-now-rank-page="${pageIndex}" ${pageIndex?"hidden":""}>${cards}</div>`;
  }).join("");
  const rankPageCount=Math.max(1,Math.ceil(rankTop30.length/10));
  const sideRows = count => Array.from({ length: count }, (_, i) => `<div class="side-row"><span>${i + 1}</span><i></i></div>`).join("");

  const loginMobile = !userReady
    ? `<div class="mobile-login"><div><b>회원정보 확인 중</b><span>메인 콘텐츠를 먼저 표시하고 있습니다</span></div><button type="button" disabled aria-label="회원정보 확인 중">···</button></div>`
    : userSession.authenticated
      ? `<div class="mobile-login"><div><b>${esc(userSession.user.nickname || userSession.user.id)}님</b><span>즐겨찾기 ${userSummary.favorites} · 좋아요 ${userSummary.likedPosts} · 설문 ${userSummary.pollVotes}</span></div><button type="button" data-go="/mypage">MY</button></div>`
      : `<div class="mobile-login"><div><b>정참시에 로그인하세요</b><span>즐겨찾기 · 참여 · 배지 · 알림</span></div><button type="button" data-go="/login">로그인</button></div>`;

  const loginSide = !userReady
    ? `<section class="side-card login-card side-login session-pending"><b>회원정보 확인 중</b><p>정치 콘텐츠는 기다리지 않고 먼저 표시합니다</p><button type="button" disabled aria-label="회원정보 확인 중">확인 중</button></section>`
    : userSession.authenticated
      ? `<section class="side-card login-card side-login"><b>${esc(userSession.user.nickname || userSession.user.id)}님</b><p>즐겨찾기 ${userSummary.favorites} · 좋아요 ${userSummary.likedPosts} · 설문 ${userSummary.pollVotes}</p><button type="button" data-go="/mypage">마이페이지</button></section>`
      : `<section class="side-card login-card side-login"><b>정참시에 로그인하세요</b><p>즐겨찾기, 참여 기록, 배지, 알림을 한곳에서 관리합니다</p><button type="button" data-go="/login">로그인</button></section>`;

  const generationAges = ["10대", "20대", "30대", "40대", "50대", "60대+"];
  const generationResults = generationDisplayResults;
  const generationHomeCards = generationAges.map((age, i) => {
    const votes = generationResults[age] || {};
    const sorted = Object.entries(votes).filter(([,count]) => Number(count || 0) > 0).sort((a,b) => Number(b[1]) - Number(a[1]));
    const total = sorted.reduce((sum,[,count]) => sum + Number(count || 0), 0);
    const top = sorted[0];
    if (!top || !total) {
      return `<article class="generation-card generation-empty ${i === 1 ? "focus" : ""}" role="button" tabindex="0" data-go="/generation-president?age=${encodeURIComponent(age)}"><span class="generation-age">${age}</span><div class="generation-result generation-result-empty"><b>아직 투표가 이뤄지지 않았습니다</b><div class="generation-bar"><i style="width:0%"></i></div><small>첫 투표를 기다리는 중</small></div></article>`;
    }
    const person = typeof getPerson === "function" ? getPerson(top[0]) : null;
    const name = person?.name || "집계 중";
    const share = Math.round(Number(top[1]) * 100 / total);
    return `<article class="generation-card ${i === 1 ? "focus" : ""}" role="button" tabindex="0" data-go="/generation-president?age=${encodeURIComponent(age)}"><span class="generation-age">${age}</span><div class="generation-result"><b>${esc(name)}</b><div class="generation-bar"><i style="width:${share}%"></i></div><small>${Number(top[1]).toLocaleString("ko-KR")}표 · ${share}% · 총 ${total.toLocaleString("ko-KR")}명</small></div></article>`;
  }).join("");

  const representativeBadge = badgeByKey(userSummary.representativeBadge || "");
  const showcaseBadges = (userSummary.showcaseBadges || []).map(key => badgeByKey(key)).filter(Boolean).filter(x => x.key !== representativeBadge?.key).slice(0, 3);
  const showcaseSlots = [...showcaseBadges];
  while (showcaseSlots.length < 3) showcaseSlots.push(null);
  const representativeMarkup = representativeBadge
    ? `<span class="side-representative-jewel">${badgeGemSvg(representativeBadge.key)}</span><div><b>${esc(representativeBadge.name)}</b><p>대표 배지 · ${esc(representativeBadge.tier)}</p></div>`
    : `<span class="side-representative-jewel badge-gem-empty"><span>◇</span></span><div><b>${userSession.authenticated ? "대표 배지를 선택하세요" : "대표 배지"}</b><p>${userSession.authenticated ? "배지함에서 대표 배지를 설정" : "로그인 후 대표 배지 설정"}</p></div>`;
  const badgePreview = `<div class="participation-main participation-badge-main" role="button" tabindex="0" data-go="${userSession.authenticated ? "/mypage/activity?tab=badges" : "/login"}">${representativeMarkup}</div><div class="badge-home-preview badge-home-jewels badge-showcase-secondary">${showcaseSlots.map(badge => badge
    ? `<button type="button" class="is-showcase" data-go="/mypage/activity?tab=badges" title="${esc(badge.name)}">${badgeGemSvg(badge.key)}<b>${esc(badge.name)}</b><small>${esc(badge.tier)}</small></button>`
    : `<span class="badge-showcase-vacant" aria-hidden="true"></span>`
  ).join("")}</div>`;

  let generationAdmin = "";
  if (userSession.authenticated && userSession.user?.role === "admin") {
    const adminTools = await import("./generation-admin.js");
    generationAdmin = adminTools.renderGenerationAdminEditor(data.generation || {}, { context:"home", open:false });
  }
  let nationalAdmin = "";
  if (userSession.authenticated && userSession.user?.role === "admin") {
    const adminTools = await import("./national-evaluation-admin.js");
    nationalAdmin = adminTools.renderNationalEvaluationAdminEditor(nationalEvaluation, { context:"home", open:false });
  }

  return `<div class="site-shell">
    ${siteHeader({ memberCount:data.memberCount, liveBar:data.brand?.liveBar, badgeCelebrations:data.badgeCelebrations || [] })}

    <div class="page-wrap product-home-wrap">${productHero(data.brand || {})}${productLauncher()}<div class="portal-layout product-content-grid">
      <section class="mobile-utility" aria-label="모바일 내 정참시">
        ${loginMobile}
        <section class="mobile-participation participation-card"><div class="side-head"><b>내 참여 · 배지</b><span class="side-action" role="button" tabindex="0" data-go="/mypage/activity">MY</span></div>${badgePreview}</section>
      </section>

      <main class="main-column">
        <section class="module itsme-home-module" id="itsme"><div class="module-header"><div><span class="eyebrow">IT’S ME</span><h2 class="itsme-signature-title">나는 이렇게 제안합니다</h2><p class="module-desc">꼭 필요하고 유용한 정책이 공론화될 수 있도록 정참시가 앞장서겠습니다</p></div><button class="more-btn" type="button" data-go="/itsme">전체보기</button></div><div class="itsme-grid">${itsmeHomeItems.map(itsmeHomeCard).join("")}</div></section>

        <section class="module poll-module" id="poll"><div class="module-header"><div><span class="eyebrow">CITIZENS’ CHOICE</span><h2>귀담아 들어야 합니다</h2></div><button class="more-btn" type="button" data-go="/poll">전체보기</button></div>${pollMarkup(poll, userSession.authenticated && !!poll && hasVotedPoll(poll.id))}</section>

        <section class="module national-eval" id="national-eval"><div class="module-header"><div><span class="eyebrow">NATIONAL EVALUATION</span><h2>정참시민 전국 평가제</h2><p class="module-desc">국회의원 1명과 광역·기초단체장 1명을 정참시민이 각각 평가합니다</p></div><button class="more-btn" type="button" data-go="/national-evaluation">전체보기</button></div>${nationalEvaluationHomeMarkup(nationalEvaluation, getPerson)}${nationalAdmin}</section>

        <section class="module generation-president" id="generation-president"><div class="module-header"><div><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h2>세대의 선택, 대통령</h2><p class="module-desc">같은 대통령 후보를 세대별로 바라보면 선택은 어떻게 달라질까? 정참시 모의투표로 비교합니다</p></div><button class="more-btn" type="button" data-go="/generation-president">전체보기</button></div><div class="generation-feature"><div class="generation-intro"><h3>10대부터 60대+까지<br>각 세대의 선택을 한눈에</h3><button class="ghost-btn generation-participation-cta" type="button" data-go="/generation-president">모의투표 참여</button></div><div class="generation-grid">${generationHomeCards}</div></div>${generationAdmin}</section>



        <section class="module" id="compare"><div class="module-header"><div><span class="eyebrow">COMPARE · SAMPLE</span><h2>정치인 비교분석</h2></div><button class="more-btn" type="button" data-go="/compare">비교하기</button></div><div class="compare-sample-badge">예시 화면 · 실제 정치인 아님</div><div class="compare-layout"><div class="compare-person"><span class="compare-avatar sample-a"></span><b>가상후보 A</b><small>정책·민생형</small></div><div class="compare-metrics"><div><b>활동도</b><i><em style="width:72%"></em></i><strong>72</strong></div><div><b>관심도</b><i><em style="width:61%"></em></i><strong>61</strong></div><div><b>언급량</b><i><em style="width:48%"></em></i><strong>48</strong></div><div><b>참여도</b><i><em style="width:67%"></em></i><strong>67</strong></div></div><div class="compare-person"><span class="compare-avatar sample-b"></span><b>가상후보 B</b><small>개혁·소통형</small></div></div><div class="compare-summary"><b>비교 결과 예시</b><span>정참시의 AI 인텔리전트 데이터 무브먼트로 22개의 항목을 비교분석 합니다</span></div></section>

        <section class="module now-module" id="now"><div class="module-header"><div><span class="eyebrow live-heading-inline">NOW RANK <span class="main-live-pulse" aria-label="LIVE"><i></i></span></span><h2>지금 가장 주목받는 정치인</h2></div><button class="more-btn" type="button" data-go="/now">전체보기</button></div><div class="now-rank-carousel" data-now-rank-carousel data-page-count="${rankPageCount}" data-page="0"><button class="now-rank-nav now-rank-prev" type="button" data-now-rank-nav="prev" data-now-rank-prev aria-label="이전 NOW 순위" ${rankPageCount<=1?"disabled":""}>‹</button><div class="now-rank-pages">${rankPages}</div><button class="now-rank-nav now-rank-next" type="button" data-now-rank-nav="next" data-now-rank-next aria-label="다음 NOW 순위" ${rankPageCount<=1?"disabled":""}>›</button><div class="now-rank-status" data-now-rank-status>${rankPageCount?`1 / ${rankPageCount}`:""}</div></div></section>

        <section class="module" id="column"><div class="module-header"><div><span class="eyebrow">COLUMN</span><h2>오늘 정치에서 읽어야 할 것</h2></div><button class="more-btn" type="button" data-go="/column">전체보기</button></div><div class="column-grid">${columnCards.map(item => columnMini(item, homeAuthorProfiles)).join("")}</div></section>

        <section class="module" id="community"><div class="module-header"><div><span class="eyebrow">COMMUNITY</span><h2>지금 시민들이 말하는 것</h2></div><button class="more-btn" type="button" data-go="/community">전체보기</button></div><div class="community-list">${general.map((item, index) => communityRow(item, index, homeAuthorProfiles)).join("")}</div></section>

        <section class="module academy-module" id="academy"><div class="module-header"><div><span class="eyebrow">${esc(academyConfig.eyebrow)}</span><h2>${esc(academyConfig.title)}</h2></div><div class="inline-actions">${userSession.authenticated && userSession.user?.role === "admin" ? `<button class="ghost-btn academy-admin-edit" type="button" data-go="/admin?tab=academy">메인 아카데미 편집</button>` : ""}<button class="more-btn" type="button" data-go="/academy">일정 보기</button></div></div><div class="academy-layout"><div class="academy-intro"><span class="academy-mark">A</span><h3>${esc(academyConfig.headline)}</h3><button type="button" data-go="/academy">${esc(academyConfig.cta)}</button></div><div class="academy-schedule"><div class="schedule-head"><b>예정 교육 일정</b><span>${academySlots.length}개</span></div>${academyRows(academySlots)}</div></div></section>
      </main>

      <aside class="side-column">${loginSide}<section class="side-card participation-card side-participation"><div class="side-head"><b>내 참여 · 배지</b><span class="side-action" role="button" tabindex="0" data-go="/mypage/activity">MY</span></div>${badgePreview}</section><section class="side-card side-recent"><div class="side-head"><b>최근 본 정치인</b><span class="side-action" role="button" tabindex="0" data-go="/mypage/recent">전체</span></div><div class="recent-visual-grid">${Array.from({ length: 4 }, (_, i) => {
          const id = recentPeople[i];
          if (!id) return `<span class="recent-visual-empty"><span class="recent-circle-empty"></span><b>최근 본 인물</b><small>기록 없음</small></span>`;
          const info = recentPersonSlotLabel(id, getPerson);
          const person = typeof getPerson === "function" ? getPerson(id) : null;
          const recentPhoto = photoAsset(id, "tiny", info.name || `${info.group} ${info.number}`, { sizes:"54px" });
          return `<button type="button" class="recent-visual-card" title="${esc(info.short)}" aria-label="${esc(info.short)}" data-go="/person/${esc(id)}"><span class="recent-circle-avatar ${recentPhoto.photo ? "has-photo" : ""}"${recentPhoto.photo ? ` style="--photo-position:${esc(recentPhoto.photo.focus)}"` : ""}>${recentPhoto.img}</span><b>${esc(info.name || `${info.group} ${info.number}`)}</b><small>${esc(person?.party || info.group)}</small></button>`;
        }).join("")}</div></section><section class="side-card side-keywords live-signal-card"><div class="side-head"><b class="live-heading-inline">실시간 정치키워드 <span class="main-live-pulse" aria-label="LIVE"><i></i></span></b><span class="side-action" role="button" tabindex="0" data-go="/keywords">더보기</span></div><div class="keyword-grid live-keyword-grid">${Array.from({ length: 8 }, (_, i) => { const x=keywords[i]; return x ? `<span class="live-keyword-chip" title="${esc(x.meta || "NOW 뉴스 기반")}"><b>${i+1}</b>${esc(x.label)}</span>` : `<span>${i+1}</span>`; }).join("")}</div><small class="signal-source-note">${nowSignals.source === "published-now" ? "게시된 NOW 뉴스 데이터 기반" : "관리자 등록 키워드"}</small></section><section class="side-card side-news"><div class="side-head"><b>정참시 NEWS</b><span class="side-action" role="button" tabindex="0" data-go="/news">전체</span></div>${news.map(sideNewsRow).join("")}</section><section class="side-card side-rising live-signal-card"><div class="side-head"><b class="live-heading-inline">실시간 급상승 정치인 <span class="main-live-pulse" aria-label="LIVE"><i></i></span></b><span class="side-action" role="button" tabindex="0" data-go="/trending">전체</span></div>${Array.from({ length: 5 }, (_, i) => { const x = trending[i]; return x ? `<div class="side-row live politician-rising-row" role="button" tabindex="0" data-go="${esc(x.href)}"><span>${i + 1}</span><i><b>${esc(x.title)}</b><small><em class="trend-signal ${Number(x.rankDelta)>0?"up":x.trendLabel==="NEW"?"new":""}">${esc(x.trendLabel || "NOW")}</em>${esc(x.meta ? ` ${x.meta.replace(x.trendLabel || "", "").replace(/^\s*·\s*/, "")}` : "")}</small></i></div>` : `<div class="side-row"><span>${i + 1}</span><i></i></div>`; }).join("")}<small class="signal-source-note">직전 게시 순위 + 최근 뉴스 가속도</small></section></aside>
    </div></div>
    ${footer()}
    ${drawer()}
  </div>`;
}
