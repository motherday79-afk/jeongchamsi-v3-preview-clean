import { getDomain } from "../core/repository.js";
import { pageShell, esc } from "./layout.js";
import {
  listAssemblyMembers,
  listMetropolitanLeaders,
  listBasicLeaders,
  listAllPoliticians,
  getPersonSlotById,
  PERSON_COUNTS
} from "../data/person-provider.js";
import {
  getUserSession,
  getUserActivity,
  hasVotedPoll,
  hasGenerationVote,
  generationVoteFor,
  hasNationalEvaluationVote,
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
function slotLabel(person) {
  if (person?.connected && person?.name) return `${person.name}${person.party ? ` · ${person.party}` : ""}${person.jurisdiction ? ` · ${person.jurisdiction}` : ""}`;
  return `${person.roleLabel} ${String(person.slot).padStart(3, "0")}`;
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
  const data = await getDomain("president");
  const p = data.profile || {};
  return pageShell(`<main class="subpage">
    <section class="page-hero"><span class="eyebrow">PRESIDENT · OUT OF RANK</span><h1>대통령</h1><p>NOW Rank와 분리된 대통령 전용 정치정보 허브입니다. 실제 데이터 입력 전에도 어떤 정보를 저장하고 보여줄지 전체 구조를 고정합니다.</p></section>
    <section class="person-detail-hero content-card"><div class="person-detail-photo ${p.photo ? "has-photo" : ""}" ${p.photo ? `style="background-image:url('${esc(p.photo)}')"` : ""}></div><div class="person-detail-title"><span class="eyebrow">PRESIDENT PROFILE</span>${p.name ? `<h1>${esc(p.name)}</h1><p>${esc(p.party || "")} · ${esc(p.term || "")}</p>` : `<span class="slot-line name"></span><span class="slot-line meta"></span><span class="slot-line short"></span>`}<div class="person-detail-badges"><span>대통령</span><span>독립 정보 허브</span><span>${p.name ? "정보 입력됨" : "정보 입력 전"}</span></div></div><div class="detail-action-bar"><button class="ghost-btn" type="button" data-go="/news">관련 NEWS</button></div></section>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>기본정보</h2><span>대통령 프로필</span></div><dl class="info-list">${p.name ? `<div><dt>이름</dt><dd>${esc(p.name)}</dd></div>` : emptyLine("이름")}${p.party ? `<div><dt>정당</dt><dd>${esc(p.party)}</dd></div>` : emptyLine("정당")}${p.birth ? `<div><dt>출생</dt><dd>${esc(p.birth)}</dd></div>` : emptyLine("출생")}${p.education ? `<div><dt>학력</dt><dd>${esc(p.education)}</dd></div>` : emptyLine("학력")}</dl></section><section class="content-card"><div class="section-title"><h2>취임 · 임기</h2><span>대통령 재임정보</span></div><dl class="info-list">${p.inauguratedAt ? `<div><dt>취임일</dt><dd>${esc(p.inauguratedAt)}</dd></div>` : emptyLine("취임일")}${p.term ? `<div><dt>임기</dt><dd>${esc(p.term)}</dd></div>` : emptyLine("임기")}${emptyLine("선거 이력")}${emptyLine("공식 채널")}</dl></section></div>
    <section class="content-card"><div class="section-title"><h2>주요 경력</h2><span>정치 · 사회 경력</span></div>${textItems(data.career, 6)}</section>
    <section class="content-card"><div class="section-title"><h2>선거 이력</h2><span>대통령 선거</span></div>${textItems(data.elections, 4)}</section>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>국정 비전</h2><span>국정 방향</span></div>${data.vision ? `<div class="article-body"><p>${esc(data.vision)}</p></div>` : `<div class="empty-inline">국정 비전 입력 전</div>`}</section><section class="content-card"><div class="section-title"><h2>주요 정책</h2><span>정책 아카이브</span></div>${textItems(data.policies, 4)}</section></div>
    <div class="detail-grid"><section class="content-card"><div class="section-title"><h2>핵심 공약</h2><span>공약 아카이브</span></div>${textItems(data.pledges, 4)}</section><section class="content-card"><div class="section-title"><h2>국정과제</h2><span>핵심 과제</span></div>${textItems(data.nationalTasks, 4)}</section></div>
    <section class="content-card"><div class="section-title"><h2>정참시 데이터</h2><span>추후 연결</span></div><div class="metric-shell"><article><small>관심도</small><strong>—</strong><span>연결 전</span></article><article><small>언급량</small><strong>—</strong><span>연결 전</span></article><article><small>관련 설문</small><strong>—</strong><span>연결 전</span></article><article><small>세대별 평가</small><strong>—</strong><span>연결 전</span></article></div></section>
    <section class="content-card"><div class="section-title"><h2>관련 콘텐츠</h2><span>정참시 내부 연결</span></div><div class="related-grid"><article><b>정참시 NEWS</b><span>대통령 관련 뉴스</span></article><article><b>COLUMN</b><span>관련 칼럼</span></article><article><b>정뮤니티</b><span>관련 시민 의견</span></article><article><b>시민들의 선택</b><span>관련 설문</span></article></div></section>
  </main>`);
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
  return pageShell(`<main class="subpage now-directory-page"><section class="page-hero"><span class="eyebrow">NOW RANK · ALL POLITICIANS</span><h1>NOW Rank 전체 정치인</h1><p>메인의 TOP 15는 요약입니다. 전체페이지에서는 국회의원 300명, 광역단체장 16명, 기초단체장 227명 등 총 543명을 탐색합니다.</p><div class="capacity-line"><span>실제 인물정보 연결 전 · 상세페이지 구조 완료</span><b>총 543명</b></div></section><nav class="now-category-tabs" aria-label="정치인 분류">${Object.entries(NOW_TYPES).map(([key, x]) => `<button type="button" class="${type === key ? "active" : ""}" data-go="/now?type=${key}&limit=50"><b>${x.label}</b><span>${x.count}명</span></button>`).join("")}</nav><section class="content-card directory-section"><div class="section-title"><h2>${meta.label}</h2><span>${shown.length} / ${meta.count}명 표시</span></div><div class="person-grid">${shown.map(nowCard).join("")}</div>${remaining ? `<div class="load-more-wrap"><button class="primary-btn load-more-btn" type="button" data-go="/now?type=${type}&limit=${nextLimit}">50명 더 불러오기 <span>남은 ${remaining}명</span></button></div>` : `<div class="directory-complete">${meta.label} ${meta.count}명 전체를 불러왔습니다.</div>`}</section></main>`);
}

export async function renderPolls() {
  const data = await getDomain("polls");
  const items = (data.items || []).filter(x => x.published !== false);
  const session = getUserSession();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">CITIZENS’ CHOICE</span><h1>시민들의 선택</h1><p>선택지를 고른 뒤 확인 버튼을 눌러야 투표가 완료됩니다.</p></section><section class="content-card">${items.length ? `<div class="poll-page-list">${items.map(poll => {
    const voted = session.authenticated && hasVotedPoll(poll.id);
    const total = (poll.options || []).reduce((sum, x) => sum + Number(x.votes || 0), 0);
    const choices = (poll.options || []).map(opt => `<button type="button" ${voted ? "disabled" : `data-poll-select data-option-id="${esc(opt.id)}"`} aria-pressed="false"><span>${esc(opt.label)}</span><i><em style="width:${pct(opt, poll.options)}%"></em></i><b>${pct(opt, poll.options)}%</b></button>`).join("");
    return `<article class="poll-live-card" data-poll-scope data-poll-id="${esc(poll.id)}"><span class="status-pill"><b>POLL</b>${voted ? "참여완료" : "진행중"}</span><h2>${esc(poll.question)}</h2><p>${esc(poll.description || "정참시 참여자 기반 설문")} · ${total.toLocaleString("ko-KR")}명 참여</p><div class="poll-choice-list">${choices}</div>${voted ? `<small>이 설문에 이미 참여했습니다.</small>` : `<div class="poll-confirm-row"><span data-poll-select-state>선택지를 선택해 주세요.</span><button class="primary-btn" type="button" data-poll-confirm disabled>투표 확인</button></div>`}</article>`;
  }).join("")}</div>` : `<div class="empty-state tall"><h2>등록된 설문이 없습니다.</h2><p>관리자에서 설문을 만들면 이곳과 메인에 동시에 표시됩니다.</p></div>`}</section></main>`);
}

