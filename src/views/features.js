import { getDomain } from "../core/repository.js";
import { pageShell, esc } from "./layout.js";
import {
  listAssemblyMembers,
  listMetropolitanLeaders,
  listBasicLeaders,
  PERSON_COUNTS
} from "../data/person-provider.js";
import {
  getUserSession,
  getUserActivity,
  hasVotedPoll,
  isPostLiked
} from "../core/user.js";

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

export async function renderPresident() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">PRESIDENT · OUT OF RANK</span><h1>대통령부터</h1><p>대통령은 NOW Rank와 분리된 독립 정보 허브입니다. 실제 대통령 데이터 연결방식은 정치인 데이터 구조와 함께 확정합니다.</p></section><section class="content-card empty-state tall"><div class="empty-icon">P</div><h2>대통령 데이터 연결 전</h2><p>메인에서 확정한 대통령 영역과 연결되는 전용 페이지입니다.</p></section></main>`);
}

const NOW_TYPES = Object.freeze({
  assembly: { label: "국회의원", count: PERSON_COUNTS.assembly, get: listAssemblyMembers },
  metropolitan: { label: "광역단체장", count: PERSON_COUNTS.metropolitan, get: listMetropolitanLeaders },
  basic: { label: "기초단체장", count: PERSON_COUNTS.basic, get: listBasicLeaders }
});

function nowCard(person) {
  return `<a class="person-slot-card" href="/person/${esc(person.id)}" data-route aria-label="${esc(person.roleLabel)} ${person.slot}번 상세페이지"><span class="slot-no">#${String(person.slot).padStart(3, "0")}</span><div class="person-photo-placeholder"></div><div class="slot-lines"><span class="slot-line name"></span><span class="slot-line meta"></span><span class="slot-line short"></span></div><span class="slot-state">상세페이지 보기 →</span></a>`;
}

export async function renderNow(search = "") {
  const params = new URLSearchParams(search || "");
  const type = NOW_TYPES[params.get("type")] ? params.get("type") : "assembly";
  const meta = NOW_TYPES[type];
  const all = meta.get();
  const requested = Number(params.get("limit") || 50);
  const limit = type === "metropolitan" ? meta.count : Math.min(meta.count, Math.max(50, Math.ceil(requested / 50) * 50));
  const shown = all.slice(0, limit);
  const remaining = Math.max(0, meta.count - shown.length);
  const nextLimit = Math.min(meta.count, shown.length + 50);

  return pageShell(`<main class="subpage now-directory-page">
    <section class="page-hero"><span class="eyebrow">NOW RANK · ALL POLITICIANS</span><h1>NOW Rank 전체 정치인</h1><p>메인의 TOP 15는 요약 영역입니다. 전체보기에서는 국회의원 300명, 광역단체장 16명, 기초단체장 227명 등 총 543명의 정치인 슬롯을 탐색합니다.</p><div class="capacity-line"><span>실제 인물정보 연결 전 · 상세페이지 구조 완료</span><b>총 543명</b></div></section>
    <nav class="now-category-tabs" aria-label="정치인 분류">${Object.entries(NOW_TYPES).map(([key, x]) => `<button type="button" class="${type === key ? "active" : ""}" data-go="/now?type=${key}&limit=50"><b>${x.label}</b><span>${x.count}명</span></button>`).join("")}</nav>
    <section class="content-card directory-section"><div class="section-title"><h2>${meta.label}</h2><span>${shown.length} / ${meta.count}명 표시</span></div><div class="person-grid">${shown.map(nowCard).join("")}</div>${remaining ? `<div class="load-more-wrap"><button class="primary-btn load-more-btn" type="button" data-go="/now?type=${type}&limit=${nextLimit}">50명 더 불러오기 <span>남은 ${remaining}명</span></button></div>` : `<div class="directory-complete">${meta.label} ${meta.count}명 전체를 불러왔습니다.</div>`}</section>
  </main>`);
}

