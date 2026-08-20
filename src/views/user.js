import { pageShell, esc } from "./layout.js";
import { getUserSession, getUserActivity, getRecentPeople } from "../core/user.js";
import { getDomain } from "../core/repository.js";
import { getPersonSlotById } from "../data/person-provider.js";

function authHero(title, description) {
  return `<section class="page-hero"><span class="eyebrow">MEMBER</span><h1>${esc(title)}</h1><p>${esc(description)}</p></section>`;
}
function personLabel(id) {
  const p = getPersonSlotById(id);
  return p ? `${p.roleLabel} #${String(p.slot).padStart(3, "0")}` : id;
}
function formatDate(v) {
  if (!v) return "";
  try { return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v)); }
  catch { return ""; }
}
function badgeList(activity, authoredCount, commentCount) {
  return [
    { name: "첫 참여", earned: Object.keys(activity.pollVotes || {}).length + commentCount + authoredCount > 0, desc: "첫 설문·댓글·글쓰기 참여" },
    { name: "의견 작성자", earned: commentCount > 0, desc: "댓글을 한 번 이상 작성" },
    { name: "정책 제안자", earned: authoredCount > 0, desc: "IT’S ME 또는 정뮤니티 글 작성" },
    { name: "관심 정치", earned: (activity.favorites || []).length > 0, desc: "정치인 즐겨찾기 등록" },
    { name: "시민 선택", earned: Object.keys(activity.pollVotes || {}).length > 0, desc: "시민들의 선택 설문 참여" }
  ];
}
async function myContentCounts(userId) {
  const [community, itsme, comments] = await Promise.all([getDomain("community"), getDomain("itsme"), getDomain("comments")]);
  const communityPosts = (community.items || []).filter(x => String(x.ownerId || "") === String(userId));
  const itsmePosts = (itsme.items || []).filter(x => String(x.ownerId || "") === String(userId));
  const myComments = (comments.items || []).filter(x => String(x.ownerId || "") === String(userId));
  return { communityPosts, itsmePosts, myComments, authoredCount: communityPosts.length + itsmePosts.length };
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
  return pageShell(`<main class="subpage"><section class="content-card member-join-card"><span class="eyebrow">JOIN</span><h1>정참시 회원가입</h1><p>가입 회원은 관리자 회원관리에서 확인할 수 있고, 관리자가 일반회원/관리자 권한과 이용상태를 변경할 수 있습니다.</p><form class="admin-form member-join-form" data-user-join><div class="admin-form-row"><label>아이디<input name="id" required placeholder="영문·숫자 4~24자"></label><label>닉네임<input name="nickname" placeholder="비워두면 아이디 사용"></label></div><div class="admin-form-row"><label>비밀번호<input type="password" name="password" required minlength="8"></label><label>비밀번호 확인<input type="password" name="passwordConfirm" required minlength="8"></label></div><div class="admin-form-row"><label>전화번호<input name="phone" required placeholder="010-0000-0000"></label><label>이메일 · 선택<input type="email" name="email"></label></div><div class="admin-form-row"><label>지역<input name="region" required placeholder="예: 경기 화성시"></label><label>출생연도 · 선택<input name="birthYear" inputmode="numeric" maxlength="4" placeholder="예: 1990"></label></div><label>선호정당<select name="preferredParty" required><option value="">선택</option><option>더불어민주당</option><option>국민의힘</option><option>조국혁신당</option><option>개혁신당</option><option>진보당</option><option>기타/무당층</option></select></label><div class="auth-error" data-user-auth-error></div><div class="admin-form-actions"><button class="primary-btn" type="submit">가입하고 시작</button><button class="ghost-btn" type="button" data-go="/login">로그인으로</button></div></form></section></main>`);
}

