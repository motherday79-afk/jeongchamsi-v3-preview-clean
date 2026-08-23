import { APP_VERSION, BUILD_NAME } from "../version.js";
import { getUserSession } from "../core/user.js";
import { SERVICE_CATALOG, serviceIconSvg } from "../data/service-catalog.js";

export const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[c]));

function drawerServiceItem(item) {
  return `<a class="drawer-service-item drawer-service-${esc(item.key)} drawer-tone-${esc(item.tone || "teal")}" href="${item.href}" data-route><span class="drawer-service-icon">${serviceIconSvg(item.key)}</span><span class="drawer-service-copy"><b>${esc(item.label)}</b><small>${esc(item.description)}</small></span><em>→</em></a>`;
}

function iconSvg(key = "") { return serviceIconSvg(key); }

function drawerListItem(key, label, href, meta = "") {
  return `<a class="drawer-list-item" href="${href}" data-route><span class="drawer-list-icon">${iconSvg(key)}</span><span><b>${esc(label)}</b>${meta ? `<small>${esc(meta)}</small>` : ""}</span><em>›</em></a>`;
}

function liveBarCelebrations(items = []) {
  const rows=(Array.isArray(items)?items:[]).slice(0,6);
  return `<div class="live-community-celebrations" data-livebar-celebrations ${rows.length ? "" : "hidden"} aria-live="polite">${rows.map((item,i)=>`<span class="live-community-celebration ${i===0 ? "is-active" : ""}" data-livebar-celebration><b>${esc(item.nickname || "정참시민")}님께서</b><strong>${esc(item.badgeName || "배지")}</strong><em>배지를 획득하셨습니다.</em></span>`).join("")}</div>`;
}

export function siteHeader({ memberCount = null, liveBar = null, badgeCelebrations = null } = {}) {
  const session = getUserSession();
  const celebrationsEnabled = Array.isArray(badgeCelebrations);
  const config = { useActualCount:true, overrideCount:0, ...(liveBar || {}) };
  const hasActualMemberCount = memberCount !== null && memberCount !== undefined && memberCount !== "";
  const actual = hasActualMemberCount ? Number(memberCount) : NaN;
  const displayCount = config.useActualCount !== false
    ? (Number.isFinite(actual) ? Math.max(0, actual) : null)
    : Math.max(0, Number(config.overrideCount || 0));
  const countText = displayCount === null ? "…" : displayCount.toLocaleString("ko-KR");
  const adminEditor = session.authenticated && session.user?.role === "admin"
    ? `<details class="livebar-admin"><summary>관리</summary><form data-livebar-admin-form><label class="check"><input type="checkbox" name="useActualCount" ${config.useActualCount !== false ? "checked" : ""}> 실제 가입 회원수 사용</label><label>표시 인원<input type="number" name="overrideCount" min="0" step="1" value="${Math.max(0, Number(config.overrideCount || 0))}"></label><button class="ghost-btn" type="submit">저장</button><span class="save-state" data-livebar-admin-state></span></form></details>`
    : "";
  return `<header class="site-header product-header">
    <div class="product-head-main">
      <button class="product-menu" type="button" aria-label="전체 메뉴" data-drawer-open><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      <a class="product-wordmark" href="/" data-route aria-label="정참시 홈"><b>정참시</b><span>JEONGCHAMSI</span></a>
      <form class="product-search" data-search-form><input name="q" aria-label="통합검색" placeholder="정치인, 정당, 이슈를 검색하세요"><button type="submit" aria-label="검색"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg></button></form>
      <div class="product-account-tools"><button type="button" aria-label="내 참여" data-go="/mypage/activity"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg></button><button type="button" aria-label="최근 본 정치인" data-go="/mypage/recent"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg></button></div>
    </div>
    <div class="product-service-bar live-community-bar" data-livebar data-member-count="${displayCount === null ? "" : displayCount}" data-celebrations-enabled="${celebrationsEnabled ? "1" : "0"}">
      <div class="live-community-inner"><div class="live-community-count"><b data-livebar-count>${countText}</b><span>명이 정참시와 함께합니다</span></div>${liveBarCelebrations(celebrationsEnabled ? badgeCelebrations : [])}<div class="live-community-actions"><a class="live-community-cta is-active" href="/about" data-route data-livebar-cta="about">정참시 응원하기 <span>→</span></a><a class="live-community-cta" href="https://toon.at/donate/jungchamsi" target="_blank" rel="noopener noreferrer" data-livebar-cta="support">정참시 후원하기 <span>♡</span></a></div>${adminEditor}</div>
    </div>
  </header>`;
}

export function drawer() {
  const session = getUserSession();
  const account = session.authenticated
    ? `<div class="drawer-account drawer-account-live"><div class="drawer-account-copy"><b>${esc(session.user.nickname || session.user.id)}님</b><span>${session.user.role === "admin" ? "관리자 계정" : "정참시 회원"}</span></div><a class="drawer-account-arrow" href="/mypage" data-route aria-label="마이페이지">›</a></div>`
    : `<div class="drawer-account"><div class="drawer-account-copy"><b>로그인하세요</b><span>참여·투표·즐겨찾기·배지를 한곳에서 관리하세요</span></div><a class="drawer-account-arrow" href="/login" data-route aria-label="로그인">›</a></div>`;

  const adminLink = session.authenticated && session.user?.role === "admin"
    ? drawerListItem("admin","관리자","/admin","콘텐츠·회원·아카데미 관리")
    : "";

  return `<div class="drawer-backdrop" data-drawer-close hidden></div>
  <aside class="app-drawer" data-drawer hidden aria-label="전체 메뉴" aria-hidden="true">
    <div class="drawer-head"><div><span>JEONGCHAMSI</span><b>정참시 전체메뉴</b></div><button type="button" data-drawer-close aria-label="닫기">×</button></div>
    ${account}

    <section class="drawer-block drawer-service-block">
      <div class="drawer-block-head"><b>전체 서비스</b><span>메인 네비게이터와 같은 서비스 기준</span></div>
      <div class="drawer-service-grid">${SERVICE_CATALOG.map(drawerServiceItem).join("")}</div>
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
  return `<footer class="footer"><div><b>정참시</b><span>정치에 참여할 시간</span></div><nav class="footer-links" aria-label="정참시 운영 안내"><a href="/guide" data-route>이용안내</a><a href="/privacy" data-route>개인정보처리방침</a><a href="/policy" data-route>운영정책</a></nav></footer>`;
}

export function pageShell(content) {
  return `<div class="site-shell">${siteHeader()}<div class="page-wrap">${content}</div>${footer()}${drawer()}</div>`;
}
