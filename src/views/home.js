import { HOME_NOW_PREVIEW } from "../data/home-person-preview.js?v=alpha6.0.20-function-detail";
import { getHomeSnapshot } from "../core/repository.js";
import { drawer, siteHeader, footer } from "./layout.js?v=alpha6.0.36.18-livebar-auth-generation";
import { getUserSummary, hasVotedPoll } from "../core/user.js";
import { launcherServices, serviceIconSvg } from "../data/service-catalog.js?v=alpha6.0.36.18-livebar-auth-generation";
import { badgeByKey, badgeGemSvg } from "../data/badge-catalog.js?v=alpha6.0.36.19-badge-tiers";

const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[c]));

let initialHomeSnapshot = null;
let initialHomeSnapshotReuse = 0;
async function getInitialHomeSnapshot() {
  if (initialHomeSnapshot && initialHomeSnapshotReuse > 0) {
    initialHomeSnapshotReuse -= 1;
    return initialHomeSnapshot;
  }
  const data = await getInitialHomeSnapshot();
  initialHomeSnapshot = data;
  initialHomeSnapshotReuse = 1;
  return data;
}

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
    headline:"바라볼 때가 아닌, 행동할 때 정치가 시작됩니다.",
    subline1:"알고, 비교하고, 선택하고, 평가하는 것.",
    subline2:"한 사람의 작은 행동이 정치의 방향을 만듭니다.",
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

function productHero(nowPeople = [], poll = null) {
  const top = nowPeople.slice(0,3);
  const total = poll ? (poll.options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0) : 0;
  const pollLabel = poll?.question || "오늘의 정치, 당신의 선택은?";
  return `<section class="product-hero" aria-label="정참시 오늘의 정치">
    <div class="product-hero-copy">
      <div class="product-hero-kicker"><span>JEONGCHAMSI</span><em>정치에 참여할 시간</em></div>
      <h1>정치를 보는 것에서<br><strong>움직이는 것</strong>으로.</h1>
      <p>인물·이슈·여론·제안을 한곳에서 보고, 비교하고, 직접 참여하세요.</p>
      <div class="product-hero-actions"><button type="button" class="hero-action-primary" data-go="/now">지금 정치 보기 <span>→</span></button><button type="button" class="hero-action-secondary" data-go="/poll">시민 선택 참여</button></div>
      <div class="product-hero-proof"><span><b>NOW</b> 실시간 주목도</span><span><b>CHOICE</b> 시민 설문</span><span><b>IT’S ME</b> 정책 제안</span></div>
    </div>
    <div class="product-hero-live">
      <div class="hero-live-head"><div><span class="live-dot"></span><b>지금 움직이는 정치</b></div><em>LIVE</em></div>
      <div class="hero-rank-stack">${top.map((p,i)=>`<button type="button" data-go="/person/${esc(p.id)}"><span class="hero-rank-no">0${i+1}</span><span class="hero-rank-person"><b>${esc(p.name)}</b><small>${esc(p.party)} · ${esc(p.region)}</small></span><span class="hero-rank-arrow">↗</span></button>`).join("")}</div>
      <div class="hero-poll-mini" role="button" tabindex="0" data-go="/poll"><span>오늘의 시민선택</span><b>${esc(pollLabel)}</b><small>${total ? `${total.toLocaleString("ko-KR")}명 참여 중` : "첫 선택을 기다리고 있어요"}</small><i>투표하기 →</i></div>
    </div>
  </section>`;
}

function productLauncher() {
  const items = launcherServices();
  return `<section class="product-launcher product-launcher-compact"><div class="product-launcher-head"><div><span>EXPLORE JEONGCHAMSI</span><h2>정참시는 여러분의 참여로 만들어갑니다.</h2></div><button type="button" data-drawer-open>전체 서비스 <span>＋</span></button></div><div class="product-launcher-grid">${items.map(item=>`<button type="button" class="launcher-card launcher-${item.key === "poll" ? "choice" : item.key}" data-go="${item.href}" aria-label="${esc(item.label)} · ${esc(item.description)}"><span class="launcher-icon">${serviceIconSvg(item.key)}</span><span class="launcher-copy"><b>${esc(item.shortLabel || item.label)}</b></span><span class="launcher-cue">→</span></button>`).join("")}</div></section>`;
}

