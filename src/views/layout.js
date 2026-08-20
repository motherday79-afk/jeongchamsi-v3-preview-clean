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
      <button class="header-icon" type="button" aria-label="전체 메뉴" data-drawer-open>☰</button>
      <a class="brand" href="/" data-route>정참시</a>
      <div class="header-gap"></div>
      <button class="header-icon" type="button" aria-label="내 참여" data-go="/mypage/activity">○</button>
      <button class="header-icon" type="button" aria-label="최근 본 정치인" data-go="/mypage/recent">☆</button>
    </div>
    <div class="search-wrap">
      <form class="main-search" data-search-form>
        <strong>정</strong>
        <input name="q" aria-label="통합검색" placeholder="정치인, 정당, 정책, COLUMN, 정뮤니티 검색">
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
  return `<footer class="footer"><div><b>정참시</b><span>정치에 참여할 시간.</span><button type="button" class="footer-view-switch mobile-pc" data-view-mode="desktop">PC버전 보기</button><button type="button" class="footer-view-switch desktop-return" data-view-mode="mobile">모바일버전 보기</button></div><div>이용안내 · 개인정보처리방침 · 운영정책</div></footer>`;
}

export function pageShell(content) {
  return `<div class="site-shell">${siteHeader()}<div class="page-wrap">${content}</div>${footer()}${drawer()}</div>`;
}