export async function renderKeywords() {
  const data = await getDomain("keywords");
  const items = (data.items || []).filter(x => x.published !== false).slice(0, 15);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">LIVE POLITICAL KEYWORDS</span><h1>실시간 정치키워드</h1><p>메인에서는 상위 8개, 전체페이지에서는 최대 15개까지 보여줍니다.</p></section><section class="content-card"><div class="section-title"><h2>실시간 TOP 15</h2><span>${items.length}개 등록</span></div>${items.length ? `<div class="keyword-rank-list">${items.map((x, i) => `<article><strong>${i + 1}</strong><b>${esc(x.label)}</b><span>${esc(x.delta || "")}</span></article>`).join("")}</div>` : `<div class="empty-state"><h2>등록된 키워드가 없습니다.</h2><p>관리자에서 최대 15개 키워드를 등록하면 메인과 이 페이지에 표시됩니다.</p></div>`}</section></main>`);
}

async function trendingItems() {
  const manual = await getDomain("trending");
  const manualItems = (manual.items || []).filter(x => x.published !== false).slice(0, 10);
  if (manualItems.length) return manualItems.map(x => ({ ...x, href: x.href || `/search?q=${encodeURIComponent(x.title || "")}` }));
  const [columns, community, news] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("news")]);
  return [...(columns.items || []).map(x => ({ ...x, href: `/column/${x.id}` })), ...(community.items || []).map(x => ({ ...x, href: `/community/${x.id}` })), ...(news.items || []).map(x => ({ ...x, href: `/news/${x.id}` }))].filter(x => x.published !== false).sort((a, b) => (Number(b.likes || 0) * 4 + Number(b.views || 0)) - (Number(a.likes || 0) * 4 + Number(a.views || 0))).slice(0, 10).map((x, i) => ({ id: x.id, rank: i + 1, title: x.title, href: x.href }));
}
export async function renderTrending() {
  const items = await trendingItems();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">TRENDING NOW</span><h1>실시간 급상승</h1><p>메인에서는 TOP 5, 전체페이지에서는 TOP 10까지 보여줍니다.</p></section><section class="content-card"><div class="section-title"><h2>급상승 TOP 10</h2><span>${items.length}개</span></div>${items.length ? `<div class="trending-rank-list">${items.map((x, i) => `<button type="button" data-go="${esc(x.href || `/search?q=${encodeURIComponent(x.title || "")}`)}"><strong>${i + 1}</strong><b>${esc(x.title)}</b><span>보기 →</span></button>`).join("")}</div>` : `<div class="empty-state"><h2>급상승 데이터가 없습니다.</h2><p>관리자에서 직접 TOP 10을 입력하거나 게시물이 쌓이면 참여지표 기반으로 구성됩니다.</p></div>`}</section></main>`);
}