export async function renderPolls() {
  const data = await getDomain("polls");
  const items = (data.items || []).filter(x => x.published !== false);
  const session = getUserSession();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">CITIZENS’ CHOICE</span><h1>시민들의 선택</h1><p>진행 중인 설문을 직접 선택하고 결과를 확인하는 정참시 설문게시판입니다.</p></section><section class="content-card">${items.length ? `<div class="poll-page-list">${items.map(poll => {
    const voted = session.authenticated && hasVotedPoll(poll.id);
    const total = (poll.options || []).reduce((s, x) => s + Number(x.votes || 0), 0);
    return `<article class="poll-live-card"><span class="status-pill"><b>POLL</b>${poll.sample ? "검수용 예시" : "진행중"}</span><h2>${esc(poll.question)}</h2><p>총 ${total.toLocaleString("ko-KR")}표${voted ? " · 참여완료" : ""}</p><div class="poll-choice-list">${(poll.options || []).map(opt => `<button type="button" ${session.authenticated && !voted ? `data-poll-vote data-poll-id="${esc(poll.id)}" data-option-id="${esc(opt.id)}"` : "disabled"}><span>${esc(opt.label)}</span><i><em style="width:${pct(opt, poll.options)}%"></em></i><b>${pct(opt, poll.options)}%</b></button>`).join("")}</div>${session.authenticated ? (voted ? `<small>이 설문에 이미 참여했습니다.</small>` : `<small>하나의 선택지를 눌러 투표하세요.</small>`) : `<div class="member-login-prompt"><span>투표는 로그인 회원 기준으로 한 번 참여할 수 있습니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`}</article>`;
  }).join("")}</div>` : `<div class="empty-state tall"><h2>등록된 설문이 없습니다.</h2><p>관리자에서 설문을 만들면 이곳과 메인에 동시에 표시됩니다.</p></div>`}</section></main>`);
}

export async function renderKeywords() {
  const data = await getDomain("keywords");
  const items = (data.items || []).filter(x => x.published !== false).slice(0, 15);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">LIVE POLITICAL KEYWORDS</span><h1>실시간 정치키워드</h1><p>메인에서는 상위 8개를 요약하고, 전체페이지에서는 최대 15개까지 보여줍니다.</p></section><section class="content-card"><div class="section-title"><h2>실시간 TOP 15</h2><span>${items.length}개 등록</span></div>${items.length ? `<div class="keyword-rank-list">${items.map((x, i) => `<article><strong>${i + 1}</strong><b>${esc(x.label)}</b><span>${esc(x.delta || "")}</span></article>`).join("")}</div>` : `<div class="empty-state"><h2>등록된 키워드가 없습니다.</h2><p>관리자에서 최대 15개 키워드를 등록하면 메인과 이 페이지에 즉시 표시됩니다.</p></div>`}</section></main>`);
}

async function trendingItems() {
  const manual = await getDomain("trending");
  const manualItems = (manual.items || []).filter(x => x.published !== false).slice(0, 10);
  if (manualItems.length) return manualItems;

  const [columns, community, news] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("news")]);
  return [
    ...(columns.items || []).map(x => ({ ...x, href: `/column/${x.id}` })),
    ...(community.items || []).map(x => ({ ...x, href: `/community/${x.id}` })),
    ...(news.items || []).map(x => ({ ...x, href: `/news/${x.id}` }))
  ].filter(x => x.published !== false).sort((a, b) => (Number(b.likes || 0) * 4 + Number(b.views || 0)) - (Number(a.likes || 0) * 4 + Number(a.views || 0))).slice(0, 10).map((x, i) => ({ id: x.id, rank: i + 1, title: x.title, href: x.href }));
}

export async function renderTrending() {
  const items = await trendingItems();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">TRENDING NOW</span><h1>실시간 급상승</h1><p>메인에서는 TOP 5, 전체페이지에서는 TOP 10까지 보여줍니다.</p></section><section class="content-card"><div class="section-title"><h2>급상승 TOP 10</h2><span>${items.length}개</span></div>${items.length ? `<div class="trending-rank-list">${items.map((x, i) => `<button type="button" data-go="${esc(x.href || "#")}"><strong>${i + 1}</strong><b>${esc(x.title)}</b><span>보기 →</span></button>`).join("")}</div>` : `<div class="empty-state"><h2>급상승 데이터가 없습니다.</h2><p>관리자에서 직접 TOP 10을 입력하거나, 게시물이 쌓이면 참여지표 기반으로 자동 구성됩니다.</p></div>`}</section></main>`);
}