export async function renderMyPage() {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const activity = getUserActivity();
  const counts = await myContentCounts(session.user.id);
  const user = session.user;
  return pageShell(`<main class="subpage"><section class="page-hero member-profile-hero"><span class="eyebrow">MY JEONGCHAMSI</span><h1>${esc(user.nickname || user.id)}님</h1><p>${esc(user.region || "지역 미설정")} · ${esc(user.preferredParty || "선호정당 미설정")} · ${user.role === "admin" ? "관리자" : "일반회원"}</p><div class="inline-actions top-gap">${user.role === "admin" ? `<button class="primary-btn" type="button" data-go="/admin">관리자 페이지</button>` : ""}<button class="ghost-btn" type="button" data-user-logout>로그아웃</button></div></section><section class="member-stat-grid"><article class="content-card"><small>내가 쓴 글</small><strong>${counts.authoredCount}</strong><span>개</span></article><article class="content-card"><small>댓글</small><strong>${counts.myComments.length}</strong><span>개</span></article><article class="content-card"><small>즐겨찾기</small><strong>${(activity.favorites || []).length}</strong><span>명</span></article><article class="content-card"><small>설문 참여</small><strong>${Object.keys(activity.pollVotes || {}).length}</strong><span>건</span></article></section><section class="mypage-menu-grid"><button type="button" data-go="/mypage/posts"><b>내가 쓴 글</b><span>게시판별로 모아보기 →</span></button><button type="button" data-go="/mypage/activity"><b>내 참여 · 배지</b><span>좋아요·설문·즐겨찾기·배지 →</span></button><button type="button" data-go="/mypage/recent"><b>최근 본 정치인</b><span>최근 열어본 정치인 →</span></button><button type="button" data-go="/mypage/profile"><b>회원정보</b><span>내 프로필 수정 →</span></button></section><section class="content-card"><div class="section-title"><h2>즐겨찾기 정치인</h2><span>${(activity.favorites || []).length}명</span></div>${(activity.favorites || []).length ? `<div class="member-link-list">${activity.favorites.map(id => `<button type="button" data-go="/person/${esc(id)}"><b>${esc(personLabel(id))}</b><span>상세보기 →</span></button>`).join("")}</div>` : `<div class="empty-inline">정치인 상세페이지에서 ‘즐겨찾기’를 눌러보세요.</div>`}</section></main>`);
}

export async function renderMyActivity(search = "") {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const tab = new URLSearchParams(search || "").get("tab") || "summary";
  const activity = getUserActivity();
  const counts = await myContentCounts(session.user.id);
  const badges = badgeList(activity, counts.authoredCount, counts.myComments.length);
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
    detail = `<div class="section-title"><h2>내 배지</h2><span>${badges.filter(x => x.earned).length}개 획득</span></div><div class="badge-detail-grid">${badges.map(x => `<article class="${x.earned ? "earned" : ""}"><span>${x.earned ? "✓" : "○"}</span><div><b>${esc(x.name)}</b><p>${esc(x.desc)}</p></div></article>`).join("")}</div>`;
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
    ...counts.itsmePosts.map(x => ({ ...x, board: "IT’S ME", route: `/itsme/${x.id}`, type: "itsme" }))
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  const filtered = tab === "community" ? posts.filter(x => x.type === "community") : tab === "itsme" ? posts.filter(x => x.type === "itsme") : posts;
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">MY POSTS</span><h1>내가 쓴 글</h1><p>정뮤니티와 IT’S ME에서 내가 작성한 글을 게시판별로 모아봅니다.</p></section><section class="content-card"><div class="my-post-tabs"><button type="button" class="${tab === "all" ? "active" : ""}" data-go="/mypage/posts?tab=all">전체 ${posts.length}</button><button type="button" class="${tab === "community" ? "active" : ""}" data-go="/mypage/posts?tab=community">정뮤니티 ${counts.communityPosts.length}</button><button type="button" class="${tab === "itsme" ? "active" : ""}" data-go="/mypage/posts?tab=itsme">IT’S ME ${counts.itsmePosts.length}</button><button type="button" class="${tab === "comments" ? "active" : ""}" data-go="/mypage/posts?tab=comments">댓글 ${counts.myComments.length}</button></div>${tab === "comments" ? (counts.myComments.length ? `<div class="comment-list">${counts.myComments.map(c => `<article><div><b>${esc(c.domain === "itsme" ? "IT’S ME" : c.domain === "community" ? "정뮤니티" : c.domain)}</b><span>${formatDate(c.createdAt)}</span></div><p>${esc(c.text)}</p><button class="text-link" type="button" data-go="/${c.domain === "itsme" ? "itsme" : c.domain}/${esc(c.postId)}">원문 보기 →</button></article>`).join("")}</div>` : `<div class="empty-inline">작성한 댓글이 없습니다.</div>`) : (filtered.length ? `<div class="my-post-list">${filtered.map(x => `<article><div><span>${esc(x.board)}</span><b>${esc(x.title)}</b><small>${formatDate(x.createdAt)} · 좋아요 ${Number(x.likes || 0)} · 조회 ${Number(x.views || 0)}</small></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="${esc(x.route)}">보기</button><button class="ghost-btn" type="button" data-go="/${x.type === "community" ? "community" : "itsme"}/write?id=${encodeURIComponent(x.id)}">수정</button></div></article>`).join("")}</div>` : `<div class="empty-inline">이 게시판에 작성한 글이 없습니다.</div>`)}</section></main>`);
}

