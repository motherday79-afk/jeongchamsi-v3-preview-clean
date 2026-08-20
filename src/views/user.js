import { pageShell, esc } from "./layout.js";
import {
  getUserSession,
  getUserActivity,
  getRecentPeople,
  PREVIEW_USER_ID,
  PREVIEW_USER_PASSWORD
} from "../core/user.js";
import { getPersonSlotById } from "../data/person-provider.js";

function authHero(title, description) {
  return `<section class="page-hero"><span class="eyebrow">MEMBER</span><h1>${esc(title)}</h1><p>${esc(description)}</p></section>`;
}

export async function renderLogin() {
  const session = getUserSession();
  if (session.authenticated) {
    return pageShell(`<main class="subpage">${authHero("로그인", "이미 로그인되어 있습니다.")}<section class="content-card empty-state"><h2>${esc(session.user.nickname || session.user.id)}님</h2><p>마이페이지에서 즐겨찾기·참여기록·최근 본 정치인을 확인할 수 있습니다.</p><div class="inline-actions" style="justify-content:center;margin-top:18px"><button class="primary-btn" type="button" data-go="/mypage">마이페이지</button>${session.user.role === "admin" ? `<button class="primary-btn" type="button" data-go="/admin">관리자</button>` : ""}<button class="ghost-btn" type="button" data-user-logout>로그아웃</button></div></section></main>`);
  }

  return pageShell(`<main class="subpage auth-wrap"><section class="auth-card member-auth-card"><span class="eyebrow">MEMBER LOGIN</span><h1>정참시 로그인</h1><p>로그인하면 글쓰기, 정치인 즐겨찾기, 최근 본 정치인, 좋아요·댓글, 설문 참여를 사용할 수 있습니다.</p><form class="auth-form" data-user-login><label>아이디<input name="id" autocomplete="username" required></label><label>비밀번호<input type="password" name="password" autocomplete="current-password" required></label><button class="primary-btn" type="submit">로그인</button><button class="ghost-btn" type="button" data-go="/join">회원가입</button><div class="auth-error" data-user-auth-error></div></form><div class="preview-credential-note">Preview 확인용 일반회원<br><b>${PREVIEW_USER_ID}</b> / <b>${PREVIEW_USER_PASSWORD}</b></div></section></main>`);
}

export async function renderJoin() {
  const session = getUserSession();
  if (session.authenticated) return renderMyPage();
  return pageShell(`<main class="subpage"><section class="content-card member-join-card"><span class="eyebrow">JOIN</span><h1>정참시 회원가입</h1><p>가입한 회원은 관리자 회원관리에서 확인할 수 있고, 관리자가 일반회원/관리자 권한을 변경할 수 있습니다.</p><form class="admin-form member-join-form" data-user-join><div class="admin-form-row"><label>아이디<input name="id" required placeholder="영문·숫자 4~24자"></label><label>닉네임<input name="nickname" placeholder="비워두면 아이디 사용"></label></div><div class="admin-form-row"><label>비밀번호<input type="password" name="password" required minlength="8"></label><label>비밀번호 확인<input type="password" name="passwordConfirm" required minlength="8"></label></div><div class="admin-form-row"><label>전화번호<input name="phone" required placeholder="010-0000-0000"></label><label>이메일 · 선택<input type="email" name="email"></label></div><div class="admin-form-row"><label>지역<input name="region" required placeholder="예: 경기 화성시"></label><label>선호정당<select name="preferredParty" required><option value="">선택</option><option>더불어민주당</option><option>국민의힘</option><option>조국혁신당</option><option>개혁신당</option><option>진보당</option><option>기타/무당층</option></select></label></div><div class="auth-error" data-user-auth-error></div><div class="admin-form-actions"><button class="primary-btn" type="submit">가입하고 시작</button><button class="ghost-btn" type="button" data-go="/login">로그인으로</button></div></form></section></main>`);
}

function personLabel(id) {
  const p = getPersonSlotById(id);
  return p ? `${p.roleLabel} #${String(p.slot).padStart(3, "0")}` : id;
}

function badgeList(activity) {
  const badges = [
    { name: "첫 참여", earned: Object.keys(activity.pollVotes || {}).length + activity.comments.length + (activity.authoredPosts || []).length > 0, desc: "첫 설문·댓글·글쓰기 참여" },
    { name: "의견 작성자", earned: activity.comments.length > 0, desc: "댓글을 한 번 이상 작성" },
    { name: "정책 제안자", earned: (activity.authoredPosts || []).some(x => x.startsWith("itsme:")), desc: "IT’S ME 정책 제안 작성" },
    { name: "관심 정치", earned: activity.favorites.length > 0, desc: "정치인 즐겨찾기 등록" }
  ];
  return badges;
}

