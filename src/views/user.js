import { pageShell, esc } from "./layout.js?v=alpha6.0.36.22-author-partner-hub";
import { getUserSession, getUserActivity, getRecentPeople } from "../core/user.js";
import { getDomain } from "../core/repository.js";
import { getPersonSlotById } from "../data/person-provider.js?v=alpha6.0.20-function-detail";
import { REGION_DATA } from "../data/regions.js";
import { BADGE_CATALOG, badgeGemSvg } from "../data/badge-catalog.js?v=alpha6.0.36.22-author-partner-hub";

function authHero(title, description) {
  return `<section class="page-hero"><span class="eyebrow">MEMBER</span><h1>${esc(title)}</h1><p>${esc(description)}</p></section>`;
}
function personLabel(id) {
  const p = getPersonSlotById(id);
  if (!p) return id;
  if (p.connected && p.name) return [p.name, p.party, p.jurisdiction].filter(Boolean).join(" · ");
  return `${p.roleLabel} #${String(p.slot).padStart(3, "0")}`;
}
function formatDate(v) {
  if (!v) return "";
  try { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v)); }
  catch { return ""; }
}
function badgeList(activity, authoredCount, commentCount, itsmeCount = 0, role = "member") {
  const pollCount = Object.keys(activity.pollVotes || {}).length;
  const earned = new Set(activity.grantedBadges || []);
  if (pollCount + commentCount + authoredCount > 0) earned.add("first-participation");
  if (pollCount > 0) earned.add("citizen-choice");
  if (itsmeCount > 0) earned.add("policy-proposer");
  if (role === "partner") earned.add("jungchamsi-partner");
  if (role === "admin") BADGE_CATALOG.forEach(x => earned.add(x.key));
  return BADGE_CATALOG.map(x => ({ ...x, earned: earned.has(x.key), representative: String(activity.representativeBadge || "") === x.key, adminGranted:(activity.grantedBadges || []).includes(x.key), adminOpen:role === "admin" }));
}
function roleLabel(role = "member") { return role === "admin" ? "관리자" : role === "partner" ? "정참시 PARTNER" : "일반회원"; }

function currentAge(birthYear) {
  const year = Number(birthYear || 0);
  const now = new Date().getFullYear();
  return Number.isInteger(year) && year >= 1900 && year <= now ? now - year : null;
}

function provinceOptions(selected = "") {
  return `<option value="">도/광역시 선택</option>${Object.keys(REGION_DATA).map(x => `<option value="${esc(x)}" ${x === selected ? "selected" : ""}>${esc(x)}</option>`).join("")}`;
}

function regionFields(user = {}, required = true) {
  const province = user.regionProvince || "";
  const city = user.regionCity || "";
  const district = user.regionDistrict || "";
  return `<div class="region-select-grid" data-region-group data-selected-province="${esc(province)}" data-selected-city="${esc(city)}" data-selected-district="${esc(district)}"><label>도/광역시<select name="regionProvince" data-region-province ${required ? "required" : ""}>${provinceOptions(province)}</select></label><label>시/군<select name="regionCity" data-region-city ${required ? "required" : ""}><option value="">시/군 선택</option></select></label><label>구/군 · 해당 시<select name="regionDistrict" data-region-district><option value="">구/군 없음</option></select></label></div>`;
}

async function myContentCounts(userId) {
  const [community, itsme, columns, news, comments] = await Promise.all([getDomain("community"), getDomain("itsme"), getDomain("columns"), getDomain("news"), getDomain("comments")]);
  const communityPosts = (community.items || []).filter(x => String(x.ownerId || "") === String(userId));
  const itsmePosts = (itsme.items || []).filter(x => String(x.ownerId || "") === String(userId));
  const columnPosts = (columns.items || []).filter(x => String(x.ownerId || "") === String(userId));
  const newsPosts = (news.items || []).filter(x => String(x.ownerId || "") === String(userId));
  const myComments = (comments.items || []).filter(x => String(x.ownerId || "") === String(userId));
  return { communityPosts, itsmePosts, columnPosts, newsPosts, myComments, authoredCount: communityPosts.length + itsmePosts.length + columnPosts.length + newsPosts.length };
}
function activityTabs(active) {
  const tabs = [
    ["summary", "전체 활동"], ["likes", "좋아요"], ["polls", "설문 참여"],
    ["favorites", "즐겨찾기"], ["badges", "배지"]
  ];
  return `<nav class="my-post-tabs">${tabs.map(([key, label]) => `<button type="button" class="${active === key ? "active" : ""}" data-go="/mypage/activity?tab=${key}">${label}</button>`).join("")}</nav>`;
}