function columnLead(item) {
  if (!item) return `<div class="column-lead">
    <div class="column-lead-image"></div>
    <div class="column-lead-copy">
      <span class="skeleton kicker"></span><span class="skeleton title"></span><span class="skeleton title short"></span>
      <span class="skeleton body"></span><span class="skeleton body"></span><span class="skeleton body short"></span>
    </div>
  </div>`;

  const cover = safeImage(item.coverImage);
  return `<div class="column-lead" role="button" tabindex="0" data-go="/column/${esc(item.id)}">
    <div class="column-lead-image ${cover ? "has-cover" : ""}" ${cover ? `style="background-image:url('${cover}')"` : ""}></div>
    <div class="column-lead-copy live">
      <span class="live-kicker">COLUMN · ${esc(item.author || "정참시")}</span>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.summary || item.body || "")}</p>
    </div>
  </div>`;
}

function columnMini(item) {
  if (!item) return `<article class="column-card"><div class="column-thumb"></div><div class="column-card-copy"><span class="skeleton small-title"></span><span class="skeleton mini"></span></div></article>`;
  const cover = safeImage(item.coverImage);
  return `<article class="column-card" role="button" tabindex="0" data-go="/column/${esc(item.id)}">
    <div class="column-thumb ${cover ? "has-cover" : ""}" ${cover ? `style="background-image:url('${cover}')"` : ""}></div>
    <div class="column-card-copy live"><b>${esc(item.title)}</b><span>${esc(item.author || "정참시")} · ${dateLabel(item.createdAt)}</span></div>
  </article>`;
}

function communityHot(item) {
  if (!item) return `<article><span>HOT</span><b>주목받는 정뮤니티 게시물 영역</b><p>본문 한 줄 미리보기</p></article>`;
  return `<article class="live" role="button" tabindex="0" data-go="/community/${esc(item.id)}"><span>HOT</span><b>${esc(item.title)}</b><p>${esc(item.summary || item.body || "")}</p></article>`;
}

function communityRow(item, index) {
  if (!item) return `<div class="community-row"><span class="community-order">${String(index + 1).padStart(2, "0")}</span><span class="community-copy"><b>정뮤니티 게시물 제목 영역</b><em>말머리 · 작성자 · 시간</em></span><span class="community-stats">댓글 · 조회</span></div>`;
  return `<div class="community-row live" role="button" tabindex="0" data-go="/community/${esc(item.id)}"><span class="community-order">${String(index + 1).padStart(2, "0")}</span><span class="community-copy"><b>${esc(item.title)}</b><em>${esc(item.author || "정참시")} · ${dateLabel(item.createdAt)}</em></span><span class="community-stats">좋아요 ${Number(item.likes || 0)} · 조회 ${Number(item.views || 0)}</span></div>`;
}

function sideNewsRow(item, i) {
  if (!item) return `<div class="side-row"><span>${i + 1}</span><i></i></div>`;
  return `<div class="side-row live" role="button" tabindex="0" data-go="/news/${esc(item.id)}"><span>${i + 1}</span><i>${esc(item.title)}</i></div>`;
}

function itsmeHomeCard(item, index) {
  if (!item) return `<article class="itsme-card itsme-empty"><span>${String(index + 1).padStart(2, "0")}</span><b>아직 등록된 정책이 없습니다</b></article>`;
  return `<article class="itsme-card" role="button" tabindex="0" data-go="/itsme/${esc(item.id)}"><span>${String(index + 1).padStart(2, "0")}</span><b>${esc(item.title || "정책 제안")}</b></article>`;
}

function nationalEvaluationDisplayVotes(data = {}, personId = "") {
  const id = String(personId || data.subjectId || "");
  if (!id) return { positive:0, neutral:0, negative:0 };
  const source = data.demoMode === true ? data.demoResults : data.results;
  return { positive:0, neutral:0, negative:0, ...((source || {})[id] || {}) };
}

