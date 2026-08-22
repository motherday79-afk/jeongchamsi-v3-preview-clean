import { pageShell, esc } from "./layout.js";
import { getUserSession } from "../core/user.js";
import { getPoliticianRequests, getPartnerApplications } from "../core/repository.js";
import { badgeGemSvg } from "../data/badge-catalog.js";

function dateLabel(v = "") {
  if (!v) return "";
  try { return new Intl.DateTimeFormat("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" }).format(new Date(v)); }
  catch { return ""; }
}
function requestStatus(status = "requested") {
  return ({ requested:["접수","requested"], reviewing:["정보 확인 중","reviewing"], completed:["입력완료","completed"] })[status] || ["접수","requested"];
}
function partnerStatus(status = "requested") {
  return ({ requested:["신청 접수","requested"], reviewing:["검토 중","reviewing"], approved:["PARTNER 승인","approved"], rejected:["신청 종료","rejected"] })[status] || ["신청 접수","requested"];
}

function politicianRequestList(items = [], isAdmin = false) {
  if (!items.length) return `<div class="empty-inline">아직 등록 요청이 없습니다. 찾는 정치인의 이름을 먼저 남겨주세요</div>`;
  return `<div class="request-thread-list">${items.map(item => {
    const [label, cls] = requestStatus(item.status);
    return `<article class="request-thread-item"><div class="request-thread-main"><span class="request-avatar">人</span><div><b>${esc(item.name)}</b><small>${dateLabel(item.createdAt)}${Number(item.requestCount || 1) > 1 ? ` · ${Number(item.requestCount)}명 요청` : ""}</small></div></div><div class="request-thread-status status-${cls}">${label}</div>${isAdmin ? `<div class="request-admin-actions"><button type="button" data-politician-request-status="reviewing" data-request-id="${esc(item.id)}">확인 중</button><button type="button" data-politician-request-status="completed" data-request-id="${esc(item.id)}">입력완료</button><button type="button" data-politician-request-status="requested" data-request-id="${esc(item.id)}">접수로</button></div>` : ""}</article>`;
  }).join("")}</div>`;
}

function partnerApplicationList(items = [], isAdmin = false) {
  if (!items.length) return `<div class="empty-inline">${isAdmin ? "접수된 파트너스 신청이 없습니다" : "아직 신청 기록이 없습니다"}</div>`;
  return `<div class="partner-application-list">${items.map(item => {
    const [label, cls] = partnerStatus(item.status);
    return `<article class="partner-application-card status-${cls}"><div class="partner-application-head"><div>${isAdmin ? `<b>${esc(item.nickname || item.applicantName || item.ownerId)}</b><small>ID ${esc(item.ownerId || "")} · ${esc(item.region || "지역 미설정")} · ${esc(item.contact || item.email || item.phone || "연락처 미입력")}</small>` : `<b>정참시 PARTNERS 신청</b><small>${dateLabel(item.createdAt)} · 관리자만 신청내용을 볼 수 있습니다</small>`}</div><span>${label}</span></div><div class="partner-secret-message"><span>🔒 ${isAdmin ? "비밀 신청 내용" : "내 비밀 신청"}</span><p>${esc(item.message || "")}</p></div>${item.reviewNote ? `<div class="partner-review-note"><b>관리자 메모</b><p>${esc(item.reviewNote)}</p></div>` : ""}${isAdmin ? `<div class="partner-review-controls"><input value="${esc(item.reviewNote || "")}" maxlength="500" placeholder="검토 메모 · 선택" data-partner-review-note="${esc(item.id)}"><button type="button" data-partner-status="reviewing" data-partner-id="${esc(item.id)}">검토 중</button><button class="approve" type="button" data-partner-status="approved" data-partner-id="${esc(item.id)}">PARTNER 승인</button><button type="button" data-partner-status="rejected" data-partner-id="${esc(item.id)}">종료</button></div>` : ""}</article>`;
  }).join("")}</div>`;
}

export async function renderPoliticianRequest() {
  const session = getUserSession();
  const result = await getPoliticianRequests();
  const items = result.items || [];
  const isAdmin = session.authenticated && session.user?.role === "admin";
  return pageShell(`<main class="subpage participation-request-page"><section class="page-hero"><span class="eyebrow">POLITICIAN REQUEST</span><h1>찾는 정치인이 없나요?</h1><p>등록되어 있지 않은 정치인의 이름을 남겨주세요. 정참시가 정보를 확인해 등록하면 ‘입력완료’로 표시합니다</p></section><section class="content-card request-compose-card"><div class="section-title"><h2>정치인 등록 요청</h2><span>이름만 남기면 됩니다</span></div>${session.authenticated ? `<form class="request-comment-form" data-politician-request-form><span class="request-avatar">人</span><input name="name" maxlength="60" required placeholder="예: 홍길동"><button class="primary-btn" type="submit">등록 요청</button><span class="save-state" data-politician-request-state></span></form>` : `<div class="member-login-prompt"><span>등록 요청은 로그인 후 남길 수 있습니다</span><button class="primary-btn" type="button" data-go="/login">로그인</button></div>`}</section><section class="content-card"><div class="section-title"><h2>등록 요청 현황</h2><span>${items.length}건</span></div>${politicianRequestList(items, isAdmin)}</section></main>`);
}