export async function renderAcademy() {
  const data = await getDomain("academy");
  const slots = (data.slots || []).filter(x => x.published !== false);
  const session = getUserSession();
  const activity = getUserActivity();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">JEONGCHAMSI ACADEMY</span><h1>정참시 아카데미</h1><p>정치를 꿈꾸는 사람이 수강 가능한 일정을 확인하고 신청하는 공간입니다.</p></section><section class="content-card"><div class="section-title"><h2>수강 가능 일정</h2><span>${slots.length}개</span></div>${slots.length ? `<div class="academy-slot-list">${slots.map(s => { const applied = (activity.academyApplications || []).includes(String(s.id)); return `<article><div><b>${esc(s.date || "날짜 미정")}</b><span>${esc(s.title || "정참시 아카데미")} · ${esc(s.description || "")}</span></div><button type="button" data-academy-apply="${esc(s.id)}" ${s.closed || applied ? "disabled" : ""}>${s.closed ? "마감" : applied ? "신청완료" : session.authenticated ? "수강신청" : "로그인 후 신청"}</button></article>`; }).join("")}</div>` : `<div class="empty-state"><h2>등록된 일정이 없습니다.</h2><p>관리자에서 일정을 등록하면 이곳에 표시됩니다.</p></div>`}</section></main>`);
}