export async function renderAcademy() {
  const data = await getDomain("academy");
  const slots = (data.slots || []).filter(x => x.published !== false);
  const session = getUserSession();
  const activity = getUserActivity();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">JEONGCHAMSI ACADEMY</span><h1>정참시 아카데미</h1><p>정치를 꿈꾸는 사람이 수강 가능한 일정을 확인하고 신청하는 공간입니다.</p></section><section class="content-card"><div class="section-title"><h2>수강 가능 일정</h2><span>${slots.length}개</span></div>${slots.length ? `<div class="academy-slot-list">${slots.map(s => { const applied = activity.academyApplications.includes(String(s.id)); return `<article><div><b>${esc(s.date || "날짜 미정")}</b><span>${esc(s.title || "정참시 아카데미")} · ${esc(s.description || "")}</span></div><button type="button" data-academy-apply="${esc(s.id)}" ${s.closed || applied ? "disabled" : ""}>${s.closed ? "마감" : applied ? "신청완료" : session.authenticated ? "수강신청" : "로그인 후 신청"}</button></article>`; }).join("")}</div>` : `<div class="empty-state"><h2>등록된 일정이 없습니다.</h2><p>관리자에서 일정을 등록하면 이곳에 표시됩니다.</p></div>`}</section></main>`);
}

function publishedItsme(data) {
  return (data.items || []).filter(x => x.published !== false).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function renderItsme(search = "") {
  const data = await getDomain("itsme");
  const session = getUserSession();
  const params = new URLSearchParams(search || "");
  const category = params.get("category") || "";
  const items = publishedItsme(data).filter(x => !category || x.category === category);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">IT’S ME · POLICY PROPOSAL</span><h1>IT’S ME</h1><p>“내가 대통령이라면, 내가 국회의원이라면, 내가 시장이라면, 내가 장관이라면”을 말머리로 정책과 아이디어를 직접 제안하는 참여 게시판입니다.</p></section><section class="content-card"><div class="board-toolbar"><div class="itsme-category-tabs"><button type="button" class="${!category ? "active" : ""}" data-go="/itsme">전체</button>${(data.categories || []).map(c => `<button type="button" class="${category === c ? "active" : ""}" data-go="/itsme?category=${encodeURIComponent(c)}">${esc(c)}</button>`).join("")}</div>${session.authenticated ? `<button class="primary-btn" type="button" data-go="/itsme/write">IT’S ME 글쓰기</button>` : `<button class="primary-btn" type="button" data-go="/login">로그인 후 글쓰기</button>`}</div>${items.length ? `<div class="board-list itsme-board-list">${items.map(item => `<article class="no-thumb"><a href="/itsme/${esc(item.id)}" data-route><span class="type">${esc(item.category || "IT’S ME")}</span><h2>${esc(item.title)}</h2><p>${esc(item.summary || item.body || "")}</p></a><small>${esc(item.author || "정참시 회원")} · ${formatDate(item.createdAt)} · 좋아요 ${Number(item.likes || 0)}</small></article>`).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">ME</div><h2>아직 등록된 제안이 없습니다.</h2><p>로그인 후 첫 정책 제안을 작성할 수 있습니다.</p></div>`}</section></main>`);
}

