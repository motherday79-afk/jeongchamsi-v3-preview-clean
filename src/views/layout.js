import { APP_VERSION, BUILD_NAME } from "../version.js";
import { getUserSession } from "../core/user.js";

export const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[c]));

const NAV = Object.freeze([
  { key:"now", label:"NOW Rank", href:"/now" },
  { key:"itsme", label:"IT’S ME", href:"/itsme" },
  { key:"column", label:"COLUMN", href:"/column" },
  { key:"news", label:"정참시 NEWS", href:"/news" },
  { key:"poll", label:"시민들의 선택", href:"/poll" },
  { key:"community", label:"정뮤니티", href:"/community" },
  { key:"compare", label:"비교분석", href:"/compare" }
]);

const MORE_NAV = Object.freeze([
  { key:"president", label:"대통령", href:"/president" },
  { key:"generation", label:"세대별 대통령", href:"/generation-president" },
  { key:"evaluation", label:"전국 평가제", href:"/national-evaluation" },
  { key:"academy", label:"아카데미", href:"/academy" }
]);

const DRAWER_QUICK = Object.freeze([
  { key:"now", label:"NOW Rank", href:"/now" },
  { key:"itsme", label:"IT’S ME", href:"/itsme" },
  { key:"news", label:"정참시 NEWS", href:"/news" },
  { key:"column", label:"COLUMN", href:"/column" },
  { key:"poll", label:"시민선택", href:"/poll" },
  { key:"community", label:"정뮤니티", href:"/community" },
  { key:"compare", label:"비교분석", href:"/compare" },
  { key:"president", label:"대통령", href:"/president" }
]);

function iconSvg(key = "") {
  const paths = {
    now:`<path d="M4 17 9 12l3 3 8-9"/><path d="M15 6h5v5"/>`,
    itsme:`<circle cx="12" cy="8" r="3"/><path d="M5.5 19c.8-4 3-6 6.5-6s5.7 2 6.5 6"/><path d="M18 4v4M16 6h4"/>`,
    column:`<path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>`,
    news:`<path d="M4 6h12v12H4z"/><path d="M8 9h5M8 12h5M8 15h3"/><path d="M16 9h4v8a1 1 0 0 1-1 1h-3"/>`,
    poll:`<path d="M5 19V9M12 19V5M19 19v-7"/><path d="M3 19h18"/>`,
    community:`<path d="M5 5h14v10H9l-4 4z"/><path d="M8 9h8M8 12h5"/>`,
    compare:`<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 19c.6-3.2 2.2-5 5-5s4.4 1.8 5 5M11 19c.6-3.2 2.2-5 5-5s4.4 1.8 5 5"/>`,
    president:`<path d="m12 3 2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.3-4.5 2.3.9-5L4.8 8.2l5-.7z"/>`,
    generation:`<path d="M4 18h16M6 15V9M12 15V5M18 15v-3"/><path d="m4 8 4-4 4 3 5-4 3 3"/>`,
    evaluation:`<path d="M5 4h14v16H5z"/><path d="m8 12 2.3 2.3L16 8"/><path d="M8 7h3"/>`,
    academy:`<path d="m3 8 9-4 9 4-9 4z"/><path d="M7 10v5c2.8 2 7.2 2 10 0v-5"/><path d="M21 8v6"/>`,
    keywords:`<path d="M6 5h12M4 10h16M7 15h10M9 20h6"/>`,
    trending:`<path d="m4 17 5-5 3 3 8-9"/><path d="M15 6h5v5"/>`,
    recent:`<path d="M12 8v5l3 2"/><circle cx="12" cy="12" r="9"/>`,
    badge:`<path d="M12 3 8 5v5c0 3 1.6 5.3 4 7 2.4-1.7 4-4 4-7V5z"/><path d="m9 18-1 3 4-2 4 2-1-3"/>`,
    guide:`<circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7h.01"/>`,
    privacy:`<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>`,
    policy:`<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 11h6M9 15h6"/>`,
    admin:`<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.5 1a7 7 0 0 0-1.7-1L14.4 3h-4.8l-.4 3.1a7 7 0 0 0-1.7 1l-2.5-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.5-1a7 7 0 0 0 1.7 1l.4 3.1h4.8l.4-3.1a7 7 0 0 0 1.7-1l2.5 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>`
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[key] || paths.guide}</svg>`;
}

function quickNavItem(item) {
  return `<a class="quick-nav-item quick-${esc(item.key)}" href="${item.href}" data-route><span class="quick-nav-icon">${iconSvg(item.key)}</span><span class="quick-nav-label">${esc(item.label)}</span></a>`;
}

function drawerQuickItem(item) {
  return `<a class="drawer-quick-item" href="${item.href}" data-route><span>${iconSvg(item.key)}</span><b>${esc(item.label)}</b></a>`;
}

function drawerListItem(key, label, href, meta = "") {
  return `<a class="drawer-list-item" href="${href}" data-route><span class="drawer-list-icon">${iconSvg(key)}</span><span><b>${esc(label)}</b>${meta ? `<small>${esc(meta)}</small>` : ""}</span><em>›</em></a>`;
}

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
        <label class="search-input-shell">
          <input name="q" aria-label="통합검색" placeholder=" ">
          <span class="search-brand-hint" aria-hidden="true"><b>정</b>치에 <b>참</b>여할 <b>시</b>간</span>
        </label>
        <button type="submit">검색</button>
      </form>
    </div>
    <nav class="service-nav" aria-label="주요 서비스">
      ${NAV.map(quickNavItem).join("")}
      <details class="service-more">
        <summary aria-label="메뉴 더보기" title="메뉴 더보기"><span class="quick-nav-icon quick-more-icon"><i></i><i></i><i></i></span><span class="quick-nav-label">더보기</span></summary>
        <div class="service-more-menu">${MORE_NAV.map(item => `<a href="${item.href}" data-route><span>${iconSvg(item.key)}</span><b>${esc(item.label)}</b></a>`).join("")}</div>
      </details>
    </nav>
  </header>`;
}