function publishedItsme(data) { return (data.items || []).filter(x => x.published !== false).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)); }
export async function renderItsme(search = "") {
  const data = await getDomain("itsme");
  const session = getUserSession();
  const category = new URLSearchParams(search || "").get("category") || "";
  const items = publishedItsme(data).filter(x => !category || x.category === category);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">IT’S ME · POLICY PROPOSAL</span><h1>IT’S ME</h1><p>“내가 대통령이라면, 내가 국회의원이라면, 내가 시장이라면, 내가 장관이라면”을 말머리로 정책과 아이디어를 직접 제안하는 참여 게시판입니다.</p></section><section class="content-card"><div class="board-toolbar"><div class="itsme-category-tabs"><button type="button" class="${!category ? "active" : ""}" data-go="/itsme">전체</button>${(data.categories || []).map(c => `<button type="button" class="${category === c ? "active" : ""}" data-go="/itsme?category=${encodeURIComponent(c)}">${esc(c)}</button>`).join("")}</div>${session.authenticated ? `<button class="primary-btn" type="button" data-go="/itsme/write">IT’S ME 글쓰기</button>` : `<button class="primary-btn" type="button" data-go="/login">로그인 후 글쓰기</button>`}</div>${items.length ? `<div class="board-list itsme-board-list">${items.map(item => `<article class="no-thumb"><a href="/itsme/${esc(item.id)}" data-route><span class="type">${esc(item.category || "IT’S ME")}</span><h2>${esc(item.title)}</h2><p>${esc(item.summary || item.body || "")}</p></a><small>${esc(item.author || "정참시 회원")} · ${formatDate(item.createdAt)} · 좋아요 ${Number(item.likes || 0)}</small></article>`).join("")}</div>` : `<div class="empty-state tall"><div class="empty-icon">ME</div><h2>아직 등록된 제안이 없습니다.</h2><p>로그인 후 첫 정책 제안을 작성할 수 있습니다.</p></div>`}</section></main>`);
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
  const data = await getDomain("itsme");
  const item = (data.items || []).find(x => String(x.id) === String(id) && x.published !== false);
  if (!item) return pageShell(`<main class="subpage"><section class="content-card empty-state tall"><h2>IT’S ME 게시물을 찾을 수 없습니다.</h2><button class="primary-btn" type="button" data-go="/itsme">목록으로</button></section></main>`);
  const session = getUserSession();
  const liked = session.authenticated && isPostLiked("itsme", id);
  const isAdmin = session.authenticated && session.user?.role === "admin";
  const mine = session.authenticated && String(item.ownerId || "") === String(session.user.id);
  const canManage = isAdmin || mine;
  const commentsData = await getDomain("comments");
  const comments = (commentsData.items || []).filter(c => c.published !== false && c.domain === "itsme" && String(c.postId) === String(id)).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return pageShell(`<main class="subpage"><article class="content-card article-detail"><span class="eyebrow">IT’S ME · ${esc(item.category || "정책 제안")}</span><h1>${esc(item.title)}</h1><div class="article-meta"><span>${esc(item.author || "정참시 회원")}</span><span>${formatDate(item.createdAt)}</span><span>좋아요 ${Number(item.likes || 0)}</span></div>${item.summary ? `<div class="article-lead">${esc(item.summary)}</div>` : ""}<div class="article-body">${bodyHtml(item.body)}</div><div class="article-actions"><button type="button" class="ghost-btn ${liked ? "active" : ""}" data-post-like="itsme" data-post-id="${esc(id)}">${liked ? "♥ 좋아요 취소" : "♡ 좋아요"}</button>${canManage ? `<button type="button" class="ghost-btn" data-go="/itsme/write?id=${encodeURIComponent(id)}">수정</button><button type="button" class="danger-btn" data-user-post-delete="itsme" data-id="${esc(id)}">삭제</button>` : ""}<button type="button" class="primary-btn" data-go="/itsme">IT’S ME 목록으로</button></div></article><section class="content-card comment-section"><div class="section-title"><h2>댓글</h2><span>${comments.length}개</span></div>${session.authenticated ? `<form class="comment-form" data-comment-form="itsme" data-post-id="${esc(id)}"><textarea name="comment" rows="3" maxlength="1000" required placeholder="의견을 남겨보세요."></textarea><div class="admin-form-actions"><button class="primary-btn" type="submit">댓글 등록</button><span data-comment-state></span></div></form>` : `<div class="member-login-prompt"><span>댓글은 로그인 후 작성할 수 있습니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`}${comments.length ? `<div class="comment-list">${comments.map(c => `<article><div><b>${esc(c.author)}</b><span>${formatDate(c.createdAt)}</span></div><p>${esc(c.text)}</p></article>`).join("")}</div>` : `<div class="empty-inline">아직 댓글이 없습니다.</div>`}</section></main>`);
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
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">COMPARE POLITICIANS</span><h1>정치인 비교분석</h1><p>543명 목록을 끝까지 내릴 필요 없이 검색어로 후보를 좁힌 뒤 선택할 수 있습니다.</p></section><section class="content-card"><form class="compare-picker compare-picker-searchable" data-compare-form><label>정치인 A 검색<input type="search" placeholder="이름·직위·슬롯 검색" data-person-select-filter="#compare-person-a"><select id="compare-person-a" name="a" required><option value="">정치인 A 선택</option>${personOptions(a)}</select></label><span class="compare-vs">VS</span><label>정치인 B 검색<input type="search" placeholder="이름·직위·슬롯 검색" data-person-select-filter="#compare-person-b"><select id="compare-person-b" name="b" required><option value="">정치인 B 선택</option>${personOptions(b)}</select></label><button class="primary-btn" type="submit">비교하기</button></form></section>${result}</main>`);
}