export async function renderLogin() {
  const session = getUserSession();
  if (session.authenticated) {
    return pageShell(`<main class="subpage">${authHero("로그인", "이미 로그인되어 있습니다.")}<section class="content-card empty-state"><h2>${esc(session.user.nickname || session.user.id)}님</h2><p>마이페이지에서 내가 쓴 글·설문·즐겨찾기·최근 본 정치인을 확인할 수 있습니다.</p><div class="inline-actions centered"><button class="primary-btn" type="button" data-go="/mypage">마이페이지</button>${session.user.role === "admin" ? `<button class="primary-btn" type="button" data-go="/admin">관리자</button>` : ""}<button class="ghost-btn" type="button" data-user-logout>로그아웃</button></div></section></main>`);
  }
  return pageShell(`<main class="subpage auth-wrap"><section class="auth-card member-auth-card"><span class="eyebrow">MEMBER LOGIN</span><h1>정참시 로그인</h1><p>로그인하면 글쓰기, 정치인 즐겨찾기, 좋아요·댓글, 설문·세대별 투표를 사용할 수 있습니다.</p><form class="auth-form" data-user-login><label>아이디<input name="id" autocomplete="username" required></label><label>비밀번호<input type="password" name="password" autocomplete="current-password" required></label><button class="primary-btn" type="submit">로그인</button><button class="ghost-btn" type="button" data-go="/join">회원가입</button><div class="auth-error" data-user-auth-error></div></form></section></main>`);
}

export async function renderJoin() {
  const session = getUserSession();
  if (session.authenticated) return renderMyPage();
  return pageShell(`<main class="subpage"><section class="content-card member-join-card"><span class="eyebrow">JOIN</span><h1>정참시 회원가입</h1><p>이름·지역·출생연도를 기준으로 개인화된 참여 기능을 제공합니다. 출생연도는 매년 자동으로 나이를 다시 계산하므로 나이를 따로 수정할 필요가 없습니다.</p><form class="admin-form member-join-form" data-user-join><div class="admin-form-row"><label>아이디<input name="id" required placeholder="영문·숫자 4~24자"></label><label>이름<input name="name" required maxlength="40" placeholder="실명 입력"></label></div><div class="admin-form-row"><label>닉네임 · 선택<input name="nickname" placeholder="비워두면 아이디 사용"></label><label>전화번호<input name="phone" required placeholder="010-0000-0000"></label></div><div class="admin-form-row"><label>비밀번호<input type="password" name="password" required minlength="8"></label><label>비밀번호 확인<input type="password" name="passwordConfirm" required minlength="8"></label></div><label>이메일 · 선택<input type="email" name="email"></label>${regionFields({}, true)}<div class="admin-form-row"><label>출생연도<input name="birthYear" inputmode="numeric" maxlength="4" required placeholder="예: 1990"><small class="field-help">출생연도 기준 나이는 매년 자동으로 1살씩 올라갑니다.</small></label><label>선호정당<select name="preferredParty" required><option value="">선택</option><option>더불어민주당</option><option>국민의힘</option><option>조국혁신당</option><option>개혁신당</option><option>진보당</option><option>기타/무당층</option></select></label></div><div class="auth-error" data-user-auth-error></div><div class="admin-form-actions"><button class="primary-btn" type="submit">가입하고 시작</button><button class="ghost-btn" type="button" data-go="/login">로그인으로</button></div></form></section></main>`);
}