function nationalEvaluationHomeMarkup(data = {}, getPerson = null) {
  const subjectId = String(data.subjectId || "");
  const match = subjectId.match(/^assembly-(\d{3})$/);
  if (!match) {
    return `<div class="national-eval-layout"><div class="eval-person"><span class="eval-avatar"></span><div><small>이번 평가 대상</small><b>아직 선택된 국회의원이 없습니다</b></div></div><div class="eval-question"><strong>“전국 유권자가 이 의원을 평가한다면?”</strong><p>관리자에서 평가 대상을 선택하면 메인에 바로 표시됩니다.</p></div><div class="eval-score"><small>전국 평가</small><strong>—</strong><span>대상 선택 전</span></div></div>`;
  }
  const slot = Number(match[1]);
  const votes = nationalEvaluationDisplayVotes(data, subjectId);
  const total = Number(votes.positive || 0) + Number(votes.neutral || 0) + Number(votes.negative || 0);
  const positiveShare = total ? Math.round(Number(votes.positive || 0) * 100 / total) : 0;
  return `<div class="national-eval-layout"><div class="eval-person" role="button" tabindex="0" data-go="/person/${esc(subjectId)}"><span class="eval-avatar"></span><div><small>이번 평가 대상</small><b>${esc((typeof getPerson === "function" ? getPerson(subjectId)?.name : "")||`국회의원 ${String(slot).padStart(3, "0")}`)}</b></div></div><div class="eval-question"><strong>“전국 유권자가 이 의원을 평가한다면?”</strong><p>${data.enabled ? "현재 전국 평가가 진행 중입니다." : "평가 대상은 선택되었으며 참여는 현재 일시중지 상태입니다."}</p></div><div class="eval-score"><small>긍정 평가</small><strong>${total ? `${positiveShare}%` : "—"}</strong><span>${total ? `${total.toLocaleString("ko-KR")}명 참여` : "아직 참여 전"}</span></div></div>`;
}