export async function renderGeneration() {
  const data = await getDomain("generation");
  const session = getUserSession();
  const ages = ["10대", "20대", "30대", "40대", "50대", "60대+"];
  const results = data.results || {};
  const cards = ages.map(age => {
    const votes = results[age] || {};
    const sorted = Object.entries(votes).sort((a, b) => Number(b[1]) - Number(a[1]));
    const top = sorted[0];
    const total = sorted.reduce((sum, x) => sum + Number(x[1] || 0), 0);
    const label = top ? slotLabel(getPersonSlotById(top[0]) || { roleLabel: "정치인", slot: 0 }) : "아직 투표 없음";
    const share = top && total ? Math.round(Number(top[1]) * 100 / total) : 0;
    return `<article><b>${age}</b><p>${esc(label)}</p><strong>${share}%</strong><span>${total}명 참여</span></article>`;
  }).join("");

  let voteArea = `<div class="member-login-prompt"><span>세대별 모의투표는 로그인 후 참여할 수 있습니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`;
  if (session.authenticated) {
    const ageGroup = memberAgeGroup(session.user.birthYear);
    if (data.enabled === false) voteArea = `<div class="empty-inline">현재 세대별 모의투표가 일시 중지되어 있습니다.</div>`;
    else if (!ageGroup) voteArea = `<div class="member-login-prompt"><span>정확한 세대별 집계를 위해 회원정보에 출생연도를 먼저 등록해 주세요.</span><button class="primary-btn" type="button" data-go="/mypage/profile">출생연도 등록</button></div>`;
    else if (hasGenerationVote(ageGroup)) voteArea = `<div class="empty-inline">${esc(ageGroup)} 투표에 이미 참여했습니다. 선택: ${esc(slotLabel(getPersonSlotById(generationVoteFor(ageGroup)) || { roleLabel: "정치인", slot: 0 }))}</div>`;
    else voteArea = `<form class="generation-vote-form generation-vote-fixed generation-vote-searchable" data-generation-vote-form><input type="hidden" name="ageGroup" value="${esc(ageGroup)}"><label>내 세대<input value="${esc(ageGroup)}" disabled></label><label>대통령 후보 검색<input type="search" placeholder="이름·직위·슬롯 검색" data-person-select-filter="#generation-person"><select id="generation-person" name="personId" required><option value="">정치인 선택</option>${personOptions("", data.candidates || [])}</select></label><button class="primary-btn" type="submit">투표하기</button><div class="save-state" data-generation-vote-state></div></form>`;
  }

  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">GENERATION CHOICE · MOCK VOTE</span><h1>세대가 뽑은 대통령</h1><p>회원가입 때 입력한 출생연도로 내 세대는 자동 고정됩니다. 후보는 543명 목록을 직접 내리지 않고 검색해서 선택할 수 있습니다.</p></section><section class="content-card"><div class="generation-page-grid">${cards}</div></section><section class="content-card"><div class="section-title"><h2>모의투표 참여</h2><span>${session.authenticated ? "회원 출생연도 기준 세대 자동 적용" : "로그인 필요"}</span></div>${voteArea}</section></main>`);
}