export async function renderMyPage() {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const activity = getUserActivity();
  const counts = await myContentCounts(session.user.id);
  const user = session.user;
  return pageShell(`<main class="subpage"><section class="page-hero member-profile-hero"><span class="eyebrow">MY JEONGCHAMSI</span><h1>${esc(user.name || user.nickname || user.id)}님</h1><p>${esc(user.region || "지역 미설정")} · ${currentAge(user.birthYear) !== null ? `${currentAge(user.birthYear)}세` : "출생연도 미설정"} · ${esc(user.preferredParty || "선호정당 미설정")} · ${roleLabel(user.role)}</p><div class="inline-actions top-gap">${user.role === "admin" ? `<button class="primary-btn" type="button" data-go="/admin">관리자 페이지</button>` : ""}<button class="ghost-btn" type="button" data-user-logout>로그아웃</button></div></section><section class="member-stat-grid"><article class="content-card"><small>내가 쓴 글</small><strong>${counts.authoredCount}</strong><span>개</span></article><article class="content-card"><small>댓글</small><strong>${counts.myComments.length}</strong><span>개</span></article><article class="content-card"><small>즐겨찾기</small><strong>${(activity.favorites || []).length}</strong><span>명</span></article><article class="content-card"><small>설문 참여</small><strong>${Object.keys(activity.pollVotes || {}).length}</strong><span>건</span></article></section><section class="mypage-menu-grid"><button type="button" data-go="/mypage/posts"><b>내가 쓴 글</b><span>게시판별로 모아보기 →</span></button><button type="button" data-go="/mypage/activity"><b>내 참여 · 배지</b><span>좋아요·설문·즐겨찾기·배지 →</span></button><button type="button" data-go="/mypage/recent"><b>최근 본 정치인</b><span>최근 열어본 정치인 →</span></button><button type="button" data-go="/mypage/profile"><b>회원정보</b><span>내 프로필 수정 →</span></button></section><section class="content-card"><div class="section-title"><h2>획득 가능한 배지</h2><button class="text-link" type="button" data-go="/mypage/activity?tab=badges">전체 배지 보기</button></div><div class="badge-preview-row badge-jewel-preview">${BADGE_CATALOG.slice(0, 6).map(x => `<span>${badgeGemSvg(x.key)}<b>${esc(x.name)}</b><small>${esc(x.tier)}</small></span>`).join("")}</div></section><section class="content-card"><div class="section-title"><h2>즐겨찾기 정치인</h2><span>${(activity.favorites || []).length}명</span></div>${(activity.favorites || []).length ? `<div class="member-link-list">${activity.favorites.map(id => `<button type="button" data-go="/person/${esc(id)}"><b>${esc(personLabel(id))}</b><span>상세보기 →</span></button>`).join("")}</div>` : `<div class="empty-inline">정치인 상세페이지에서 ‘즐겨찾기’를 눌러보세요.</div>`}</section></main>`);
}