export async function renderMyPage() {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const activity = getUserActivity();
  const user = session.user;

  return pageShell(`<main class="subpage"><section class="page-hero member-profile-hero"><span class="eyebrow">MY JEONGCHAMSI</span><h1>${esc(user.nickname || user.id)}님</h1><p>${esc(user.region || "지역 미설정")} · ${esc(user.preferredParty || "선호정당 미설정")} · ${user.role === "admin" ? "관리자" : "일반회원"}</p><div class="inline-actions" style="margin-top:14px">${user.role === "admin" ? `<button class="primary-btn" type="button" data-go="/admin">관리자 페이지</button>` : ""}<button class="ghost-btn" type="button" data-user-logout>로그아웃</button></div></section><section class="member-stat-grid"><article class="content-card"><small>즐겨찾기 정치인</small><strong>${activity.favorites.length}</strong><span>명</span></article><article class="content-card"><small>좋아요</small><strong>${activity.likedPosts.length}</strong><span>개</span></article><article class="content-card"><small>댓글</small><strong>${activity.comments.length}</strong><span>개</span></article><article class="content-card"><small>설문 참여</small><strong>${Object.keys(activity.pollVotes || {}).length}</strong><span>건</span></article></section><section class="mypage-menu-grid"><button type="button" data-go="/mypage/activity"><b>내 참여 · 배지</b><span>글·댓글·좋아요·설문·배지 보기 →</span></button><button type="button" data-go="/mypage/recent"><b>최근 본 정치인</b><span>최근 열어본 정치인 다시 보기 →</span></button></section><section class="content-card"><div class="section-title"><h2>즐겨찾기 정치인</h2><span>${activity.favorites.length}명</span></div>${activity.favorites.length ? `<div class="member-link-list">${activity.favorites.map(id => `<button type="button" data-go="/person/${esc(id)}"><b>${esc(personLabel(id))}</b><span>상세보기 →</span></button>`).join("")}</div>` : `<div class="empty-inline">정치인 상세페이지에서 ‘즐겨찾기’를 눌러보세요.</div>`}</section></main>`);
}

export async function renderMyActivity() {
  const session = getUserSession();
  if (!session.authenticated) return renderLogin();
  const activity = getUserActivity();
  const badges = badgeList(activity);
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">MY ACTIVITY</span><h1>내 참여 · 배지</h1><p>내가 정참시에서 남긴 참여 기록을 한곳에서 확인합니다.</p></section><section class="member-stat-grid"><article class="content-card"><small>작성 글</small><strong>${(activity.authoredPosts || []).length}</strong><span>개</span></article><article class="content-card"><small>댓글</small><strong>${activity.comments.length}</strong><span>개</span></article><article class="content-card"><small>좋아요</small><strong>${activity.likedPosts.length}</strong><span>개</span></article><article class="content-card"><small>설문</small><strong>${Object.keys(activity.pollVotes || {}).length}</strong><span>건</span></article></section><section class="content-card"><div class="section-title"><h2>내 배지</h2><span>${badges.filter(x => x.earned).length}개 획득</span></div><div class="badge-detail-grid">${badges.map(x => `<article class="${x.earned ? "earned" : ""}"><span>${x.earned ? "✓" : "○"}</span><div><b>${esc(x.name)}</b><p>${esc(x.desc)}</p></div></article>`).join("")}</div></section><section class="content-card"><div class="section-title"><h2>작성한 참여글</h2><span>${(activity.authoredPosts || []).length}개</span></div>${(activity.authoredPosts || []).length ? `<div class="member-link-list">${activity.authoredPosts.map(key => { const [domain, id] = key.split(":"); const route = domain === "itsme" ? "itsme" : "community"; return `<button type="button" data-go="/${route}/${esc(id)}"><b>${domain === "itsme" ? "IT’S ME" : "정뮤니티"}</b><span>${esc(id)} →</span></button>`; }).join("")}</div>` : `<div class="empty-inline">아직 직접 작성한 참여글이 없습니다.</div>`}</section></main>`);
}

export async function renderMyRecent() {
  const recent = getRecentPeople();
  return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">RECENT POLITICIANS</span><h1>최근 본 정치인</h1><p>로그인 전에도 이 브라우저에서 최근 본 정치인을 기억합니다. 로그인하면 계정 활동에 합쳐집니다.</p></section><section class="content-card"><div class="section-title"><h2>최근 본 목록</h2><span>${recent.length}명</span></div>${recent.length ? `<div class="recent-person-list">${recent.map((id, i) => `<button type="button" data-go="/person/${esc(id)}"><strong>${i + 1}</strong><span class="recent-person-avatar"></span><b>${esc(personLabel(id))}</b><em>상세보기 →</em></button>`).join("")}</div>` : `<div class="empty-state"><h2>아직 본 정치인이 없습니다.</h2><p>NOW Rank 전체 정치인에서 인물을 열어보면 이곳에 기록됩니다.</p><button class="primary-btn" type="button" data-go="/now">NOW Rank 보기</button></div>`}</section></main>`);
}