export function drawer() {
  const session = getUserSession();
  const account = session.authenticated
    ? `<div class="drawer-account drawer-account-live"><div class="drawer-account-copy"><b>${esc(session.user.nickname || session.user.id)}님</b><span>${session.user.role === "admin" ? "관리자 계정" : "정참시 회원"}</span></div><a class="drawer-account-arrow" href="/mypage" data-route aria-label="마이페이지">›</a></div>`
    : `<div class="drawer-account"><div class="drawer-account-copy"><b>로그인하세요</b><span>참여·투표·즐겨찾기·배지를 한곳에서 관리하세요.</span></div><a class="drawer-account-arrow" href="/login" data-route aria-label="로그인">›</a></div>`;

  const adminLink = session.authenticated && session.user?.role === "admin"
    ? drawerListItem("admin","관리자","/admin","콘텐츠·회원·아카데미 관리")
    : "";

  return `<div class="drawer-backdrop" data-drawer-close hidden></div>
  <aside class="app-drawer" data-drawer hidden aria-label="전체 메뉴" aria-hidden="true">
    <div class="drawer-head"><div><span>JEONGCHAMSI</span><b>정참시 전체메뉴</b></div><button type="button" data-drawer-close aria-label="닫기">×</button></div>
    ${account}

    <section class="drawer-block">
      <div class="drawer-block-head"><b>바로가기</b><span>자주 쓰는 정참시 서비스</span></div>
      <div class="drawer-quick-grid">${DRAWER_QUICK.map(drawerQuickItem).join("")}</div>
    </section>

    <section class="drawer-block">
      <div class="drawer-block-head"><b>참여 · 분석</b><span>직접 보고 선택하는 기능</span></div>
      <div class="drawer-feature-list">
        ${drawerListItem("generation","세대가 뽑은 대통령","/generation-president","세대별 모의투표")}
        ${drawerListItem("evaluation","국회의원 전국 평가제","/national-evaluation","전국 참여자 평가")}
        ${drawerListItem("keywords","실시간 정치키워드","/keywords","지금 많이 언급되는 정치어")}
        ${drawerListItem("trending","실시간 급상승","/trending","주목도가 빠르게 오른 콘텐츠")}
        ${drawerListItem("academy","정참시 아카데미","/academy","정치 교육 일정·수강신청")}
      </div>
    </section>

    <section class="drawer-block drawer-block-compact">
      <div class="drawer-block-head"><b>내 정참시</b><span>기록과 활동</span></div>
      <div class="drawer-mini-links">
        <a href="/mypage/activity" data-route>${iconSvg("badge")}<span><b>내 참여 · 배지</b><small>활동 기록 보기</small></span></a>
        <a href="/mypage/recent" data-route>${iconSvg("recent")}<span><b>최근 본 정치인</b><small>다시 찾아보기</small></span></a>
      </div>
    </section>

    <section class="drawer-block drawer-utility">
      <div class="drawer-block-head"><b>서비스 안내</b></div>
      <div class="drawer-utility-links">
        <a href="/guide" data-route>이용안내</a>
        <a href="/privacy" data-route>개인정보처리방침</a>
        <a href="/policy" data-route>운영정책</a>
        ${adminLink}
      </div>
    </section>

    <div class="drawer-version">${APP_VERSION}<span>${BUILD_NAME}</span></div>
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