function pollMarkup(poll) {
  if (!poll) return `<div class="poll-main"><div class="poll-question"><span class="poll-status">준비중</span><h3>시민들의 선택 설문 영역</h3><p>관리자가 설문을 등록하면 최대 3개 선택지를 미리 보여줍니다.</p></div><div class="poll-vote-panel"><div class="poll-options">${Array.from({length:3},()=>`<button type="button" disabled><span>선택지</span><i><em style="width:0%"></em></i><b>—</b></button>`).join("")}</div></div></div>`;
  const total = (poll.options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
  const optionMarkup = (poll.options || []).slice(0,3).map(opt => {
    const pct = total ? Math.round(Number(opt.votes || 0) * 100 / total) : 0;
    return `<button type="button" data-go="/poll?pollId=${encodeURIComponent(poll.id)}&option=${encodeURIComponent(opt.id)}" aria-label="${esc(opt.label)} 선택 후 전체 설문 보기"><span>${esc(opt.label)}</span><i><em style="width:${pct}%"></em></i><b>${pct}%</b></button>`;
  }).join("");
  return `<div class="poll-main"><div class="poll-question"><h3>${esc(poll.question)}</h3><p>메인에서는 최대 3개만 표시 · 전체 선택지는 설문페이지에서 투표 · ${total.toLocaleString("ko-KR")}명 참여</p></div><div class="poll-vote-panel"><div class="poll-options">${optionMarkup}</div><div class="poll-confirm-row"><span>항목을 누르면 전체 설문으로 이동합니다.</span><button class="ghost-btn" type="button" data-go="/poll?pollId=${encodeURIComponent(poll.id)}">전체 선택지 보기</button></div></div></div>`;
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
    const provider = await import("../data/person-provider.js?v=alpha6.0.20-function-detail");
    getPerson = provider.getPersonSlotById;
  }
  const columns = published(data.columns?.items || []);
  const lead = columns.find(x => x.featured) || columns[0] || null;
  const minis = columns.filter(x => x !== lead).slice(0, 4);
  while (minis.length < 4) minis.push(null);

  const community = published(data.community?.items || []);
  const hot = [...community].sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0)).slice(0, 2);
  while (hot.length < 2) hot.push(null);
  const general = community.filter(x => !hot.includes(x)).slice(0, 5);
  while (general.length < 5) general.push(null);

  const news = published(data.news?.items || []).slice(0, 5);
  while (news.length < 5) news.push(null);

  const poll = published(data.polls?.items || [])[0] || null;
  const itsmeHomeItems = published(data.itsme?.items || [])
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 6);
  while (itsmeHomeItems.length < 6) itsmeHomeItems.push(null);
  const nationalEvaluation = data.nationalEvaluation || {};
  const academyConfig = {
    eyebrow:"JEONGCHAMSI ACADEMY",
    title:"정참시 아카데미",
    headline:"정치의 꿈을 실제 준비로.",
    description:"정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳.",
    cta:"수강 가능 일정 확인",
    ...(data.academy?.config || {})
  };
  const academySlots = (data.academy?.slots || []).filter(x => x.published !== false).sort((a,b)=>`${a.date||""} ${a.startTime||""}`.localeCompare(`${b.date||""} ${b.startTime||""}`)).slice(0, 4);

  const keywords = (data.keywords?.items || []).filter(x => x.published !== false).slice(0, 8);
  const recentPeople = userSummary.recentPeople || [];

  const nowPeople = HOME_NOW_PREVIEW;
  const trending = nowPeople.slice(0,5).map((p,i) => ({
    title:p.name,
    meta:[p.party,p.jurisdiction].filter(Boolean).join(" · "),
    href:`/person/${p.id}`,
    rank:i+1
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
  const rankTop10 = nowPeople.slice(0,10).map((p,i)=>`<article class="rank-top-card ${partyToneClass(p.party)}" role="button" tabindex="0" data-go="/person/${esc(p.id)}"><span class="rank-party-flag" title="${esc(p.party || "무소속")}" aria-label="${esc(p.party || "무소속")}">${partyToneMark(p.party)}</span><div class="rank-top-no">${i+1}</div><div class="rank-top-avatar"></div><div class="rank-top-copy"><b>${esc(p.name)}</b><span>${esc(p.party)} · ${esc(p.jurisdiction)}</span></div></article>`).join("");
  const sideRows = count => Array.from({ length: count }, (_, i) => `<div class="side-row"><span>${i + 1}</span><i></i></div>`).join("");

  const loginMobile = !userReady
    ? `<div class="mobile-login"><div><b>회원정보 확인 중</b><span>메인 콘텐츠를 먼저 표시하고 있습니다.</span></div><button type="button" disabled aria-label="회원정보 확인 중">···</button></div>`
    : userSession.authenticated
      ? `<div class="mobile-login"><div><b>${esc(userSession.user.nickname || userSession.user.id)}님</b><span>즐겨찾기 ${userSummary.favorites} · 좋아요 ${userSummary.likedPosts} · 설문 ${userSummary.pollVotes}</span></div><button type="button" data-go="/mypage">MY</button></div>`
      : `<div class="mobile-login"><div><b>정참시에 로그인하세요</b><span>즐겨찾기 · 참여 · 배지 · 알림</span></div><button type="button" data-go="/login">로그인</button></div>`;

  const loginSide = !userReady
    ? `<section class="side-card login-card side-login session-pending"><b>회원정보 확인 중</b><p>정치 콘텐츠는 기다리지 않고 먼저 표시합니다.</p><button type="button" disabled aria-label="회원정보 확인 중">확인 중</button></section>`
    : userSession.authenticated
      ? `<section class="side-card login-card side-login"><b>${esc(userSession.user.nickname || userSession.user.id)}님</b><p>즐겨찾기 ${userSummary.favorites} · 좋아요 ${userSummary.likedPosts} · 설문 ${userSummary.pollVotes}</p><button type="button" data-go="/mypage">마이페이지</button></section>`
      : `<section class="side-card login-card side-login"><b>정참시에 로그인하세요</b><p>즐겨찾기, 참여 기록, 배지, 알림을 한곳에서 관리합니다.</p><button type="button" data-go="/login">로그인</button></section>`;

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

  const earnedHomeBadgeKeys = [];
  if (userSession.authenticated && userSummary.pollVotes > 0) earnedHomeBadgeKeys.push("first-participation", "citizen-choice");
  for (const key of userSummary.grantedBadges || []) if (!earnedHomeBadgeKeys.includes(key)) earnedHomeBadgeKeys.push(key);
  const homeBadges = earnedHomeBadgeKeys.map(key => badgeByKey(key)).filter(Boolean).slice(0,3);
  const representativeBadge = badgeByKey(userSummary.representativeBadge || "");
  const representativeMarkup = representativeBadge
    ? `<span class="side-representative-jewel">${badgeGemSvg(representativeBadge.key)}</span><div><b>${esc(representativeBadge.name)}</b><p>대표 배지 · ${esc(representativeBadge.tier)}</p></div>`
    : `<span class="side-representative-jewel badge-gem-empty"><span>◇</span></span><div><b>${userSession.authenticated ? "대표 배지를 선택하세요" : "대표 배지"}</b><p>${userSession.authenticated ? "배지함에서 원하는 배지를 대표로 설정" : "로그인 후 대표 배지 설정"}</p></div>`;
  const badgePreview = homeBadges.length
    ? `<div class="badge-home-preview badge-home-jewels">${homeBadges.map(x => `<button type="button" data-go="/mypage/activity?tab=badges">${badgeGemSvg(x.key)}<b>${esc(x.name)}</b><small>${esc(x.tier)}</small></button>`).join("")}<button type="button" class="badge-more-card" data-go="/mypage/activity?tab=badges"><span>+</span><b>배지함</b><small>전체보기</small></button></div>`
    : `<button type="button" class="badge-empty-cta" data-go="${userSession.authenticated ? "/mypage/activity?tab=badges" : "/login"}"><span class="badge-empty-icon">◇</span><span><b>${userSession.authenticated ? "첫 배지를 획득해보세요" : "로그인하고 배지를 모아보세요"}</b><small>설문·글쓰기·참여 활동으로 시작</small></span><em>›</em></button>`;

  let generationAdmin = "";
  if (userSession.authenticated && userSession.user?.role === "admin") {
    const adminTools = await import("./generation-admin.js?v=alpha6.0.36.18-livebar-auth-generation");
    generationAdmin = adminTools.renderGenerationAdminEditor(data.generation || {}, { context:"home", open:false });
  }
  let nationalAdmin = "";
  if (userSession.authenticated && userSession.user?.role === "admin") {
    const adminTools = await import("./national-evaluation-admin.js?v=alpha6.0.36.18-livebar-auth-generation");
    nationalAdmin = adminTools.renderNationalEvaluationAdminEditor(nationalEvaluation, { context:"home", open:false });
  }

  return `<div class="site-shell">
    ${siteHeader({ memberCount:data.memberCount, liveBar:data.brand?.liveBar })}

    <div class="page-wrap product-home-wrap">${productHero(nowPeople, poll)}${productLauncher()}<div class="portal-layout product-content-grid">
      <section class="mobile-utility" aria-label="모바일 빠른 정보">
        ${loginMobile}
        <div class="mobile-keywords"><div class="mobile-utility-head"><b>실시간 정치키워드</b><span role="button" data-go="/keywords">더보기</span></div><div class="mobile-keyword-track">${Array.from({ length: 8 }, (_, i) => `<span>${esc(keywords[i]?.label || String(i + 1))}</span>`).join("")}</div></div>
        <div class="mobile-mini-tools"><button type="button" data-go="/mypage/activity"><span class="mobile-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></span><span class="mobile-tool-copy"><b>내 참여 · 배지</b><span>활동 보기</span></span></button><button type="button" data-go="/mypage/recent"><span class="mobile-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></span><span class="mobile-tool-copy"><b>최근 본 정치인</b><span>다시 보기</span></span></button></div>
      </section>

      <main class="main-column">
        <section class="module itsme-home-module" id="itsme"><div class="module-header"><div><span class="eyebrow">IT’S ME</span><h2 class="itsme-signature-title">저는, 이렇게 제안합니다</h2><p class="module-desc">꼭 필요하고 유용한 정책이 공론화될 수 있도록 정참시가 앞장서겠습니다.</p></div><button class="more-btn" type="button" data-go="/itsme">전체보기</button></div><div class="itsme-grid">${itsmeHomeItems.map(itsmeHomeCard).join("")}</div></section>

        <section class="module poll-module" id="poll"><div class="module-header"><div><span class="eyebrow">CITIZENS’ CHOICE</span><h2>귀담아 들어야 합니다.</h2><p class="module-desc">작은 관심이 세상을 바꿉니다.</p></div><button class="more-btn" type="button" data-go="/poll">전체보기</button></div>${pollMarkup(poll, userSession.authenticated && !!poll && hasVotedPoll(poll.id))}</section>

        <section class="module national-eval" id="national-eval"><div class="module-header"><div><span class="eyebrow">NATIONAL EVALUATION</span><h2>국회의원 전국 평가제</h2><p class="module-desc">지역구를 넘어, 한 명의 입법기관을 전국 유권자가 평가한다면?</p></div><button class="more-btn" type="button" data-go="/national-evaluation">전체보기</button></div>${nationalEvaluationHomeMarkup(nationalEvaluation, getPerson)}${nationalAdmin}</section>

        <section class="module generation-president" id="generation-president"><div class="module-header"><div><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h2>세대가 뽑은 대통령</h2><p class="module-desc">같은 대통령 후보를 세대별로 바라보면 선택은 어떻게 달라질까? 정참시 모의투표로 비교합니다.</p></div><button class="more-btn" type="button" data-go="/generation-president">전체보기</button></div><div class="generation-feature"><div class="generation-intro"><h3>10대부터 60대+까지<br>각 세대의 선택을 한눈에.</h3><p>실제 선거 결과가 아닌 정참시 참여자 기반 모의투표 영역입니다.</p><button class="ghost-btn generation-participation-cta" type="button" data-go="/generation-president">모의투표 참여</button></div><div class="generation-grid">${generationHomeCards}</div></div>${generationAdmin}</section>



        <section class="module" id="compare"><div class="module-header"><div><span class="eyebrow">COMPARE · SAMPLE</span><h2>정치인 비교분석</h2><p class="module-desc">실제 정치인을 상시 노출하지 않고, 가상후보 예시로 결과 형태를 먼저 보여줍니다.</p></div><button class="more-btn" type="button" data-go="/compare">비교하기</button></div><div class="compare-sample-badge">예시 화면 · 실제 정치인 아님</div><div class="compare-layout"><div class="compare-person"><span class="compare-avatar sample-a"></span><b>가상후보 A</b><small>정책·민생형</small></div><div class="compare-metrics"><div><b>활동도</b><i><em style="width:72%"></em></i><strong>72</strong></div><div><b>관심도</b><i><em style="width:61%"></em></i><strong>61</strong></div><div><b>언급량</b><i><em style="width:48%"></em></i><strong>48</strong></div><div><b>참여도</b><i><em style="width:67%"></em></i><strong>67</strong></div></div><div class="compare-person"><span class="compare-avatar sample-b"></span><b>가상후보 B</b><small>개혁·소통형</small></div></div><div class="compare-summary"><b>비교 결과 예시</b><span>활동도는 A가 강하고, 관심도·참여도는 세부 지표에서 서로 다른 흐름을 보이는 식으로 분석됩니다.</span></div></section>

        <section class="module academy-module" id="academy"><div class="module-header"><div><span class="eyebrow">${esc(academyConfig.eyebrow)}</span><h2>${esc(academyConfig.title)}</h2><p class="module-desc">${esc(academyConfig.description)}</p></div><div class="inline-actions">${userSession.authenticated && userSession.user?.role === "admin" ? `<button class="ghost-btn academy-admin-edit" type="button" data-go="/admin?tab=academy">메인 아카데미 편집</button>` : ""}<button class="more-btn" type="button" data-go="/academy">일정 보기</button></div></div><div class="academy-layout"><div class="academy-intro"><span class="academy-mark">A</span><h3>${esc(academyConfig.headline)}</h3><p>${esc(academyConfig.description)}</p><button type="button" data-go="/academy">${esc(academyConfig.cta)}</button></div><div class="academy-schedule"><div class="schedule-head"><b>예정 교육 일정</b><span>${academySlots.length}개</span></div>${academyRows(academySlots)}</div></div></section>

        <section class="module now-module" id="now"><div class="module-header"><div><span class="eyebrow">NOW RANK</span><h2>지금 가장 주목받는 정치인</h2><p class="module-desc">상위 10명을 두 줄로 간결하게 확인하세요.</p></div><button class="more-btn" type="button" data-go="/now">전체보기</button></div><div class="rank-top-grid rank-top-grid-10">${rankTop10}</div></section>

        <section class="module" id="column"><div class="module-header"><div><span class="eyebrow">COLUMN</span><h2>오늘 정치에서 읽어야 할 것</h2><p class="module-desc">대표 COLUMN 1개 + 추가 COLUMN 4개 구조.</p></div><button class="more-btn" type="button" data-go="/column">전체보기</button></div>${columnLead(lead)}<div class="column-grid">${minis.map(columnMini).join("")}</div></section>

        <section class="module" id="community"><div class="module-header"><div><span class="eyebrow">COMMUNITY</span><h2>지금 시민들이 말하는 것</h2><p class="module-desc">이미지 없이 읽기 좋은 리스트형 정뮤니티.</p></div><button class="more-btn" type="button" data-go="/community">전체보기</button></div><div class="community-highlight">${hot.map(communityHot).join("")}</div><div class="community-list">${general.map(communityRow).join("")}</div></section>
      </main>

      <aside class="side-column">${loginSide}<section class="side-card participation-card side-participation"><div class="side-head"><b>내 참여 · 배지</b><span class="side-action" role="button" tabindex="0" data-go="/mypage/activity">MY</span></div><div class="participation-main participation-badge-main" role="button" tabindex="0" data-go="/mypage/activity?tab=badges">${representativeMarkup}</div>${badgePreview}</section><section class="side-card side-recent"><div class="side-head"><b>최근 본 정치인</b><span class="side-action" role="button" tabindex="0" data-go="/mypage/recent">전체</span></div><div class="recent-visual-grid">${Array.from({ length: 4 }, (_, i) => {
          const id = recentPeople[i];
          if (!id) return `<span class="recent-visual-empty"><span class="recent-circle-empty"></span><b>최근 본 인물</b><small>기록 없음</small></span>`;
          const info = recentPersonSlotLabel(id, getPerson);
          const person = typeof getPerson === "function" ? getPerson(id) : null;
          return `<button type="button" class="recent-visual-card" title="${esc(info.short)}" aria-label="${esc(info.short)}" data-go="/person/${esc(id)}"><span class="recent-circle-avatar"></span><b>${esc(info.name || `${info.group} ${info.number}`)}</b><small>${esc(person?.party || info.group)}</small></button>`;
        }).join("")}</div></section><section class="side-card side-keywords"><div class="side-head"><b>실시간 정치키워드</b><span class="side-action" role="button" tabindex="0" data-go="/keywords">더보기</span></div><div class="keyword-grid">${Array.from({ length: 8 }, (_, i) => `<span>${esc(keywords[i]?.label || String(i + 1))}</span>`).join("")}</div></section><section class="side-card side-news"><div class="side-head"><b>정참시 NEWS</b><span class="side-action" role="button" tabindex="0" data-go="/news">전체</span></div>${news.map(sideNewsRow).join("")}</section><section class="side-card side-rising"><div class="side-head"><b>실시간 급상승 정치인</b><span class="side-action" role="button" tabindex="0" data-go="/trending">전체</span></div>${Array.from({ length: 5 }, (_, i) => { const x = trending[i]; return x ? `<div class="side-row live politician-rising-row" role="button" tabindex="0" data-go="${esc(x.href)}"><span>${i + 1}</span><i><b>${esc(x.title)}</b><small>${esc(x.meta || "")}</small></i></div>` : `<div class="side-row"><span>${i + 1}</span><i></i></div>`; }).join("")}</section></aside>
    </div></div>
    ${footer()}
    ${drawer()}
  </div>`;
}