export async function renderItsmeWrite(search = "") {
  const session = getUserSession();
  if (!session.authenticated) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>로그인이 필요합니다.</h2><p>IT’S ME 글쓰기는 회원 참여 기능입니다.</p><button class="primary-btn" type="button" data-go="/login">로그인</button></section></main>`);
  const data = await getDomain("itsme");
  const id = new URLSearchParams(search || "").get("id") || "";
  const old = id ? (data.items || []).find(x => String(x.id) === id) : null;
  if (old && String(old.ownerId || "") !== String(session.user.id)) return pageShell(`<main class="subpage"><section class="content-card empty-state"><h2>수정 권한이 없습니다.</h2><button class="primary-btn" type="button" data-go="/itsme">목록으로</button></section></main>`);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">WRITE · IT’S ME</span><h1>${old ? "IT’S ME 제안 수정" : "IT’S ME 제안 작성"}</h1><p>말머리를 선택하고 내가 그 역할이라면 추진하고 싶은 정책이나 아이디어를 작성하세요.</p></section><section class="content-card"><form class="member-post-form" data-user-post-form="itsme" data-item-id="${esc(old?.id || "")}"><label>말머리<select name="category" required>${(data.categories || []).map(c => `<option ${old?.category === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label><label>제목<input name="title" maxlength="120" required value="${esc(old?.title || "")}" placeholder="제안의 핵심을 제목으로 작성하세요"></label><label>한 줄 요약<input name="summary" maxlength="240" value="${esc(old?.summary || "")}" placeholder="목록에 표시될 짧은 소개"></label><label>내용<textarea name="body" rows="14" maxlength="50000" required placeholder="정책·아이디어와 이유를 자유롭게 작성하세요.">${esc(old?.body || "")}</textarea></label><div class="auth-error" data-user-post-error></div><div class="admin-form-actions"><button class="primary-btn" type="submit">${old ? "수정 저장" : "등록"}</button><button class="ghost-btn" type="button" data-go="${old ? `/itsme/${esc(old.id)}` : "/itsme"}">취소</button></div></form></section></main>`);
}

export async function renderItsmeDetail(id) {
  const data = await getDomain("itsme");
  const item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  if (!item) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>IT’S ME 게시물을 찾을 수 없습니다.</h2><button class="primary-btn" type="button" data-go="/itsme">목록으로</button></section></main>`);
  const session = getUserSession();
  const liked = session.authenticated && isPostLiked("itsme", id);
  const mine = session.authenticated && String(item.ownerId || "") === String(session.user.id);
  const commentsData = await getDomain("comments");
  const comments = (commentsData.items || []).filter(c => c.published !== false && c.domain === "itsme" && String(c.postId) === String(id)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return pageShell(`<main class="subpage"><article class="content-card article-detail"><span class="eyebrow">IT’S ME · ${esc(item.category || "정책 제안")}</span><h1>${esc(item.title)}</h1><div class="article-meta"><span>${esc(item.author || "정참시 회원")}</span><span>${formatDate(item.createdAt)}</span><span>좋아요 ${Number(item.likes || 0)}</span></div>${item.summary ? `<div class="article-lead">${esc(item.summary)}</div>` : ""}<div class="article-body">${bodyHtml(item.body)}</div><div class="article-actions"><button type="button" class="ghost-btn ${liked ? "active" : ""}" data-post-like="itsme" data-post-id="${esc(id)}">${liked ? "♥ 좋아요 취소" : "♡ 좋아요"}</button>${mine ? `<button type="button" class="ghost-btn" data-go="/itsme/write?id=${encodeURIComponent(id)}">수정</button><button type="button" class="danger-btn" data-user-post-delete="itsme" data-id="${esc(id)}">삭제</button>` : ""}<button type="button" class="primary-btn" data-go="/itsme">IT’S ME 목록으로</button></div></article><section class="content-card comment-section"><div class="section-title"><h2>댓글</h2><span>${comments.length}개</span></div>${session.authenticated ? `<form class="comment-form" data-comment-form="itsme" data-post-id="${esc(id)}"><textarea name="comment" rows="3" maxlength="1000" required placeholder="의견을 남겨보세요."></textarea><div class="admin-form-actions"><button class="primary-btn" type="submit">댓글 등록</button><span data-comment-state></span></div></form>` : `<div class="member-login-prompt"><span>댓글은 로그인 후 작성할 수 있습니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`}${comments.length ? `<div class="comment-list">${comments.map(c => `<article><div><b>${esc(c.author)}</b><span>${formatDate(c.createdAt)}</span></div><p>${esc(c.text)}</p></article>`).join("")}</div>` : `<div class="empty-inline">아직 댓글이 없습니다.</div>`}</section></main>`);
}

export async function renderCompare() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">COMPARE · SAMPLE</span><h1>정치인 비교분석</h1><p>실제 정치인이 아닌 가상후보로 결과 형태를 보여줍니다.</p></section><section class="content-card"><div class="compare-demo"><div><span class="fake-avatar a"></span><h2>가상후보 A</h2><p>정책·민생형</p></div><div class="compare-demo-bars"><label>활동도 <i><em style="width:72%"></em></i>72</label><label>관심도 <i><em style="width:61%"></em></i>61</label><label>언급량 <i><em style="width:48%"></em></i>48</label><label>참여도 <i><em style="width:67%"></em></i>67</label></div><div><span class="fake-avatar b"></span><h2>가상후보 B</h2><p>개혁·소통형</p></div></div><div class="notice-box">실제 비교는 543개 정치인 슬롯에 실데이터가 연결된 뒤 동일 ID를 선택하는 구조로 활성화합니다.</div></section></main>`);
}

