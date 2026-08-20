import { APP_VERSION, BUILD_NAME } from "../version.js";

export function siteHeader() {
  return `
  <header class="site-header">
    <div class="header-line">
      <button class="header-icon" data-drawer-open aria-label="전체 메뉴">☰</button>
      <a class="brand" href="/" data-route="/">정참시</a>
      <div class="header-gap"></div>
      <button class="header-icon" aria-label="알림">○</button>
      <button class="header-icon" aria-label="즐겨찾기">☆</button>
    </div>
    <div class="search-wrap">
      <form class="main-search" data-search-form>
        <strong>정</strong>
        <input name="q" aria-label="통합검색" placeholder="정치인, 정당, 정책, COLUMN, 정뮤니티 검색">
        <button type="submit">검색</button>
      </form>
    </div>
    <nav class="service-nav">
      <a href="/#president">대통령</a>
      <a href="/now" data-route="/now">NOW Rank</a>
      <a href="/itsme" data-route="/itsme">IT’S ME</a>
      <a href="/column" data-route="/column">COLUMN</a>
      <a href="/poll" data-route="/poll">시민들의 선택</a>
      <a href="/community" data-route="/community">정뮤니티</a>
      <a href="/compare" data-route="/compare">비교분석</a>
      <a href="/generation-president" data-route="/generation-president">세대별 대통령</a>
      <a href="/national-evaluation" data-route="/national-evaluation">전국 평가제</a>
      <a href="/academy" data-route="/academy">아카데미</a>
    </nav>
  </header>`;
}

export function footer() {
  return `<footer class="footer"><div><b>정참시</b><span>정치에 참여할 시간.</span></div><div>이용안내 · 개인정보처리방침 · 운영정책</div></footer>`;
}

export function drawer() {
  return `<div class="drawer-backdrop" data-drawer-close hidden></div>
  <aside class="app-drawer" data-drawer hidden>
    <div class="drawer-head"><b>전체 기능</b><button data-drawer-close>×</button></div>
    <nav>
      <a data-route="/assembly">국회의원</a>
      <a data-route="/local-leaders">지방자치단체장</a>
      <a data-route="/now">NOW Rank</a>
      <a data-route="/column">COLUMN</a>
      <a data-route="/community">정뮤니티</a>
      <a data-route="/poll">시민들의 선택</a>
      <a data-route="/itsme">IT’S ME</a>
      <a data-route="/compare">비교분석</a>
      <a data-route="/generation-president">세대별 대통령</a>
      <a data-route="/national-evaluation">국회의원 전국 평가제</a>
      <a data-route="/academy">정참시 아카데미</a>
      <a data-route="/admin">관리자</a>
    </nav>
    <div class="drawer-version">${APP_VERSION}<br>${BUILD_NAME}</div>
  </aside>`;
}

export function pageShell(content, { className = "" } = {}) {
  return `<div class="site-shell">${siteHeader()}<div class="page-wrap ${className}">${content}</div>${footer()}${drawer()}</div>`;
}