export async function renderMyRecent() {
  const recent = getRecentPeople();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">RECENT POLITICIANS</span><h1>최근 본 정치인</h1><p>비로그인 상태에서는 이 브라우저에만 기록하고, 로그인 상태에서는 계정에 저장합니다.</p></section><section class="content-card"><div class="section-title"><h2>최근 본 목록</h2><span>${recent.length}명</span></div>${recent.length ? `<div class="recent-person-list">${recent.map((id, i) => `<button type="button" data-go="/person/${esc(id)}"><strong>${i + 1}</strong><span class="recent-person-avatar"></span><b>${esc(personLabel(id))}</b><em>상세보기 →</em></button>`).join("")}</div>` : `<div class="empty-state"><h2>아직 본 정치인이 없습니다.</h2><p>NOW Rank 전체 정치인에서 인물을 열어보면 이곳에 기록됩니다.</p><button class="primary-btn" type="button" data-go="/now">NOW Rank 보기</button></div>`}</section></main>`);
}

export async function renderMyProfile() {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const user = session.user;
  const parties = ["더불어민주당", "국민의힘", "조국혁신당", "개혁신당", "진보당", "기타/무당층"];
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">MY PROFILE</span><h1>회원정보</h1><p>내 프로필 정보는 서버의 회원 원본 데이터에 저장됩니다.</p></section><section class="content-card"><form class="admin-form" data-user-profile-form><div class="admin-form-row"><label>아이디<input value="${esc(user.id)}" disabled></label><label>권한<input value="${user.role === "admin" ? "관리자" : "일반회원"}" disabled></label></div><div class="admin-form-row"><label>닉네임<input name="nickname" value="${esc(user.nickname || "")}" maxlength="40" required></label><label>전화번호<input name="phone" value="${esc(user.phone || "")}" maxlength="40"></label></div><div class="admin-form-row"><label>이메일<input type="email" name="email" value="${esc(user.email || "")}"></label><label>지역<input name="region" value="${esc(user.region || "")}" maxlength="80"></label></div><div class="admin-form-row"><label>출생연도<input name="birthYear" value="${esc(user.birthYear || "")}" maxlength="4" inputmode="numeric"></label><label>선호정당<select name="preferredParty"><option value="">선택 안 함</option>${parties.map(x => `<option ${x === user.preferredParty ? "selected" : ""}>${x}</option>`).join("")}</select></label></div><div class="admin-form-actions"><button class="primary-btn" type="submit">회원정보 저장</button><button class="ghost-btn" type="button" data-go="/mypage">마이페이지로</button><span class="save-state" data-user-profile-state></span></div></form></section></main>`);
}