export async function renderGeneration() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h1>세대가 뽑은 대통령</h1><p>10대부터 60대+까지 정참시 참여자의 모의투표 결과를 세대별로 비교합니다.</p></section><section class="content-card"><div class="generation-page-grid">${["10대", "20대", "30대", "40대", "50대", "60대+"].map(age => `<article><b>${age}</b><p>대통령 후보 데이터 연결 전</p><button type="button" disabled>후보 선택 영역</button></article>`).join("")}</div><div class="notice-box">후보는 정치인 MASTER가 확정된 뒤 동일 ID를 사용합니다.</div></section></main>`);
}

export async function renderNationalEvaluation() {
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">NATIONAL EVALUATION</span><h1>국회의원 전국 평가제</h1><p>지역구를 넘어 한 명의 입법기관을 전국 참여자가 동일 기준으로 평가하는 기능입니다.</p></section><section class="content-card"><div class="empty-state tall"><div class="empty-icon">評</div><h2>평가 대상 연결 전</h2><p>국회의원 300명 슬롯에 실데이터가 연결된 뒤 관리자에서 동일 인물 ID를 선택하도록 활성화합니다.</p></div></section></main>`);
}

export async function renderSearch(query = "") {
  const q = String(query || "").trim().toLowerCase();
  const [columns, community, news, itsme] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("news"), getDomain("itsme")]);
  const groups = [
    ["COLUMN", "column", columns.items || []],
    ["정뮤니티", "community", community.items || []],
    ["정참시 NEWS", "news", news.items || []],
    ["IT’S ME", "itsme", itsme.items || []]
  ];
  const matches = q ? groups.flatMap(([label, route, items]) => items.filter(x => x.published !== false && `${x.title || ""} ${x.summary || ""} ${x.body || ""}`.toLowerCase().includes(q)).map(x => ({ ...x, label, route }))) : [];
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">SEARCH</span><h1>통합검색</h1><p>검색어: <b>${esc(query || "—")}</b></p></section><section class="content-card">${matches.length ? `<div class="board-list">${matches.map(x => `<article class="no-thumb"><a href="/${x.route}/${esc(x.id)}" data-route><span class="type">${esc(x.label)}</span><h2>${esc(x.title)}</h2><p>${esc(x.summary || x.body || "")}</p></a><small>${esc(x.author || "정참시")}</small></article>`).join("")}</div>` : `<div class="empty-state tall"><h2>${q ? "검색 결과가 없습니다." : "검색어를 입력해 주세요."}</h2><p>게시판 검색은 동작합니다. 정치인·정당 검색은 실제 정치인 데이터 공급방식을 확정한 뒤 543개 슬롯에 연결합니다.</p></div>`}</section></main>`);
}

export { trendingItems };
