import { APP_VERSION, BUILD_NAME } from "../version.js";

export const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[c]));

export function siteHeader() {
  return `<header class="site-header">
    <div class="header-line">
      <button class="header-icon" type="button" aria-label="전체 메뉴" data-drawer-open>☰</button>
      <a class="brand" href="/" data-route>정참시</a>
      <div class="header-gap"></div>
      <button class="header-icon" type="button" aria-label="알림">○</button>
      <button class="header-icon" type="button" aria-label="즐겨찾기">☆</button>
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
      <a href="/#now">NOW Rank</a>
      <a href="/#itsme">IT’S ME</a>
      <a href="/#column">COLUMN</a>
      <a href="/#poll">시민들의 선택</a>
      <a href="/#community">정뮤니티</a>
      <a href="/#compare">비교분석</a>
      <a href="/#generation-president">세대별 대통령</a>
      <a href="/#national-eval">전국 평가제</a>
      <a href="/#academy">아카데미</a>
    </nav>
  </header>`;
}

export function drawer() {
  return `<div class="drawer-backdrop" data-drawer-close hidden></div>
  <aside class="app-drawer" data-drawer hidden aria-label="전체 메뉴">
    <div class="drawer-head"><b>정참시 전체메뉴</b><button type="button" data-drawer-close aria-label="닫기">×</button></div>
    <div class="drawer-section-label">정치인</div>
    <nav>
      <a href="/assembly" data-route>국회의원 · 300명</a>
      <a href="/local-leaders/metropolitan" data-route>광역단체장 · 16명</a>
      <a href="/local-leaders/basic" data-route>기초단체장 · 227명</a>
    </nav>
    <div class="drawer-section-label">콘텐츠</div>
    <nav>
      <a href="/now" data-route>NOW Rank</a>
      <a href="/column" data-route>COLUMN</a>
      <a href="/community" data-route>정뮤니티</a>
      <a href="/news" data-route>정참시 NEWS</a>
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
  return `<footer class="footer">
    <div><b>정참시</b><span>정치에 참여할 시간.</span></div>
    <div>이용안내 · 개인정보처리방침 · 운영정책</div>
  </footer>`;
}

export function pageShell(content) {
  return `<div class="site-shell">${siteHeader()}<div class="page-wrap">${content}</div>${footer()}${drawer()}</div>`;
}