export async function renderMyActivity(search = "") {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const tab = new URLSearchParams(search || "").get("tab") || "summary";
  const activity = getUserActivity();
  const counts = await myContentCounts(session.user.id);
  const badges = badgeList(activity, counts.authoredCount, counts.myComments.length, counts.itsmePosts.length, session.user.role);
  let detail = "";

  if (tab === "likes") {
    const [columns, community, news, itsme] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("news"), getDomain("itsme")]);
    const maps = { columns: ["COLUMN", "column", columns.items || []], community: ["정뮤니티", "community", community.items || []], news: ["정참시 NEWS", "news", news.items || []], itsme: ["IT’S ME", "itsme", itsme.items || []] };
    const liked = (activity.likedPosts || []).map(key => { const [domain, id] = String(key).split(":"); const entry = maps[domain]; const post = entry?.[2]?.find(x => String(x.id) === id); return post ? { ...post, board: entry[0], route: `/${entry[1]}/${id}` } : null; }).filter(Boolean);
    detail = `<div class="section-title"><h2>좋아요한 글</h2><span>${liked.length}개</span></div>${liked.length ? `<div class="member-link-list">${liked.map(x => `<button type="button" data-go="${esc(x.route)}"><b>${esc(x.title)}</b><span>${esc(x.board)} →</span></button>`).join("")}</div>` : `<div class="empty-inline">좋아요한 글이 없습니다.</div>`}`;
  } else if (tab === "polls") {
    const polls = await getDomain("polls");
    const votes = Object.entries(activity.pollVotes || {}).map(([pollId, optionId]) => { const poll = (polls.items || []).find(x => String(x.id) === pollId); const option = poll?.options?.find(x => String(x.id) === String(optionId)); return { pollId, question: poll?.question || "설문", option: option?.label || "선택 기록" }; });
    detail = `<div class="section-title"><h2>설문 참여</h2><span>${votes.length}건</span></div>${votes.length ? `<div class="member-link-list">${votes.map(x => `<button type="button" data-go="/poll"><b>${esc(x.question)}</b><span>${esc(x.option)} →</span></button>`).join("")}</div>` : `<div class="empty-inline">참여한 설문이 없습니다.</div>`}`;
  } else if (tab === "favorites") {
    const favorites = activity.favorites || [];
    detail = `<div class="section-title"><h2>즐겨찾기 정치인</h2><span>${favorites.length}명</span></div>${favorites.length ? `<div class="member-link-list">${favorites.map(id => `<button type="button" data-go="/person/${esc(id)}"><b>${esc(personLabel(id))}</b><span>상세보기 →</span></button>`).join("")}</div>` : `<div class="empty-inline">즐겨찾기한 정치인이 없습니다.</div>`}`;
  } else if (tab === "badges") {
    detail = `<div class="section-title"><h2>내 배지 컬렉션</h2><span>${badges.filter(x => x.earned).length}개 획득 · 총 ${badges.length}종</span></div><p class="badge-catalog-note">획득한 배지 중 하나를 대표 배지로 선택하면 메인 오른쪽 ‘내 참여 · 배지’에 바로 표시됩니다.</p><div class="badge-detail-grid badge-jewel-grid">${badges.map(x => `<article class="${x.earned ? "earned" : "locked"} ${x.representative ? "representative" : ""}"><div class="badge-jewel-stage">${badgeGemSvg(x.key)}</div><div class="badge-jewel-copy"><small>${esc(x.tier)} · ${esc(x.kind)}${x.adminOpen ? " · 관리자 전체 개방" : (x.adminGranted ? " · 관리자 해금" : "")}</small><b>${esc(x.name)}</b><p>${esc(x.mission)}</p>${x.earned ? `<button class="ghost-btn badge-representative-btn ${x.representative ? "active" : ""}" type="button" data-badge-representative="${esc(x.key)}">${x.representative ? "대표 배지로 설정됨" : "대표 배지로 설정"}</button>` : `<span class="badge-locked-label">미획득</span>`}</div></article>`).join("")}</div>`;
  } else {
    detail = `<div class="section-title"><h2>활동 요약</h2><span>내 기록</span></div><div class="member-stat-grid activity-inner-stats"><article><small>작성 글</small><strong>${counts.authoredCount}</strong><span>개</span></article><article><small>댓글</small><strong>${counts.myComments.length}</strong><span>개</span></article><article><small>좋아요</small><strong>${(activity.likedPosts || []).length}</strong><span>개</span></article><article><small>설문</small><strong>${Object.keys(activity.pollVotes || {}).length}</strong><span>건</span></article></div><div class="member-link-list top-gap"><button type="button" data-go="/mypage/posts"><b>내가 쓴 글·댓글</b><span>${counts.authoredCount + counts.myComments.length}개 →</span></button><button type="button" data-go="/mypage/recent"><b>최근 본 정치인</b><span>${getRecentPeople().length}명 →</span></button></div>`;
  }

  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">MY ACTIVITY</span><h1>내 참여 · 배지</h1><p>내가 정참시에서 남긴 참여 기록을 종류별로 확인합니다.</p></section><section class="content-card">${activityTabs(tab)}${detail}</section></main>`);
}

