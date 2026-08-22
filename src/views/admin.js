import { pageShell, esc } from "./layout.js";
import { getUserSession, initializeUserState } from "../core/user.js";
import { getDomain, saveDomain, getStorageState, DEFAULT_ITSME_CATEGORIES } from "../core/repository.js";
import { APP_VERSION, BUILD_NAME } from "../version.js";
import { BADGE_CATALOG, badgeGemSvg, badgeByKey } from "../data/badge-catalog.js";

const TABS = [
  ["dashboard", "대시보드"], ["brand", "메인 타이틀"], ["members", "회원관리"], ["requests", "요청 · PARTNERS"], ["people", "인물 관리"], ["nowdata", "NOW 데이터"], ["president", "대통령"],
  ["columns", "COLUMN"], ["community", "정뮤니티"], ["itsme", "IT’S ME"], ["news", "정참시 NEWS"],
  ["polls", "시민들의 선택"], ["keywords", "정치키워드"], ["trending", "실시간 급상승"],
  ["generation", "세대별 대통령"], ["national", "전국평가"], ["academy", "아카데미"], ["system", "시스템"]
];
const BOARD_NAMES = { columns: "COLUMN", community: "정뮤니티", news: "정참시 NEWS" };
function params() { const p = new URLSearchParams(location.search); return { tab: p.get("tab") || "dashboard", edit: p.get("edit") || "" }; }
function adminTabs(active) { return `<nav class="admin-tabs">${TABS.map(([key, label]) => `<button type="button" class="${active === key ? "active" : ""}" data-admin-tab="${key}">${label}</button>`).join("")}</nav>`; }
async function setupStatus() {
  try { const r = await fetch("/api/v3/setup", { credentials: "same-origin", headers: { Accept: "application/json" } }); return await r.json(); }
  catch { return { ok: false, needed: false, error: "SETUP_STATUS_FAILED" }; }
}
function setupView(configured = false) {
  if (!configured) return pageShell(`<main class="subpage"><section class="auth-card member-auth-card"><span class="eyebrow">FIRST ADMIN SETUP</span><h1>관리자 초기설정 준비</h1><p>첫 관리자 탈취를 막기 위해 Vercel 환경변수 <b>JCV3_ADMIN_SETUP_KEY</b>를 먼저 설정해야 합니다. 하드코딩된 관리자 계정이나 공개 Preview 계정은 사용하지 않습니다</p><div class="notice-box">Vercel → Project Settings → Environment Variables에서 JCV3_ADMIN_SETUP_KEY에 임의의 긴 비밀문자열을 등록한 뒤 재배포하세요</div></section></main>`);
  return pageShell(`<main class="subpage"><section class="auth-card member-auth-card"><span class="eyebrow">FIRST ADMIN SETUP</span><h1>첫 관리자 만들기</h1><p>현재 활성 관리자가 없을 때 한 번만 첫 관리자 계정을 생성할 수 있습니다. 환경변수에 등록한 초기설정 키가 필요합니다</p><form class="auth-form" data-first-admin-setup><label>초기설정 키<input name="setupKey" type="password" required autocomplete="off"></label><label>관리자 아이디<input name="id" required minlength="4" maxlength="24"></label><label>관리자 닉네임<input name="nickname" maxlength="40"></label><label>비밀번호<input name="password" type="password" required minlength="8"></label><label>비밀번호 확인<input name="passwordConfirm" type="password" required minlength="8"></label><div class="auth-error" data-admin-setup-error></div><button class="primary-btn" type="submit">첫 관리자 생성</button></form></section></main>`);
}
function adminLoginView() {
  return pageShell(`<main class="subpage"><section class="auth-card member-auth-card"><span class="eyebrow">ADMIN ACCESS</span><h1>관리자 로그인 필요</h1><p>관리자도 일반회원과 동일한 로그인·세션 구조를 사용합니다. 관리자 권한을 받은 계정으로 로그인한 뒤 다시 들어오세요</p><button class="primary-btn" type="button" data-go="/login">로그인</button></section></main>`);
}
async function fetchMembers() {
  try {
    const r = await fetch("/api/v3/admin/users", { credentials: "same-origin", headers: { Accept: "application/json" } });
    const b = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, users: b.users || [] } : { ok: false, error: b.error || "MEMBER_READ_FAILED", users: [] };
  } catch { return { ok: false, error: "MEMBER_READ_FAILED", users: [] }; }
}
async function dashboardPanel() {
  const [columns, community, itsme, news, polls, academy, members] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("itsme"), getDomain("news"), getDomain("polls"), getDomain("academy"), fetchMembers()]);
  const storage = getStorageState();
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>v3 운영 대시보드</h2><button type="button" class="ghost-btn" data-user-logout>로그아웃</button></div><div class="admin-stat-grid"><article><b>MEMBERS</b><strong>${members.users.length}</strong><span>가입 회원</span></article><article><b>PERSON SLOTS</b><strong>543</strong><span>300 + 16 + 227</span></article><article><b>COLUMN</b><strong>${(columns.items || []).length}</strong><span>등록 글</span></article><article><b>COMMUNITY</b><strong>${(community.items || []).length}</strong><span>등록 글</span></article><article><b>IT’S ME</b><strong>${(itsme.items || []).length}</strong><span>정책 제안</span></article><article><b>NEWS</b><strong>${(news.items || []).length}</strong><span>등록 글</span></article><article><b>POLLS</b><strong>${(polls.items || []).length}</strong><span>등록 설문</span></article><article><b>ACADEMY</b><strong>${(academy.slots || []).length}</strong><span>등록 일정</span></article></div><div class="notice-box">서버 Source of Truth: ${storage.available ? "정상" : `오류 · ${esc(storage.error)}`}. 브라우저 저장 fallback은 사용하지 않습니다. PC·모바일·Fold 메인 레이아웃과 폰트는 LOCK 상태입니다</div></section>`;
}
async function membersPanel() {
  const result = await fetchMembers();
  if (!result.ok) return `<section class="admin-panel"><h2>회원관리</h2><div class="notice-box">회원 데이터를 불러오지 못했습니다: ${esc(result.error)}</div></section>`;
  const users = result.users;
  const now = Date.now();
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>회원관리</h2><span class="status-pill"><b>MEMBERS</b>${users.length}명</span></div></div><div class="member-admin-note">회원정보 수정, MEMBER · PARTNER · ADMIN 권한, 비밀번호 초기화, 기간제재를 한곳에서 관리합니다. 비밀번호 원문은 조회하지 않으며 관리자가 새 비밀번호를 지정하면 즉시 새 해시로 교체됩니다. 마지막 활성 관리자는 자동 보호됩니다</div><div class="member-admin-search"><input type="search" placeholder="이름 · 아이디 · 닉네임 · 지역 검색" data-member-search></div><div class="member-admin-list member-admin-expanded">${users.map(user => {
    const until = Date.parse(user.suspendedUntil || "");
    const suspended = user.status === "suspended" && (!Number.isFinite(until) || until > now);
    const suspensionText = suspended ? (Number.isFinite(until) ? `정지 ~ ${String(user.suspendedUntil).slice(0,10)}` : "무기한 정지") : "정상";
    const remainingDays = suspended && Number.isFinite(until) ? Math.max(1, Math.ceil((until - now) / 86400000)) : 0;
    const durationPreset = remainingDays <= 2 ? 2 : remainingDays <= 7 ? 7 : remainingDays <= 30 ? 30 : 0;
    return `<article data-member-row data-member-id="${esc(user.id)}" data-member-search-text="${esc(`${user.id} ${user.name || ""} ${user.nickname || ""} ${user.region || ""}`.toLowerCase())}">
      <div class="member-admin-profile"><b>${esc(user.name || user.nickname || user.id)}</b><span>ID ${esc(user.id)} · ${esc(user.region || "지역 미설정")} · ${esc(user.preferredParty || "선호정당 미설정")}</span><small>가입 ${esc(String(user.createdAt || "").slice(0,10))} · ${esc(suspensionText)}${user.suspensionReason ? ` · ${esc(user.suspensionReason)}` : ""}</small></div>
      <div class="member-edit-grid">
        <label>이름<input data-member-name="${esc(user.id)}" value="${esc(user.name || "")}" maxlength="40"></label>
        <label>닉네임<input data-member-nickname="${esc(user.id)}" value="${esc(user.nickname || "")}" maxlength="40"></label>
        <label>지역<input data-member-region="${esc(user.id)}" value="${esc(user.region || "")}" maxlength="80"></label>
        <label>선호정당<input data-member-party="${esc(user.id)}" value="${esc(user.preferredParty || "")}" maxlength="80"></label>
        <label>이메일<input type="email" data-member-email="${esc(user.id)}" value="${esc(user.email || "")}" maxlength="120"></label>
        <label>전화<input data-member-phone="${esc(user.id)}" value="${esc(user.phone || "")}" maxlength="40"></label>
        <label>출생연도<input inputmode="numeric" data-member-birth="${esc(user.id)}" value="${esc(user.birthYear || "")}" maxlength="4"></label>
        <label>새 비밀번호<input type="password" data-member-password="${esc(user.id)}" placeholder="변경할 때만 입력 · 8자 이상" autocomplete="new-password"></label>
      </div>
      <details class="member-badge-admin"><summary><span><b>배지 관리</b><small>관리자 직접 해금 · 현재 대표 ${esc(badgeByKey(user.representativeBadge)?.name || "미설정")}</small></span><em>${(user.grantedBadges || []).length}개 해금</em></summary><div class="member-badge-grid">${BADGE_CATALOG.map(badge => `<label class="member-badge-chip"><input type="checkbox" data-member-badge="${esc(user.id)}" value="${esc(badge.key)}" ${(user.grantedBadges || []).includes(badge.key) ? "checked" : ""}>${badgeGemSvg(badge.key)}<span><b>${esc(badge.name)}</b><small>${esc(badge.tier)}</small></span></label>`).join("")}</div><p class="field-help">조건을 달성하지 않은 배지도 관리자가 직접 열어줄 수 있습니다. 체크 해제 후 회원정보 저장 시 관리자 해금만 회수됩니다</p></details>
      <div class="member-access-controls member-access-expanded">
        <label>권한<select data-member-role="${esc(user.id)}"><option value="member" ${user.role === "member" || !user.role ? "selected" : ""}>일반회원</option><option value="partner" ${user.role === "partner" ? "selected" : ""}>정참시 PARTNER</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>관리자</option></select></label>
        <label>상태<select data-member-status="${esc(user.id)}"><option value="active" ${!suspended ? "selected" : ""}>정상</option><option value="suspended" ${suspended ? "selected" : ""}>이용정지</option></select></label>
        <label>정지기간<select data-member-days="${esc(user.id)}"><option value="0" ${suspended && !Number.isFinite(until) ? "selected" : ""}>무기한</option><option value="2" ${durationPreset===2 ? "selected" : ""}>2일</option><option value="7" ${durationPreset===7 ? "selected" : ""}>7일</option><option value="30" ${durationPreset===30 ? "selected" : ""}>30일</option></select></label>
        <label class="member-reason">제재 사유<input data-member-reason="${esc(user.id)}" value="${esc(user.suspensionReason || "")}" maxlength="200" placeholder="선택 입력"></label>
        <button class="primary-btn" type="button" data-member-access="${esc(user.id)}">회원정보 저장</button>
      </div>
    </article>`;
  }).join("")}</div><div class="save-state" data-member-save-state></div></section>`;
}
async function peoplePanel() {
  const { PERSON_COUNTS, PERSON_PROVIDER_STATUS, PHOTO_PROVIDER_STATUS } = await import("../data/person-meta.js");
  return `<section class="admin-panel"><h2>인물 관리</h2><div class="people-admin-grid"><article><b>국회의원</b><strong>${PERSON_COUNTS.assembly} / 300</strong><span>텍스트 연결</span></article><article><b>광역단체장</b><strong>${PERSON_COUNTS.metropolitan} / 16</strong><span>텍스트 연결</span></article><article><b>기초단체장</b><strong>${PERSON_COUNTS.basic} / 227</strong><span>텍스트 연결</span></article><article><b>인물 공급자</b><strong>${PERSON_PROVIDER_STATUS}</strong><span>앱 내부 Seed · 즉시 노출</span></article><article><b>사진 공급자</b><strong>${PHOTO_PROVIDER_STATUS}</strong><span>1차에서 제외</span></article><article><b>NOW ENGINE</b><strong>DEFERRED</strong><span>뉴스·키워드 후속</span></article></div><div class="notice-box">543개 전원 이름·정당·지역·직책·기본 임기 텍스트를 앱 내부에 저장했습니다. 사용자 페이지에서 외부 정치인 API 호출은 없습니다</div></section>`;
}
function formButtons(domain) { return `<div class="admin-form-actions"><button type="submit" class="primary-btn">저장</button><button type="button" class="ghost-btn" data-admin-cancel data-domain="${domain}">취소</button><span class="save-state" data-save-state></span></div>`; }
function boardEditor(domain, item = null) {
  const hasImage = domain === "columns" || domain === "news";
  const cover = item?.coverImage || "";
  const imageHelp = domain === "columns" ? `<div class="image-help"><b>권장 대표이미지 1200×675px · 16:9</b><span>최소 800×450px · 원본 2MB 이하 권장. 업로드 시 WebP/JPEG로 자동 축소·압축하며 대표카드/상세 미리보기를 확인할 수 있습니다</span></div>` : `<div class="image-help"><b>권장 1200×675px · 16:9</b><span>업로드 시 자동 최적화합니다</span></div>`;
  return `<form class="admin-form" data-admin-form="${domain}" data-item-id="${esc(item?.id || "")}"><div class="admin-form-row"><label>제목<input name="title" value="${esc(item?.title || "")}" required maxlength="120"></label><label>작성자<input name="author" value="${esc(item?.author || "정참시")}" maxlength="40"></label></div>${domain === "community" ? `<label>말머리<input name="category" value="${esc(item?.category || "자유게시판")}" maxlength="60"></label>` : ""}<label>요약<input name="summary" value="${esc(item?.summary || "")}" maxlength="240" placeholder="메인 카드와 목록에 표시될 짧은 소개"></label>${hasImage ? `<label>대표사진<input type="file" accept="image/*" data-cover-input></label><div class="image-uploader"><div class="image-preview" data-cover-preview ${cover ? `style="background-image:url('${cover}')"` : ""}>${cover ? "" : "대표사진 미리보기"}</div>${imageHelp}</div>` : ""}<label>본문<textarea name="body" rows="12" required>${esc(item?.body || "")}</textarea></label><div class="admin-form-row"><label class="check"><input type="checkbox" name="published" ${item?.published === false ? "" : "checked"}> 외부 노출</label>${domain === "columns" ? `<label class="check"><input type="checkbox" name="featured" ${item?.featured ? "checked" : ""}> 메인 대표 COLUMN 우선노출</label>` : "<span></span>"}</div>${formButtons(domain)}</form>`;
}
async function boardPanel(domain, edit) {
  const name = BOARD_NAMES[domain]; const data = await getDomain(domain); const items = data.items || [];
  const editing = edit === "new" ? {} : items.find(x => String(x.id) === String(edit)); const route = domain === "columns" ? "column" : domain;
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>${name}</h2><span class="status-pill"><b>POSTS</b>${items.length}개</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/${route}">외부 페이지</button><button class="primary-btn" type="button" data-admin-new="${domain}">새 글</button></div></div><div class="admin-list">${items.length ? items.map(x => `<article><div><b>${esc(x.title)}</b><span>${esc(x.author || "정참시")} · ${x.published === false ? "비노출" : "노출"}</span></div><div class="admin-list-actions"><button class="edit" type="button" data-admin-edit="${domain}" data-id="${esc(x.id)}">수정</button><button class="delete" type="button" data-admin-delete="${domain}" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") : `<div class="empty-inline">등록된 글이 없습니다</div>`}</div>${edit ? `<div class="admin-editor">${boardEditor(domain, editing || {})}</div>` : ""}</section>`;
}
async function itsmePanel() {
  const data = await getDomain("itsme");
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>IT’S ME</h2><button class="ghost-btn" type="button" data-go="/itsme">외부 페이지</button></div><form class="admin-form compact-admin-form" data-admin-form="itsme-settings"><label>말머리 관리<textarea name="categories" rows="5">${esc((data.categories || DEFAULT_ITSME_CATEGORIES).join("\n"))}</textarea></label>${formButtons("itsme")}</form><div class="admin-list">${(data.items || []).map(x => `<article><div><b>${esc(x.title)}</b><span>${esc(x.category || "IT’S ME")} · ${esc(x.author || "회원")}</span></div><div class="admin-list-actions"><button class="delete" type="button" data-admin-delete="itsme" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") || `<div class="empty-inline">회원 제안이 아직 없습니다</div>`}</div></section>`;
}
async function pollsPanel() {
  const data = await getDomain("polls"); const items = data.items || [];
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>시민들의 선택</h2><button class="primary-btn" type="button" data-admin-new="polls">새 설문</button></div><div class="admin-list">${items.map(x => `<article><div><b>${esc(x.question)}</b><span>선택지 ${(x.options || []).length}개 · ${(x.options || []).reduce((sum, opt) => sum + Number(opt.votes || 0), 0)}명 참여 · ${x.published === false ? "비노출" : "노출"}</span></div><div class="admin-list-actions"><button class="edit" type="button" data-admin-edit="polls" data-id="${esc(x.id)}">수정</button><button class="delete" type="button" data-admin-delete="polls" data-id="${esc(x.id)}">삭제</button></div></article>`).join("")}</div>${params().edit ? pollEditor(items.find(x => x.id === params().edit) || {}) : ""}</section>`;
}
function localDateTimeValue(value = "") {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function pollEditor(item = {}) {
  const opts = item.options || [{ label: "" }, { label: "" }, { label: "" }];
  return `<form class="admin-form" data-admin-form="polls" data-item-id="${esc(item.id || "")}"><label>질문<input name="question" required value="${esc(item.question || "")}" maxlength="180"></label><label>설명<input name="description" value="${esc(item.description || "")}" maxlength="240"></label><div class="admin-form-row"><label>투표 시작 · 선택<input type="datetime-local" name="startsAt" value="${esc(localDateTimeValue(item.startsAt || ""))}"></label><label>투표 종료 · 선택<input type="datetime-local" name="endsAt" value="${esc(localDateTimeValue(item.endsAt || ""))}"></label></div><div class="notice-box">시작·종료 시간을 비워두면 기간 제한 없이 진행됩니다. 종료시간은 시작시간보다 뒤여야 합니다</div><label>선택지 1~10개<textarea name="options" rows="10" required placeholder="한 줄에 선택지 하나">${esc(opts.map(x => x.label || "").join("\n"))}</textarea></label><label class="check"><input type="checkbox" name="published" ${item.published === false ? "" : "checked"}> 공개</label>${formButtons("polls")}</form>`;
}
async function listEditorPanel(domain, title, max, placeholder) {
  const data = await getDomain(domain); const items = data.items || [];
  const lines = domain === "keywords" ? items.map(x => `${x.label}${x.delta ? ` | ${x.delta}` : ""}`) : items.map(x => `${x.title} | ${x.href || ""}`);
  return `<section class="admin-panel"><h2>${title}</h2><form class="admin-form" data-admin-form="${domain}-list"><label>최대 ${max}개 · 한 줄에 하나<textarea name="lines" rows="${max}" placeholder="${esc(placeholder)}">${esc(lines.join("\n"))}</textarea></label>${formButtons(domain)}</form></section>`;
}
async function academyPanel() {
  const data = await getDomain("academy");
  const config = {
    eyebrow:"JEONGCHAMSI ACADEMY",
    title:"정참시 아카데미",
    headline:"정치의 꿈을 실제 준비로",
    description:"정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳",
    cta:"수강 가능 일정 확인",
    ...(data.config || {})
  };
  const slots = (data.slots || []).slice().sort((a,b)=>`${a.date||""} ${a.startTime||""}`.localeCompare(`${b.date||""} ${b.startTime||""}`));
  const edit = params().edit;
  const old = edit && edit !== "new" ? slots.find(x => x.id === edit) : {};
  return `<section class="admin-panel">
    <div class="admin-panel-head"><div><h2>아카데미</h2><span class="status-pill"><b>MAIN</b>메인 문구 + 일정</span></div><button class="primary-btn" type="button" data-admin-new="academy">새 일정</button></div>
    <form class="admin-form academy-main-settings" data-admin-form="academy-settings">
      <div class="section-title"><h2>메인 아카데미 문구</h2><span>메인에 즉시 반영</span></div>
      <div class="admin-form-row"><label>영문 라벨<input name="eyebrow" maxlength="60" value="${esc(config.eyebrow)}"></label><label>섹션 제목<input name="title" maxlength="60" value="${esc(config.title)}" required></label></div>
      <label>강조 문구<input name="headline" maxlength="100" value="${esc(config.headline)}" required></label>
      <label>설명<textarea name="description" rows="3" maxlength="300" required>${esc(config.description)}</textarea></label>
      <label>버튼 문구<input name="cta" maxlength="60" value="${esc(config.cta)}" required></label>
      <div class="admin-form-actions"><button class="primary-btn" type="submit">메인 문구 저장</button><span class="save-state" data-save-state></span></div>
    </form>
    <div class="section-title top-gap"><h2>교육 일정</h2><span>${slots.length}개</span></div>
    <div class="admin-list">${slots.length ? slots.map(x => `<article><div><b>${esc(x.date || "날짜 미정")} ${esc(x.startTime || "")}${x.endTime ? `–${esc(x.endTime)}` : ""} · ${esc(x.title)}</b><span>${x.status === "closed" || x.closed ? "마감" : x.status === "scheduled" ? "예정" : "신청가능"}</span></div><div class="admin-list-actions"><button class="edit" data-admin-edit="academy" data-id="${esc(x.id)}">수정</button><button class="delete" data-admin-delete="academy" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") : `<div class="empty-inline">아직 등록된 교육 일정이 없습니다</div>`}</div>
    ${edit ? `<form class="admin-form" data-admin-form="academy" data-item-id="${esc(old?.id || "")}">
      <div class="section-title"><h2>${old?.id ? "일정 수정" : "새 일정"}</h2><span>날짜·시간 직접 설정</span></div>
      <div class="admin-form-row"><label>날짜<input type="date" name="date" value="${esc(old?.date || "")}" required></label><label>교육명<input name="title" maxlength="100" value="${esc(old?.title || "")}" required></label></div>
      <div class="admin-form-row"><label>시작시간<input type="time" name="startTime" value="${esc(old?.startTime || "")}" required></label><label>종료시간<input type="time" name="endTime" value="${esc(old?.endTime || "")}" required></label></div>
      <label>설명<input name="description" maxlength="240" value="${esc(old?.description || "")}"></label>
      <div class="admin-form-row"><label>상태<select name="status"><option value="open" ${(old?.status || (!old?.closed ? "open" : "")) === "open" ? "selected" : ""}>신청가능</option><option value="scheduled" ${old?.status === "scheduled" ? "selected" : ""}>예정</option><option value="closed" ${(old?.status === "closed" || old?.closed) ? "selected" : ""}>마감</option></select></label><label class="check"><input type="checkbox" name="published" ${old?.published === false ? "" : "checked"}> 메인/아카데미에 공개</label></div>
      ${formButtons("academy")}
    </form>` : ""}
  </section>`;
}
async function brandPanel() {
  const data = await getDomain("brand");
  const hero = {
    kicker:"정참시 — 정치에 참여할 시간",
    headline:"바라볼 때가 아닌, 행동할 때 정치가 시작됩니다",
    productHeadline:"정치를 보는 것에서 움직이는 것으로!",
    subline1:"알고, 비교하고, 선택하고, 평가하는 것",
    subline2:"한 사람의 작은 행동이 정치의 방향을 만듭니다",
    learnLabel:"정참시 더 알아보기",
    supportLabel:"정참시 후원하기",
    artImage:"",
    ...(data.hero || {})
  };
  const about = {
    title:"왜 정참시인가",
    intro:"정치는 선거일 하루에만 존재하지 않습니다. 우리의 일상과 선택, 지역과 미래를 매일 움직입니다",
    body:"",
    ...(data.about || {})
  };
  const support = {
    title:"정참시 후원하기",
    intro:"정치에 참여할 수 있는 더 나은 공간을 함께 만들어 주세요",
    body:"",
    note:"현재 후원 방법은 준비 중입니다",
    ...(data.support || {})
  };
  const liveBar = { useActualCount:true, overrideCount:0, ...(data.liveBar || {}) };
  const memberInfo = await fetchMembers();
  const actualMemberCount = memberInfo.users.length;
  const art = hero.artImage || "/assets/brand/hero-art.webp";
  return `<section class="admin-panel">
    <div class="admin-panel-head"><div><h2>메인 최상단 · 정참시 브랜드 타이틀</h2><span class="status-pill"><b>HERO</b>금싸라기 영역</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/">메인 보기</button><button class="ghost-btn" type="button" data-go="/about">더 알아보기 페이지</button></div></div>
    <div class="notice-box">기존 대통령 영역을 정참시 브랜드 선언 영역으로 교체했습니다. 대통령 페이지는 더보기 메뉴에서 그대로 유지됩니다</div>
    <form class="admin-form brand-admin-form" data-admin-form="brand-settings">
      <div class="section-title"><h2>상단 함께하는 사람 표시</h2><span>현재 가입 ${actualMemberCount.toLocaleString("ko-KR")}명</span></div>
      <div class="admin-form-row"><label class="check"><input type="checkbox" name="liveBarUseActual" ${liveBar.useActualCount !== false ? "checked" : ""}> 실제 가입 회원수 자동 사용</label><label>수동 표시 인원<input type="number" name="liveBarOverride" min="0" step="1" value="${Math.max(0,Number(liveBar.overrideCount||0))}"></label></div>
      <div class="section-title top-gap"><h2>메인 히어로 메인멘트</h2><span>현재 메인 첫 화면에 바로 반영</span></div>
      <label class="admin-hero-primary-copy">정치를 보는 것에서 움직이는 것으로 영역<textarea name="productHeadline" rows="2" maxlength="180" required>${esc(hero.productHeadline || "정치를 보는 것에서 움직이는 것으로!")}</textarea><small>느낌표·문장까지 입력한 그대로 메인 히어로에 표시됩니다</small></label>
      <div class="section-title top-gap"><h2>브랜드 상세 문구</h2><span>더 알아보기 페이지용</span></div>
      <label>상단 문구<input name="kicker" maxlength="100" value="${esc(hero.kicker)}"></label>
      <label>메인 문구<textarea name="headline" rows="3" maxlength="180" required>${esc(hero.headline)}</textarea></label>
      <label>서브 1<input name="subline1" maxlength="180" value="${esc(hero.subline1)}"></label>
      <label>서브 2<input name="subline2" maxlength="180" value="${esc(hero.subline2)}"></label>
      <div class="admin-form-row"><label>더 알아보기 버튼<input name="learnLabel" maxlength="60" value="${esc(hero.learnLabel)}"></label><label>후원 버튼<input name="supportLabel" maxlength="60" value="${esc(hero.supportLabel)}"></label></div>
      <label>히어로 비주얼 교체<input type="file" accept="image/*" data-cover-input></label>
      <div class="image-uploader"><div class="image-preview brand-art-preview" data-cover-preview ${art ? `style="background-image:url('${esc(art)}')"` : ""} data-cover-data="${esc(hero.artImage || "")}"></div><div class="image-help"><b>현재 확정 디자인 비주얼 사용 중</b><span>교체하지 않으면 기본 비주얼이 계속 사용됩니다. 업로드 시 Blob 이미지로 교체됩니다</span></div></div>
      <div class="section-title top-gap"><h2>정참시 더 알아보기</h2><span>/about</span></div>
      <label>페이지 제목<input name="aboutTitle" maxlength="100" value="${esc(about.title)}"></label>
      <label>도입문<textarea name="aboutIntro" rows="3" maxlength="600">${esc(about.intro)}</textarea></label>
      <label>본문<textarea name="aboutBody" rows="12" maxlength="12000">${esc(about.body)}</textarea></label>
      <div class="section-title top-gap"><h2>정참시 후원하기</h2><span>/support</span></div>
      <label>페이지 제목<input name="supportTitle" maxlength="100" value="${esc(support.title)}"></label>
      <label>도입문<textarea name="supportIntro" rows="3" maxlength="600">${esc(support.intro)}</textarea></label>
      <label>본문<textarea name="supportBody" rows="10" maxlength="12000">${esc(support.body)}</textarea></label>
      <label>후원 안내/준비 상태<textarea name="supportNote" rows="3" maxlength="1000">${esc(support.note)}</textarea></label>
      <div class="admin-form-actions"><button class="primary-btn" type="submit">메인·상세페이지 저장</button><span class="save-state" data-save-state></span></div>
    </form>
  </section>`;
}

async function presidentPanel() {
  const data = await getDomain("president"); const p = data.profile || {};
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>대통령 정보 구조</h2><span class="status-pill"><b>STRUCTURE</b>입력 준비 완료</span></div><button class="ghost-btn" data-go="/president">외부 페이지</button></div><div class="notice-box">실제 정보 입력은 나중에 해도 됩니다. 아래 필드가 대통령 전용 데이터 저장구조의 기준입니다</div><form class="admin-form" data-admin-form="president"><div class="admin-cover-layout"><div><label>대통령 프로필 사진<input type="file" accept="image/*" data-profile-input></label><p class="image-help">프로필 사진 권장: 세로형 3:4 · 900×1200px 내외. 업로드 시 브라우저에서 자동 최적화합니다</p></div><div class="cover-preview profile-preview" data-profile-preview ${p.photo ? `style="background-image:url('${esc(p.photo)}')" data-profile-data="${esc(p.photo)}"` : ""}>${p.photo ? "" : "프로필 사진 미리보기"}</div></div><div class="admin-form-row"><label>이름<input name="name" value="${esc(p.name || "")}"></label><label>정당<input name="party" value="${esc(p.party || "")}"></label></div><div class="admin-form-row"><label>출생<input name="birth" value="${esc(p.birth || "")}"></label><label>최종학력<input name="education" value="${esc(p.education || "")}"></label></div><div class="admin-form-row"><label>취임일<input name="inauguratedAt" value="${esc(p.inauguratedAt || "")}"></label><label>임기<input name="term" value="${esc(p.term || "")}"></label></div><label>주요 경력 · 한 줄씩<textarea name="career" rows="6">${esc((data.career || []).join("\n"))}</textarea></label><label>선거 이력 · 한 줄씩<textarea name="elections" rows="5">${esc((data.elections || []).join("\n"))}</textarea></label><label>국정 비전<textarea name="vision" rows="5">${esc(data.vision || "")}</textarea></label><label>주요 정책 · 한 줄씩<textarea name="policies" rows="6">${esc((data.policies || []).join("\n"))}</textarea></label><label>핵심 공약 · 한 줄씩<textarea name="pledges" rows="6">${esc((data.pledges || []).join("\n"))}</textarea></label><label>국정과제 · 한 줄씩<textarea name="nationalTasks" rows="6">${esc((data.nationalTasks || []).join("\n"))}</textarea></label><label>공식 채널 · 한 줄씩<textarea name="channels" rows="4">${esc((data.channels || []).join("\n"))}</textarea></label>${formButtons("president")}</form></section>`;
}
async function generationPanel() {
  const data = await getDomain("generation");
  const adminTools = await import("./generation-admin.js");
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>세대의 선택, 대통령</h2><span class="status-pill"><b>SYNC</b>어드민 · 메인 · 상세 공통 편집기</span></div><button class="ghost-btn" data-go="/generation-president">외부 페이지</button></div>${adminTools.renderGenerationAdminEditor(data, { context:"admin", open:true })}</section>`;
}
async function nationalEvaluationPanel() {
  const data = await getDomain("nationalEvaluation");
  const tools = await import("./national-evaluation-admin.js");
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>국회의원 전국 평가제</h2><span class="status-pill"><b>SYNC</b>어드민 · 메인 · 상세 공통 편집기</span></div><button class="ghost-btn" data-go="/national-evaluation">외부 페이지</button></div>${tools.renderNationalEvaluationAdminEditor(data, { context:"admin", open:true })}</section>`;
}

function num(v) { return Number(v || 0).toLocaleString("ko-KR"); }
function timeText(v) { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ko-KR", { hour12:false }); }
async function fetchNowDataStatus() {
  try {
    const r = await fetch("/api/v3/admin/now-data", { credentials:"same-origin", cache:"no-store", headers:{ Accept:"application/json" } });
    const b = await r.json().catch(() => ({}));
    return r.ok ? b : { ok:false, error:b.error || "NOW_STATUS_FAILED" };
  } catch { return { ok:false, error:"NOW_STATUS_FAILED" }; }
}
async function nowDataPanel() {
  const data = await fetchNowDataStatus();
  if (!data.ok) return `<section class="admin-panel"><h2>NOW 데이터 센터</h2><div class="notice-box">상태를 불러오지 못했습니다 · ${esc(data.error || "NOW_STATUS_FAILED")}</div></section>`;
  const draft = data.draft || null, summary = draft?.summary || { total:data.rosterTotal || 542, completed:0, success:0, partial:0, failed:0, remaining:data.rosterTotal || 542 };
  const pct = summary.total ? Math.min(100, Math.round(summary.completed / summary.total * 100)) : 0;
  const top30 = draft?.top30?.length ? draft.top30 : (data.current?.top30 || []);
  const ready = data.configured?.searchAds && data.configured?.news;
  const draftStatus = draft?.status || "대기";
  return `<section class="admin-panel now-data-center">
    <div class="admin-panel-head"><div><h2>NOW 데이터 센터</h2><span class="status-pill"><b>NAVER ONLY</b>PC·모바일 검색 + 네이버 뉴스</span></div></div>
    <div class="now-data-kpis">
      <article><span>수집 대상</span><strong>${num(data.rosterTotal)}</strong><small>실제 정치인</small></article>
      <article><span>네이버 검색량 연결</span><strong>${data.configured?.searchAds ? "READY" : "연결필요"}</strong><small>검색광고 API · PC/모바일</small></article>
      <article><span>네이버 뉴스 연결</span><strong>${data.configured?.news ? "READY" : "연결필요"}</strong><small>뉴스 검색 API · 6H/24H/7D</small></article>
      <article><span>최근 게시</span><strong>${data.current?.publishedAt ? timeText(data.current.publishedAt).slice(5,16) : "—"}</strong><small>${data.current?.draftId || "게시 전"}</small></article>
    </div>
    <div class="now-speed-note"><b>FAST REFRESH</b><span>10명 배치 · 브라우저 2개 워커 · 서버 배치당 5명 병렬 · 검색/뉴스 동시 호출</span></div>
    <div class="now-control-grid">
      <div class="now-weight-box"><b>NOW 미리보기 가중치</b><div><label>검색<input type="number" min="0" max="100" value="${esc(draft?.weights?.search ?? data.current?.weights?.search ?? 50)}" data-now-search-weight></label><label>뉴스<input type="number" min="0" max="100" value="${esc(draft?.weights?.news ?? data.current?.weights?.news ?? 50)}" data-now-news-weight></label></div><small>현재는 실제 542명 분포를 보기 위한 초기값입니다. 게시 전 결과를 보고 조정할 수 있습니다.</small></div>
      <div class="now-actions">
        <button class="primary-btn" type="button" data-now-refresh>전체 데이터 새로고침</button>
        <button class="ghost-btn" type="button" data-now-retry ${draft?.failedBatchIndexes?.length ? "" : "disabled"}>실패 항목만 다시 수집</button>
        <button class="ghost-btn" type="button" data-now-finalize ${draft && summary.completed === summary.total ? "" : "disabled"}>순위 다시 계산</button>
        <button class="primary-btn" type="button" data-now-publish ${draft?.status === "preview" ? "" : "disabled"}>현재 데이터로 게시</button>
      </div>
    </div>
    <div class="now-progress-card">
      <div class="now-progress-head"><b data-now-progress-label>${esc(draftStatus)}</b><span data-now-progress-count>${num(summary.completed)} / ${num(summary.total)}</span></div>
      <div class="now-progress"><i data-now-progress-bar style="width:${pct}%"></i></div>
      <div class="now-progress-stats"><span>정상 <b data-now-success>${num(summary.success)}</b></span><span>부분성공 <b data-now-partial>${num(summary.partial)}</b></span><span>실패 <b data-now-failed>${num(summary.failed)}</b></span><span>남음 <b data-now-remaining>${num(summary.remaining)}</b></span></div>
      <small data-now-live-state>${draft ? `시작 ${timeText(draft.startedAt)}${draft.finalizedAt ? ` · 계산 ${timeText(draft.finalizedAt)}` : ""}` : "새로고침을 실행하면 배치별 진행상태가 이곳에 표시됩니다."}</small>
    </div>
    ${!ready ? `<div class="notice-box">${!data.configured?.searchAds ? "네이버 검색량 연결 필요" : ""}${!data.configured?.searchAds && !data.configured?.news ? " · " : ""}${!data.configured?.news ? "네이버 뉴스 연결 필요" : ""}. 정참시는 이 두 데이터만 사용합니다.</div>` : ""}
    <div class="now-preview-head"><div><h3>새 순위 미리보기</h3><span>${draft?.status === "preview" ? "현재 수집 초안" : data.current ? "최근 게시 스냅샷" : "수집 전"}</span></div>${draft?.failedBatchIndexes?.length ? `<em>오류 포함 배치 ${draft.failedBatchIndexes.length}개</em>` : ""}</div>
    <div class="now-preview-table"><table><thead><tr><th>순위</th><th>정치인</th><th>NOW</th><th>PC</th><th>모바일</th><th>6H 뉴스</th><th>24H 뉴스</th><th>언론사</th><th>상태</th></tr></thead><tbody>${top30.length ? top30.map(row => `<tr><td><b>${row.rank}</b></td><td><strong>${esc(row.person?.name || "")}</strong><small>${esc(row.person?.party || "")} · ${esc(row.person?.office || "")}</small></td><td><b>${Number(row.score || 0).toFixed(1)}</b></td><td>${num(row.search?.monthlyPcQcCnt)}</td><td>${num(row.search?.monthlyMobileQcCnt)}</td><td>${num(row.news?.count6)}</td><td>${num(row.news?.count24)}</td><td>${num(row.news?.sources24)}</td><td><span class="now-row-state ${esc(row.state || "")}">${row.state === "success" ? "정상" : row.state === "partial" ? "부분" : "실패"}</span></td></tr>`).join("") : `<tr><td colspan="9"><div class="empty-inline">아직 계산된 스냅샷이 없습니다.</div></td></tr>`}</tbody></table></div>
  </section>`;
}

async function nowApi(body) {
  try {
    const r = await fetch("/api/v3/admin/now-data", { method:"POST", credentials:"same-origin", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body:JSON.stringify(body) });
    const b = await r.json().catch(() => ({}));
    return r.ok ? b : { ok:false, error:b.error || "NOW_API_FAILED", summary:b.summary, missingEnv:b.missingEnv, missingGroups:b.missingGroups, configured:b.configured, detail:b.detail };
  } catch { return { ok:false, error:"NOW_API_FAILED" }; }
}
function setNowProgress(done,total,label="수집 중") {
  const pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
  const bar = document.querySelector("[data-now-progress-bar]"); if (bar) bar.style.width = `${pct}%`;
  const count = document.querySelector("[data-now-progress-count]"); if (count) count.textContent = `${num(done)} / ${num(total)}`;
  const text = document.querySelector("[data-now-progress-label]"); if (text) text.textContent = label;
}
async function runBatchQueue({draftId,batchIndexes,total,batchSize,action}) {
  let cursor = 0, doneBatches = 0, firstError = "";
  const workers = Array.from({length:Math.min(2,batchIndexes.length || 1)}, async () => {
    while (true) {
      const at = cursor++; if (at >= batchIndexes.length) return;
      const batchIndex = batchIndexes[at];
      let r = await nowApi({ action, draftId, batchIndex });
      if (!r.ok) { await new Promise(resolve => setTimeout(resolve, 350)); r = await nowApi({ action, draftId, batchIndex }); }
      if (!r.ok && !firstError) firstError = r.error || "BATCH_FAILED";
      doneBatches++;
      setNowProgress(Math.min(total, doneBatches * batchSize), total, action === "retry-batch" ? "오류 재수집 중" : "네이버 데이터 수집 중");
      const state = document.querySelector("[data-now-live-state]"); if (state) state.textContent = `배치 ${doneBatches}/${batchIndexes.length} · 최근 처리 #${batchIndex + 1}${r.elapsedMs ? ` · ${(r.elapsedMs/1000).toFixed(1)}초` : ""}`;
    }
  });
  await Promise.all(workers); return firstError ? { ok:false, error:firstError } : { ok:true };
}
export async function runNowDataRefresh() {
  const searchWeight = Number(document.querySelector("[data-now-search-weight]")?.value || 50), newsWeight = Number(document.querySelector("[data-now-news-weight]")?.value || 50);
  const start = await nowApi({ action:"start", searchWeight, newsWeight }); if (!start.ok) return start;
  setNowProgress(0,start.total,"네이버 데이터 수집 시작");
  const queue = await runBatchQueue({draftId:start.draftId,batchIndexes:Array.from({length:start.batchCount},(_,i)=>i),total:start.total,batchSize:start.batchSize,action:"collect-batch"});
  if (!queue.ok) return queue;
  setNowProgress(start.total,start.total,"NOW 순위 계산 중");
  return nowApi({ action:"finalize", draftId:start.draftId });
}
export async function retryNowDataFailures() {
  const status = await fetchNowDataStatus(); if (!status.ok || !status.draft) return { ok:false, error:status.error || "NOW_DRAFT_NOT_FOUND" };
  const indexes = status.draft.failedBatchIndexes || []; if (!indexes.length) return { ok:true };
  const q = await runBatchQueue({draftId:status.draft.draftId,batchIndexes:indexes,total:indexes.length * (status.draft.batchSize || 10),batchSize:status.draft.batchSize || 10,action:"retry-batch"});
  if (!q.ok) return q;
  return nowApi({ action:"finalize", draftId:status.draft.draftId });
}
export async function finalizeNowData() { const status = await fetchNowDataStatus(); if (!status.ok || !status.draft) return {ok:false,error:"NOW_DRAFT_NOT_FOUND"}; return nowApi({ action:"finalize", draftId:status.draft.draftId }); }
export async function publishNowData() { const status = await fetchNowDataStatus(); if (!status.ok || !status.draft) return {ok:false,error:"NOW_DRAFT_NOT_FOUND"}; return nowApi({ action:"publish", draftId:status.draft.draftId }); }