export async function renderNationalEvaluation() {
  const data = await getDomain("nationalEvaluation");
  const session = getUserSession();
  const person = data.subjectId ? getPersonSlotById(data.subjectId) : null;
  const votes = person ? { positive: 0, neutral: 0, negative: 0, ...(data.results?.[person.id] || {}) } : { positive: 0, neutral: 0, negative: 0 };
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
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">NATIONAL EVALUATION</span><h1>국회의원 전국 평가제</h1><p>현재 평가와 지난 평가 결과를 한 페이지에서 확인합니다.</p></section>${person ? `<section class="person-detail-hero content-card"><div class="person-detail-photo"></div><div class="person-detail-title"><span class="eyebrow">CURRENT SUBJECT</span><h1>${esc(slotLabel(person))}</h1><p>실제 인물정보 연결 전 · 국회의원 슬롯 #${String(person.slot).padStart(3, "0")}</p><div class="person-detail-badges"><span>전국 평가 대상</span><span>${data.enabled ? "평가 진행중" : "평가 일시중지"}</span></div></div><div class="detail-action-bar"><button class="ghost-btn" type="button" data-go="/person/${esc(person.id)}">상세페이지</button></div></section><section class="content-card"><div class="section-title"><h2>현재 평가 결과</h2><span>${total}명 참여</span></div><div class="evaluation-result-grid"><article><small>긍정</small><strong>${share("positive")}%</strong><span>${Number(votes.positive || 0)}표</span></article><article><small>보통</small><strong>${share("neutral")}%</strong><span>${Number(votes.neutral || 0)}표</span></article><article><small>부정</small><strong>${share("negative")}%</strong><span>${Number(votes.negative || 0)}표</span></article></div></section><section class="content-card"><div class="section-title"><h2>전국 평가 참여</h2><span>${voted ? "참여 완료" : voting ? "평가 진행중" : "평가 중지"}</span></div>${!session.authenticated ? `<div class="member-login-prompt"><span>평가 참여는 로그인 후 가능합니다.</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>` : !voting ? `<div class="empty-inline">관리자가 평가를 활성화하면 참여할 수 있습니다.</div>` : voted ? `<div class="empty-inline">이 평가에 이미 참여했습니다.</div>` : `<form class="evaluation-vote-form" data-national-evaluation-form data-person-id="${esc(person.id)}"><label><input type="radio" name="rating" value="positive" required><b>긍정 평가</b><span>전반적으로 잘하고 있다고 봅니다.</span></label><label><input type="radio" name="rating" value="neutral" required><b>보통</b><span>긍정과 아쉬움이 비슷합니다.</span></label><label><input type="radio" name="rating" value="negative" required><b>부정 평가</b><span>전반적으로 아쉽다고 봅니다.</span></label><button class="primary-btn" type="submit">평가 제출</button><div class="save-state" data-national-evaluation-state></div></form>`}</section>` : `<section class="content-card"><div class="empty-state tall"><div class="empty-icon">評</div><h2>평가 대상 선택 전</h2><p>관리자에서 국회의원 300개 슬롯 중 한 명을 선택하면 이 페이지에서 바로 평가할 수 있습니다.</p></div></section>`}${historyMarkup}</main>`);
}

export async function renderSearch(query = "") {
  const q = String(query || "").trim().toLowerCase();
  const [columns, community, news, itsme] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("news"), getDomain("itsme")]);
  const groups = [["COLUMN", "column", columns.items || []], ["정뮤니티", "community", community.items || []], ["정참시 NEWS", "news", news.items || []], ["IT’S ME", "itsme", itsme.items || []]];
  const contentMatches = q ? groups.flatMap(([label, route, items]) => items.filter(x => x.published !== false && `${x.title || ""} ${x.summary || ""} ${x.body || ""}`.toLowerCase().includes(q)).map(x => ({ ...x, label, route }))) : [];
  const peopleMatches = q ? listAllPoliticians().filter(p => `${slotLabel(p)} ${p.id}`.toLowerCase().includes(q)).slice(0, 30) : [];
  const hasResults = contentMatches.length || peopleMatches.length;
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">SEARCH</span><h1>통합검색</h1><p>검색어: <b>${esc(query || "—")}</b></p></section>${peopleMatches.length ? `<section class="content-card"><div class="section-title"><h2>정치인 Slot</h2><span>${peopleMatches.length}명</span></div><div class="member-link-list">${peopleMatches.map(p => `<button type="button" data-go="/person/${esc(p.id)}"><b>${esc(slotLabel(p))}</b><span>상세보기 →</span></button>`).join("")}</div></section>` : ""}<section class="content-card">${contentMatches.length ? `<div class="board-list">${contentMatches.map(x => `<article class="no-thumb"><a href="/${x.route}/${esc(x.id)}" data-route><span class="type">${esc(x.label)}</span><h2>${esc(x.title)}</h2><p>${esc(x.summary || x.body || "")}</p></a><small>${esc(x.author || "정참시")}</small></article>`).join("")}</div>` : `<div class="empty-state tall"><h2>${q && !hasResults ? "검색 결과가 없습니다." : q ? "게시판 검색 결과가 없습니다." : "검색어를 입력해 주세요."}</h2><p>정치인 실데이터 연결 전에는 ‘국회의원 001’, ‘광역단체장 001’ 같은 Slot 검색이 가능합니다.</p></div>`}</section></main>`);
}

export { trendingItems };