export async function renderPartners() {
  const session = getUserSession();
  if (!session.authenticated) return pageShell(`<main class="subpage"><section class="page-hero"><span class="eyebrow">JEONGCHAMSI PARTNERS</span><h1>정참시와 함께 콘텐츠를 만들어주세요</h1><p>파트너스 신청 내용은 본인과 관리자만 볼 수 있습니다</p></section><section class="content-card empty-state"><div class="partner-badge-hero">${badgeGemSvg("jungchamsi-partner")}</div><h2>로그인 후 파트너스에 신청할 수 있습니다</h2><button class="primary-btn" type="button" data-go="/login">로그인</button></section></main>`);
  const result = await getPartnerApplications();
  const items = result.items || [];
  const isAdmin = session.user?.role === "admin";
  const isPartner = session.user?.role === "partner";
  const hasPending = !isAdmin && items.some(x => ["requested","reviewing"].includes(x.status));
  return pageShell(`<main class="subpage partners-page"><section class="page-hero partners-hero"><span class="partner-badge-hero">${badgeGemSvg("jungchamsi-partner")}</span><div><span class="eyebrow">JEONGCHAMSI PARTNERS</span><h1>정참시 PARTNERS</h1><p>승인된 파트너는 COLUMN과 정참시 NEWS를 직접 작성하고, 자신이 작성한 글을 수정할 수 있습니다</p></div></section>${isPartner ? `<section class="content-card partner-approved-banner"><div>${badgeGemSvg("jungchamsi-partner")}<span><b>정참시 공식 PARTNER</b><p>현재 파트너 권한이 활성화되어 있습니다</p></span></div><div class="inline-actions"><button class="primary-btn" type="button" data-go="/column/write">COLUMN 작성</button><button class="ghost-btn" type="button" data-go="/news/write">NEWS 작성</button></div></section>` : ""}${!isAdmin && !isPartner ? `<section class="content-card"><div class="section-title"><h2>파트너스 신청</h2><span>🔒 관리자만 열람</span></div><p class="partner-apply-guide">본인이 누구인지, 어떤 분야에서 활동하는지, 정참시에서 어떤 콘텐츠를 만들고 싶은지 간단히 적어주세요</p>${hasPending ? `<div class="notice-box">이미 검토 중인 신청이 있습니다. 처리 결과가 나온 뒤 다시 신청할 수 있습니다</div>` : `<form class="partner-secret-form" data-partner-application-form><label>연락 가능한 정보 · 선택<input name="contact" maxlength="200" placeholder="이메일 · 전화 · SNS 등"></label><label>비밀 신청 내용<textarea name="message" rows="8" minlength="10" maxlength="3000" required placeholder="본인 소개 / 활동 분야 / 정참시에서 하고 싶은 일"></textarea></label><div class="partner-secret-notice">🔒 이 내용은 신청자 본인과 정참시 관리자만 볼 수 있습니다</div><div class="admin-form-actions"><button class="primary-btn" type="submit">파트너스 신청</button><span class="save-state" data-partner-application-state></span></div></form>`}</section>` : ""}<section class="content-card"><div class="section-title"><h2>${isAdmin ? "파트너스 신청 관리" : "내 신청 현황"}</h2><span>${items.length}건</span></div>${partnerApplicationList(items, isAdmin)}</section></main>`);
}

export async function renderParticipationAdminPanel() {
  const [requests, partners] = await Promise.all([getPoliticianRequests(), getPartnerApplications()]);
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>참여 요청 · PARTNERS</h2><span class="status-pill"><b>QUEUE</b>${(requests.items || []).length + (partners.items || []).length}건</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/request-politician">정치인 요청 페이지</button><button class="ghost-btn" type="button" data-go="/partners">PARTNERS 페이지</button></div></div><div class="participation-admin-grid"><section><div class="section-title"><h2>정치인 등록 요청</h2><span>${(requests.items || []).length}건</span></div>${politicianRequestList(requests.items || [], true)}</section><section><div class="section-title"><h2>파트너스 비밀 신청</h2><span>${(partners.items || []).length}건</span></div>${partnerApplicationList(partners.items || [], true)}</section></div></section>`;
}