async function systemPanel() {
  let health = { storage: "unknown", blob: "unknown" };
  try {
    const response = await fetch("/api/v3/health", { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok) health = body;
  } catch {}
  return `<section class="admin-panel"><h2>시스템</h2><dl class="info-list"><div><dt>버전</dt><dd>${APP_VERSION}</dd></div><div><dt>빌드</dt><dd>${BUILD_NAME}</dd></div><div><dt>메인 Layout CSS</dt><dd>LOCKED</dd></div><div><dt>콘텐츠 저장</dt><dd>${health.storage === "ready" ? "Redis 정상" : "확인 필요"}</dd></div><div><dt>이미지 저장</dt><dd>${health.blob === "ready" ? "Vercel Blob 정상" : "Vercel Blob 연결 필요"}</dd></div><div><dt>Browser fallback</dt><dd>NONE · 비회원 최근본/화면모드만 localStorage</dd></div><div><dt>V2 runtime</dt><dd>NONE</dd></div></dl>${health.blob === "ready" ? "" : `<div class="notice-box">COLUMN·NEWS 대표사진 업로드를 사용하려면 Vercel 프로젝트에 Blob Store와 BLOB_READ_WRITE_TOKEN이 연결되어 있어야 합니다</div>`}</section>`;
}

export async function renderAdmin() {
  const session = getUserSession();
  if (!session.authenticated || session.user?.role !== "admin") {
    const setup = await setupStatus();
    return setup.needed ? setupView(setup.setupKeyConfigured === true) : adminLoginView();
  }
  const { tab, edit } = params();
  let panel;
  if (tab === "brand") panel = await brandPanel();
  else if (tab === "members") panel = await membersPanel();
  else if (tab === "requests") panel = await (await import("./participation.js")).renderParticipationAdminPanel();
  else if (tab === "people") panel = await peoplePanel();
  else if (tab === "nowdata") panel = await nowDataPanel();
  else if (tab === "president") panel = await presidentPanel();
  else if (["columns", "community", "news"].includes(tab)) panel = await boardPanel(tab, edit);
  else if (tab === "itsme") panel = await itsmePanel();
  else if (tab === "polls") panel = await pollsPanel();
  else if (tab === "keywords") panel = await listEditorPanel("keywords", "실시간 정치키워드", 15, "정치키워드 | ▲2");
  else if (tab === "trending") panel = await listEditorPanel("trending", "실시간 급상승", 10, "제목 | /column/게시물ID");
  else if (tab === "generation") panel = await generationPanel();
  else if (tab === "national") panel = await nationalEvaluationPanel();
  else if (tab === "academy") panel = await academyPanel();
  else if (tab === "system") panel = await systemPanel();
  else panel = await dashboardPanel();
  return pageShell(`<main class="subpage admin-page"><section class="page-hero"><span class="eyebrow">ADMIN · V3 CLEAN CORE</span><h1>정참시 관리자</h1><p>회원·콘텐츠·참여기능을 동일한 서버 Source of Truth에서 관리합니다</p></section>${adminTabs(tab)}${panel}</main>`);
}

export async function prepareCoverPreview(file, previewEl) {
  const { uploadCoverImage } = await import("../core/image.js");
  const data = await uploadCoverImage(file);
  if (previewEl) { previewEl.style.backgroundImage = `url('${data}')`; previewEl.textContent = ""; previewEl.dataset.coverData = data; }
  return data;
}
export async function prepareProfilePreview(file, previewEl) {
  const { uploadProfileImage } = await import("../core/image.js");
  const data = await uploadProfileImage(file);
  if (previewEl) { previewEl.style.backgroundImage = `url('${data}')`; previewEl.textContent = ""; previewEl.dataset.profileData = data; }
  return data;
}
function splitLines(v) { return String(v || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean); }
export async function saveAdminForm(form) {
  const domain = form.dataset.adminForm; const fd = new FormData(form); const now = new Date().toISOString();
  if (domain === "itsme-settings") { const data = await getDomain("itsme"); data.categories = splitLines(fd.get("categories")).slice(0, 20); return saveDomain("itsme", data); }
  if (domain === "keywords-list") { const lines = splitLines(fd.get("lines")).slice(0, 15); return saveDomain("keywords", { items: lines.map((line, i) => { const [label, delta = ""] = line.split("|").map(x => x.trim()); return { id: `keyword-${i + 1}`, rank: i + 1, label, delta, published: true }; }) }); }
  if (domain === "trending-list") { const lines = splitLines(fd.get("lines")).slice(0, 10); return saveDomain("trending", { items: lines.map((line, i) => { const [title, href = ""] = line.split("|").map(x => x.trim()); return { id: `trending-${i + 1}`, rank: i + 1, title, href, published: true }; }) }); }
  if (domain === "president") { const current = await getDomain("president"); const photo = form.querySelector("[data-profile-preview]")?.dataset.profileData || current.profile?.photo || ""; const next = { ...current, profile: { ...current.profile, photo, name: fd.get("name"), party: fd.get("party"), birth: fd.get("birth"), education: fd.get("education"), inauguratedAt: fd.get("inauguratedAt"), term: fd.get("term") }, career: splitLines(fd.get("career")), elections: splitLines(fd.get("elections")), vision: String(fd.get("vision") || ""), policies: splitLines(fd.get("policies")), pledges: splitLines(fd.get("pledges")), nationalTasks: splitLines(fd.get("nationalTasks")), channels: splitLines(fd.get("channels")), updatedAt: now }; return saveDomain("president", next); }
  if (domain === "brand-settings") {
    const current = await getDomain("brand");
    const artImage = form.querySelector("[data-cover-preview]")?.dataset.coverData || current.hero?.artImage || "";
    const next = {
      ...current,
      liveBar: {
        useActualCount: fd.get("liveBarUseActual") === "on",
        overrideCount: Math.max(0, Math.round(Number(fd.get("liveBarOverride") || 0)))
      },
      hero: {
        kicker:String(fd.get("kicker") || "").trim(),
        headline:String(fd.get("headline") || "").trim(),
        productHeadline:String(fd.get("productHeadline") || "정치를 보는 것에서 움직이는 것으로!").trim(),
        subline1:String(fd.get("subline1") || "").trim(),
        subline2:String(fd.get("subline2") || "").trim(),
        learnLabel:String(fd.get("learnLabel") || "").trim(),
        supportLabel:String(fd.get("supportLabel") || "").trim(),
        artImage
      },
      about: {
        title:String(fd.get("aboutTitle") || "").trim(),
        intro:String(fd.get("aboutIntro") || "").trim(),
        body:String(fd.get("aboutBody") || "")
      },
      support: {
        title:String(fd.get("supportTitle") || "").trim(),
        intro:String(fd.get("supportIntro") || "").trim(),
        body:String(fd.get("supportBody") || ""),
        note:String(fd.get("supportNote") || "")
      },
      updatedAt:now
    };
    return saveDomain("brand", next);
  }
  if (domain === "academy-settings") {
    const data = await getDomain("academy");
    data.config = {
      eyebrow: String(fd.get("eyebrow") || "JEONGCHAMSI ACADEMY").trim().slice(0,60),
      title: String(fd.get("title") || "정참시 아카데미").trim().slice(0,60),
      headline: String(fd.get("headline") || "").trim().slice(0,100),
      description: String(fd.get("description") || "").trim().slice(0,300),
      cta: String(fd.get("cta") || "수강 가능 일정 확인").trim().slice(0,60)
    };
    return saveDomain("academy", data);
  }
  if (domain === "nationalEvaluation") { const data = await getDomain("nationalEvaluation"); const subjectId = String(fd.get("subjectId") || ""); const nextSubject = /^assembly-\d{3}$/.test(subjectId) ? subjectId : null; const previous = data.subjectId && data.subjectId !== nextSubject ? String(data.subjectId) : ""; data.history = Array.isArray(data.history) ? data.history : []; if (previous && !data.history.some(x => x.subjectId === previous)) data.history.unshift({ subjectId: previous, closedAt: new Date().toISOString() }); data.history = data.history.slice(0, 100); data.subjectId = nextSubject; data.enabled = fd.get("enabled") === "on" && !!data.subjectId; data.results = data.results || {}; return saveDomain("nationalEvaluation", data); }
  const data = await getDomain(domain); const id = form.dataset.itemId || `${domain}-${Date.now().toString(36)}`;
  if (["columns", "community", "news"].includes(domain)) { const list = data.items || []; const old = list.find(x => String(x.id) === String(id)); const cover = form.querySelector("[data-cover-preview]")?.dataset.coverData || old?.coverImage || ""; const next = { id, title: fd.get("title"), author: fd.get("author"), category: fd.get("category") || "", summary: fd.get("summary"), body: fd.get("body"), coverImage: cover, featured: fd.get("featured") === "on", published: fd.get("published") === "on", createdAt: old?.createdAt || now, updatedAt: now, likes: old?.likes || 0, views: old?.views || 0, ownerId: old?.ownerId || getUserSession().user?.id || "" }; data.items = old ? list.map(x => x.id === id ? next : x) : [next, ...list]; }
  else if (domain === "polls") { const list = data.items || []; const old = list.find(x => String(x.id) === String(id)); const oldVotes = Object.fromEntries((old?.options || []).map(x => [x.label, x.votes || 0])); const labels = splitLines(fd.get("options")).slice(0, 10); const startsRaw = String(fd.get("startsAt") || "").trim(); const endsRaw = String(fd.get("endsAt") || "").trim(); const startsAt = startsRaw ? new Date(startsRaw).toISOString() : ""; const endsAt = endsRaw ? new Date(endsRaw).toISOString() : ""; if (startsAt && endsAt && Date.parse(endsAt) <= Date.parse(startsAt)) return { ok: false, error: "POLL_END_MUST_BE_AFTER_START" }; const next = { id, question: fd.get("question"), description: fd.get("description"), options: labels.map((label, i) => ({ id: `${id}-o${i + 1}`, label, votes: oldVotes[label] || 0 })), published: fd.get("published") === "on", startsAt, endsAt, createdAt: old?.createdAt || now, updatedAt: now }; data.items = old ? list.map(x => x.id === id ? next : x) : [next, ...list]; }
  else if (domain === "academy") {
    const list = data.slots || [];
    const old = list.find(x => String(x.id) === String(id));
    const startTime = String(fd.get("startTime") || "").trim();
    const endTime = String(fd.get("endTime") || "").trim();
    if (startTime && endTime && endTime <= startTime) return { ok:false, error:"ACADEMY_END_MUST_BE_AFTER_START" };
    const status = ["open","scheduled","closed"].includes(String(fd.get("status") || "")) ? String(fd.get("status")) : "open";
    const next = { id, date: String(fd.get("date") || ""), startTime, endTime, title: String(fd.get("title") || "").trim(), description: String(fd.get("description") || "").trim(), status, published: fd.get("published") === "on", closed: status === "closed", createdAt: old?.createdAt || now, updatedAt: now };
    data.slots = old ? list.map(x => x.id === id ? next : x) : [next, ...list];
  }
  return saveDomain(domain, data);
}
export async function deleteAdminItem(domain, id) { const data = await getDomain(domain); if (domain === "academy") data.slots = (data.slots || []).filter(x => String(x.id) !== String(id)); else data.items = (data.items || []).filter(x => String(x.id) !== String(id)); return saveDomain(domain, data); }
export async function updateMemberAccess(id, patch = {}) {
  try {
    const r = await fetch("/api/v3/admin/users", { method:"PATCH", credentials:"same-origin", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body:JSON.stringify({ id, ...patch }) });
    const b = await r.json().catch(() => ({}));
    return r.ok ? { ok:true, user:b.user } : { ok:false, error:b.error || "MEMBER_UPDATE_FAILED" };
  } catch { return { ok:false, error:"MEMBER_UPDATE_FAILED" }; }
}
export async function submitFirstAdmin(form) {
  const fd = new FormData(form); if (fd.get("password") !== fd.get("passwordConfirm")) return { ok: false, error: "비밀번호 확인이 일치하지 않습니다" };
  try { const r = await fetch("/api/v3/setup", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ setupKey: fd.get("setupKey"), id: fd.get("id"), nickname: fd.get("nickname"), password: fd.get("password") }) }); const b = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, error: b.error || "SETUP_FAILED" }; await initializeUserState(); return { ok: true }; }
  catch { return { ok: false, error: "SETUP_FAILED" }; }
}
