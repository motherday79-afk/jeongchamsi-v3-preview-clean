import { APP_VERSION, BUILD_NAME } from "../version.js";
import { getUserSession } from "../core/user.js";

export const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[c]));

const NAV = Object.freeze([
  ["대통령", "/president"],
  ["NOW Rank", "/now"],
  ["IT’S ME", "/itsme"],
  ["COLUMN", "/column"],
  ["정참시 NEWS", "/news"],
  ["시민들의 선택", "/poll"],
  ["정뮤니티", "/community"],
  ["비교분석", "/compare"],
  ["세대별 대통령", "/generation-president"],
  ["전국 평가제", "/national-evaluation"],
  ["아카데미", "/academy"]
]);

export function siteHeader() {
  return `<header class="site-header">
    <div class="header-line">
      <button class="header-icon header-menu-icon" type="button" aria-label="전체 메뉴" title="전체 메뉴" data-drawer-open>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <div class="header-gap"></div>
      <button class="header-icon header-bell-icon" type="button" aria-label="내 참여" title="내 참여" data-go="/mypage/activity">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
      </button>
      <button class="header-icon header-star-icon" type="button" aria-label="최근 본 정치인" title="최근 본 정치인" data-go="/mypage/recent">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>
      </button>
    </div>
    <div class="search-wrap">
      <form class="main-search" data-search-form>
        <button class="search-home-mark" type="button" aria-label="정참시 홈" title="홈으로" data-go="/">정</button>
        <input name="q" aria-label="통합검색" placeholder="정치인·정당·정책·NEWS·COLUMN 통합검색">
        <button type="submit">검색</button>
      </form>
    </div>
    <nav class="service-nav">
      ${NAV.map(([label, href]) => `<a href="${href}" data-route>${label}</a>`).join("")}
    </nav>
  </header>`;
}

export function drawer() {
  const session = getUserSession();
  const account = session.authenticated
    ? `<div class="drawer-account"><b>${esc(session.user.nickname || session.user.id)}님</b><span>${session.user.role === "admin" ? "관리자" : "일반회원"}</span><div><a href="/mypage" data-route>마이페이지</a>${session.user.role === "admin" ? `<a href="/admin" data-route>관리자</a>` : ""}</div></div>`
    : `<div class="drawer-account"><b>정참시에 참여하세요</b><span>로그인 후 글쓰기·투표·즐겨찾기를 사용할 수 있습니다.</span><div><a href="/login" data-route>로그인</a><a href="/join" data-route>회원가입</a></div></div>`;

  return `<div class="drawer-backdrop" data-drawer-close hidden></div>
  <aside class="app-drawer" data-drawer hidden aria-label="전체 메뉴">
    <div class="drawer-head"><b>정참시 전체메뉴</b><button type="button" data-drawer-close aria-label="닫기">×</button></div>
    ${account}
    <div class="drawer-section-label">정참시</div>
    <nav>
      <a href="/president" data-route>대통령</a>
      <a href="/now" data-route>NOW Rank · 전체 정치인</a>
      <a href="/column" data-route>COLUMN</a>
      <a href="/community" data-route>정뮤니티</a>
      <a href="/news" data-route>정참시 NEWS</a>
      <a href="/keywords" data-route>실시간 정치키워드</a>
      <a href="/trending" data-route>실시간 급상승</a>
      <a href="/poll" data-route>시민들의 선택</a>
      <a href="/itsme" data-route>IT’S ME</a>
      <a href="/compare" data-route>정치인 비교분석</a>
      <a href="/generation-president" data-route>세대가 뽑은 대통령</a>
      <a href="/national-evaluation" data-route>국회의원 전국 평가제</a>
      <a href="/academy" data-route>정참시 아카데미</a>
    </nav>
    <div class="drawer-section-label">운영</div>
    <nav><a href="/admin" data-route>관리자</a></nav>
    <div class="drawer-version">${APP_VERSION}<br>${BUILD_NAME}</div>
  </aside>`;
}

export function footer() {
  const touchUi = document.documentElement.classList.contains("jcv3-touch-ui");
  const desktopMode = document.documentElement.classList.contains("jcv3-force-desktop");
  const viewToggle = touchUi
    ? `<button type="button" class="footer-view-switch mobile-toggle" data-view-mode="${desktopMode ? "mobile" : "desktop"}">${desktopMode ? "모바일버전 보기" : "PC버전 보기"}</button>`
    : "";
  return `<footer class="footer"><div><b>정참시</b><span>정치에 참여할 시간</span></div><nav class="footer-links" aria-label="정참시 운영 안내"><a href="/guide" data-route>이용안내</a><a href="/privacy" data-route>개인정보처리방침</a><a href="/policy" data-route>운영정책</a></nav>${viewToggle}</footer>`;
}

export function pageShell(content) {
  return `<div class="site-shell">${siteHeader()}<div class="page-wrap">${content}</div>${footer()}${drawer()}</div>`;
}