export async function renderMyPosts(search = "") {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const tab = new URLSearchParams(search || "").get("tab") || "all";
  const counts = await myContentCounts(session.user.id);
  const posts = [
    ...counts.communityPosts.map(x => ({ ...x, board: "정뮤니티", route: `/community/${x.id}`, type: "community" })),
    ...counts.itsmePosts.map(x => ({ ...x, board: "IT’S ME", route: `/itsme/${x.id}`, type: "itsme" })),
    ...counts.columnPosts.map(x => ({ ...x, board: "COLUMN", route: `/column/${x.id}`, type: "columns" })),
    ...counts.newsPosts.map(x => ({ ...x, board: "정참시 NEWS", route: `/news/${x.id}`, type: "news" }))
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const filtered = ["community","itsme","columns","news"].includes(tab) ? posts.filter(x => x.type === tab) : posts;
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">MY POSTS</span><h1>내가 쓴 글</h1><p>내가 작성한 정뮤니티·IT’S ME·COLUMN·NEWS 글을 게시판별로 모아봅니다.</p></section><section class="content-card"><div class="my-post-tabs"><button type="button" class="${tab === "all" ? "active" : ""}" data-go="/mypage/posts?tab=all">전체 ${posts.length}</button><button type="button" class="${tab === "community" ? "active" : ""}" data-go="/mypage/posts?tab=community">정뮤니티 ${counts.communityPosts.length}</button><button type="button" class="${tab === "itsme" ? "active" : ""}" data-go="/mypage/posts?tab=itsme">IT’S ME ${counts.itsmePosts.length}</button><button type="button" class="${tab === "columns" ? "active" : ""}" data-go="/mypage/posts?tab=columns">COLUMN ${counts.columnPosts.length}</button><button type="button" class="${tab === "news" ? "active" : ""}" data-go="/mypage/posts?tab=news">NEWS ${counts.newsPosts.length}</button><button type="button" class="${tab === "comments" ? "active" : ""}" data-go="/mypage/posts?tab=comments">댓글 ${counts.myComments.length}</button></div>${tab === "comments" ? (counts.myComments.length ? `<div class="comment-list">${counts.myComments.map(c => `<article><div><b>${esc(c.domain === "itsme" ? "IT’S ME" : c.domain === "community" ? "정뮤니티" : c.domain)}</b><span>${formatDate(c.createdAt)}</span></div><p>${esc(c.text)}</p><button class="text-link" type="button" data-go="/${c.domain === "columns" ? "column" : c.domain}/${esc(c.postId)}">원문 보기 →</button></article>`).join("")}</div>` : `<div class="empty-inline">작성한 댓글이 없습니다.</div>`) : (filtered.length ? `<div class="my-post-list">${filtered.map(x => `<article><div><span>${esc(x.board)}</span><b>${esc(x.title)}</b><small>${formatDate(x.createdAt)} · 좋아요 ${Number(x.likes || 0)} · 조회 ${Number(x.views || 0)}</small></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="${esc(x.route)}">보기</button><button class="ghost-btn" type="button" data-go="/${x.type === "columns" ? "column" : x.type}/write?id=${encodeURIComponent(x.id)}">수정</button></div></article>`).join("")}</div>` : `<div class="empty-inline">이 게시판에 작성한 글이 없습니다.</div>`)}</section></main>`);
}

export async function renderMyRecent() {
  const recent = getRecentPeople();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">RECENT POLITICIANS</span><h1>최근 본 정치인</h1><p>비로그인 상태에서는 이 브라우저에만 기록하고, 로그인 상태에서는 계정에 저장합니다.</p></section><section class="content-card"><div class="section-title"><h2>최근 본 목록</h2><span>${recent.length}명</span></div>${recent.length ? `<div class="recent-person-list">${recent.map((id, i) => `<button type="button" data-go="/person/${esc(id)}"><strong>${i + 1}</strong><span class="recent-person-avatar"></span><b>${esc(personLabel(id))}</b><em>상세보기 →</em></button>`).join("")}</div>` : `<div class="empty-state"><h2>아직 본 정치인이 없습니다.</h2><p>NOW Rank 전체 정치인에서 인물을 열어보면 이곳에 기록됩니다.</p><button class="primary-btn" type="button" data-go="/now">NOW Rank 보기</button></div>`}</section></main>`);
}

export async function renderMyProfile() {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const user = session.user;
  const age = currentAge(user.birthYear);
  const parties = ["더불어민주당", "국민의힘", "조국혁신당", "개혁신당", "진보당", "기타/무당층"];
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">MY PROFILE</span><h1>회원정보</h1><p>출생연도만 저장하고 현재 나이는 매년 자동 계산합니다.${age !== null ? ` 현재 출생연도 기준 ${age}세입니다.` : ""}</p></section><section class="content-card"><form class="admin-form" data-user-profile-form><div class="admin-form-row"><label>아이디<input value="${esc(user.id)}" disabled></label><label>권한<input value="${roleLabel(user.role)}" disabled></label></div><div class="admin-form-row"><label>이름<input name="name" value="${esc(user.name || "")}" maxlength="40" required></label><label>닉네임<input name="nickname" value="${esc(user.nickname || "")}" maxlength="40" required></label></div><div class="admin-form-row"><label>전화번호<input name="phone" value="${esc(user.phone || "")}" maxlength="40"></label><label>이메일<input type="email" name="email" value="${esc(user.email || "")}"></label></div>${regionFields(user, true)}<div class="admin-form-row"><label>출생연도<input name="birthYear" value="${esc(user.birthYear || "")}" maxlength="4" inputmode="numeric" required><small class="field-help">${age !== null ? `현재 ${age}세 · 매년 자동 갱신` : "예: 1990"}</small></label><label>선호정당<select name="preferredParty"><option value="">선택 안 함</option>${parties.map(x => `<option ${x === user.preferredParty ? "selected" : ""}>${x}</option>`).join("")}</select></label></div><div class="admin-form-actions"><button class="primary-btn" type="submit">회원정보 저장</button><button class="ghost-btn" type="button" data-go="/mypage">마이페이지로</button><span class="save-state" data-user-profile-state></span></div></form></section></main>`);
}
