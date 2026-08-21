import { pageShell, esc } from "./layout.js?v=alpha6.0.23-generation-home";
import { getUserSession, initializeUserState } from "../core/user.js";
import { getDomain, saveDomain, getStorageState, DEFAULT_ITSME_CATEGORIES } from "../core/repository.js";
import { uploadCoverImage, uploadProfileImage } from "../core/image.js";
import { PERSON_COUNTS, PERSON_PROVIDER_STATUS, PHOTO_PROVIDER_STATUS, listAllPoliticians } from "../data/person-provider.js?v=alpha6.0.20-function-detail";
import { APP_VERSION, BUILD_NAME } from "../version.js";

const TABS = [
  ["dashboard", "대시보드"], ["members", "회원관리"], ["people", "인물 관리"], ["president", "대통령"],
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
  if (!configured) return pageShell(`<main class="subpage"><section class="auth-card member-auth-card"><span class="eyebrow">FIRST ADMIN SETUP</span><h1>관리자 초기설정 준비</h1><p>첫 관리자 탈취를 막기 위해 Vercel 환경변수 <b>JCV3_ADMIN_SETUP_KEY</b>를 먼저 설정해야 합니다. 하드코딩된 관리자 계정이나 공개 Preview 계정은 사용하지 않습니다.</p><div class="notice-box">Vercel → Project Settings → Environment Variables에서 JCV3_ADMIN_SETUP_KEY에 임의의 긴 비밀문자열을 등록한 뒤 재배포하세요.</div></section></main>`);
  return pageShell(`<main class="subpage"><section class="auth-card member-auth-card"><span class="eyebrow">FIRST ADMIN SETUP</span><h1>첫 관리자 만들기</h1><p>현재 활성 관리자가 없을 때 한 번만 첫 관리자 계정을 생성할 수 있습니다. 환경변수에 등록한 초기설정 키가 필요합니다.</p><form class="auth-form" data-first-admin-setup><label>초기설정 키<input name="setupKey" type="password" required autocomplete="off"></label><label>관리자 아이디<input name="id" required minlength="4" maxlength="24"></label><label>관리자 닉네임<input name="nickname" maxlength="40"></label><label>비밀번호<input name="password" type="password" required minlength="8"></label><label>비밀번호 확인<input name="passwordConfirm" type="password" required minlength="8"></label><div class="auth-error" data-admin-setup-error></div><button class="primary-btn" type="submit">첫 관리자 생성</button></form></section></main>`);
}
function adminLoginView() {
  return pageShell(`<main class="subpage"><section class="auth-card member-auth-card"><span class="eyebrow">ADMIN ACCESS</span><h1>관리자 로그인 필요</h1><p>관리자도 일반회원과 동일한 로그인·세션 구조를 사용합니다. 관리자 권한을 받은 계정으로 로그인한 뒤 다시 들어오세요.</p><button class="primary-btn" type="button" data-go="/login">로그인</button></section></main>`);
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
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>v3 운영 대시보드</h2><button type="button" class="ghost-btn" data-user-logout>로그아웃</button></div><div class="admin-stat-grid"><article><b>MEMBERS</b><strong>${members.users.length}</strong><span>가입 회원</span></article><article><b>PERSON SLOTS</b><strong>543</strong><span>300 + 16 + 227</span></article><article><b>COLUMN</b><strong>${(columns.items || []).length}</strong><span>등록 글</span></article><article><b>COMMUNITY</b><strong>${(community.items || []).length}</strong><span>등록 글</span></article><article><b>IT’S ME</b><strong>${(itsme.items || []).length}</strong><span>정책 제안</span></article><article><b>NEWS</b><strong>${(news.items || []).length}</strong><span>등록 글</span></article><article><b>POLLS</b><strong>${(polls.items || []).length}</strong><span>등록 설문</span></article><article><b>ACADEMY</b><strong>${(academy.slots || []).length}</strong><span>등록 일정</span></article></div><div class="notice-box">서버 Source of Truth: ${storage.available ? "정상" : `오류 · ${esc(storage.error)}`}. 브라우저 저장 fallback은 사용하지 않습니다. PC·모바일·Fold 메인 레이아웃과 폰트는 LOCK 상태입니다.</div></section>`;
}
async function membersPanel() {
  const result = await fetchMembers();
  if (!result.ok) return `<section class="admin-panel"><h2>회원관리</h2><div class="notice-box">회원 데이터를 불러오지 못했습니다: ${esc(result.error)}</div></section>`;
  const users = result.users;
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>회원관리</h2><span class="status-pill"><b>MEMBERS</b>${users.length}명</span></div></div><div class="member-admin-note">가입 회원을 검색하고 일반회원 ↔ 관리자 권한, 정상 ↔ 이용정지 상태를 변경합니다. 마지막 활성 관리자는 시스템이 자동 보호합니다.</div><div class="member-admin-search"><input type="search" placeholder="이름 · 아이디 · 닉네임 · 지역 검색" data-member-search></div><div class="member-admin-list">${users.map(user => `<article data-member-row data-member-search-text="${esc(`${user.id} ${user.name || ""} ${user.nickname || ""} ${user.region || ""}`.toLowerCase())}"><div class="member-admin-profile"><b>${esc(user.name || user.nickname || user.id)}</b><span>${user.nickname ? `${esc(user.nickname)} · ` : ""}ID ${esc(user.id)} · ${esc(user.region || "지역 미설정")} · ${esc(user.preferredParty || "선호정당 미설정")}</span><small>가입 ${esc(String(user.createdAt || "").slice(0, 10))}</small></div><div class="member-access-controls"><label>권한<select data-member-role="${esc(user.id)}"><option value="member" ${user.role !== "admin" ? "selected" : ""}>일반회원</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>관리자</option></select></label><label>상태<select data-member-status="${esc(user.id)}"><option value="active" ${user.status !== "suspended" ? "selected" : ""}>정상</option><option value="suspended" ${user.status === "suspended" ? "selected" : ""}>이용정지</option></select></label><button class="primary-btn" type="button" data-member-access="${esc(user.id)}">변경 저장</button></div></article>`).join("")}</div><div class="save-state" data-member-save-state></div></section>`;
}
function peoplePanel() {
  return `<section class="admin-panel"><h2>인물 관리</h2><div class="people-admin-grid"><article><b>국회의원</b><strong>${PERSON_COUNTS.assembly} / 300</strong><span>텍스트 연결</span></article><article><b>광역단체장</b><strong>${PERSON_COUNTS.metropolitan} / 16</strong><span>텍스트 연결</span></article><article><b>기초단체장</b><strong>${PERSON_COUNTS.basic} / 227</strong><span>텍스트 연결</span></article><article><b>인물 공급자</b><strong>${PERSON_PROVIDER_STATUS}</strong><span>앱 내부 Seed · 즉시 노출</span></article><article><b>사진 공급자</b><strong>${PHOTO_PROVIDER_STATUS}</strong><span>1차에서 제외</span></article><article><b>NOW ENGINE</b><strong>DEFERRED</strong><span>뉴스·키워드 후속</span></article></div><div class="notice-box">543개 전원 이름·정당·지역·직책·기본 임기 텍스트를 앱 내부에 저장했습니다. 사용자 페이지에서 외부 정치인 API 호출은 없습니다.</div></section>`;
}
function formButtons(domain) { return `<div class="admin-form-actions"><button type="submit" class="primary-btn">저장</button><button type="button" class="ghost-btn" data-admin-cancel data-domain="${domain}">취소</button><span class="save-state" data-save-state></span></div>`; }
function boardEditor(domain, item = null) {
  const hasImage = domain === "columns" || domain === "news";
  const cover = item?.coverImage || "";
  const imageHelp = domain === "columns" ? `<div class="image-help"><b>권장 대표이미지 1200×675px · 16:9</b><span>최소 800×450px · 원본 2MB 이하 권장. 업로드 시 WebP/JPEG로 자동 축소·압축하며 대표카드/상세 미리보기를 확인할 수 있습니다.</span></div>` : `<div class="image-help"><b>권장 1200×675px · 16:9</b><span>업로드 시 자동 최적화합니다.</span></div>`;
  return `<form class="admin-form" data-admin-form="${domain}" data-item-id="${esc(item?.id || "")}"><div class="admin-form-row"><label>제목<input name="title" value="${esc(item?.title || "")}" required maxlength="120"></label><label>작성자<input name="author" value="${esc(item?.author || "정참시")}" maxlength="40"></label></div>${domain === "community" ? `<label>말머리<input name="category" value="${esc(item?.category || "자유게시판")}" maxlength="60"></label>` : ""}<label>요약<input name="summary" value="${esc(item?.summary || "")}" maxlength="240" placeholder="메인 카드와 목록에 표시될 짧은 소개"></label>${hasImage ? `<label>대표사진<input type="file" accept="image/*" data-cover-input></label><div class="image-uploader"><div class="image-preview" data-cover-preview ${cover ? `style="background-image:url('${cover}')"` : ""}>${cover ? "" : "대표사진 미리보기"}</div>${imageHelp}</div>` : ""}<label>본문<textarea name="body" rows="12" required>${esc(item?.body || "")}</textarea></label><div class="admin-form-row"><label class="check"><input type="checkbox" name="published" ${item?.published === false ? "" : "checked"}> 외부 노출</label>${domain === "columns" ? `<label class="check"><input type="checkbox" name="featured" ${item?.featured ? "checked" : ""}> 메인 대표 COLUMN 우선노출</label>` : "<span></span>"}</div>${formButtons(domain)}</form>`;
}
async function boardPanel(domain, edit) {
  const name = BOARD_NAMES[domain]; const data = await getDomain(domain); const items = data.items || [];
  const editing = edit === "new" ? {} : items.find(x => String(x.id) === String(edit)); const route = domain === "columns" ? "column" : domain;
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>${name}</h2><span class="status-pill"><b>POSTS</b>${items.length}개</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/${route}">외부 페이지</button><button class="primary-btn" type="button" data-admin-new="${domain}">새 글</button></div></div><div class="admin-list">${items.length ? items.map(x => `<article><div><b>${esc(x.title)}</b><span>${esc(x.author || "정참시")} · ${x.published === false ? "비노출" : "노출"}</span></div><div class="admin-list-actions"><button class="edit" type="button" data-admin-edit="${domain}" data-id="${esc(x.id)}">수정</button><button class="delete" type="button" data-admin-delete="${domain}" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") : `<div class="empty-inline">등록된 글이 없습니다.</div>`}</div>${edit ? `<div class="admin-editor">${boardEditor(domain, editing || {})}</div>` : ""}</section>`;
}
async function itsmePanel() {
  const data = await getDomain("itsme");
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>IT’S ME</h2><button class="ghost-btn" type="button" data-go="/itsme">외부 페이지</button></div><form class="admin-form compact-admin-form" data-admin-form="itsme-settings"><label>말머리 관리<textarea name="categories" rows="5">${esc((data.categories || DEFAULT_ITSME_CATEGORIES).join("\n"))}</textarea></label>${formButtons("itsme")}</form><div class="admin-list">${(data.items || []).map(x => `<article><div><b>${esc(x.title)}</b><span>${esc(x.category || "IT’S ME")} · ${esc(x.author || "회원")}</span></div><div class="admin-list-actions"><button class="delete" type="button" data-admin-delete="itsme" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") || `<div class="empty-inline">회원 제안이 아직 없습니다.</div>`}</div></section>`;
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
  return `<form class="admin-form" data-admin-form="polls" data-item-id="${esc(item.id || "")}"><label>질문<input name="question" required value="${esc(item.question || "")}" maxlength="180"></label><label>설명<input name="description" value="${esc(item.description || "")}" maxlength="240"></label><div class="admin-form-row"><label>투표 시작 · 선택<input type="datetime-local" name="startsAt" value="${esc(localDateTimeValue(item.startsAt || ""))}"></label><label>투표 종료 · 선택<input type="datetime-local" name="endsAt" value="${esc(localDateTimeValue(item.endsAt || ""))}"></label></div><div class="notice-box">시작·종료 시간을 비워두면 기간 제한 없이 진행됩니다. 종료시간은 시작시간보다 뒤여야 합니다.</div><label>선택지 1~10개<textarea name="options" rows="10" required placeholder="한 줄에 선택지 하나">${esc(opts.map(x => x.label || "").join("\n"))}</textarea></label><label class="check"><input type="checkbox" name="published" ${item.published === false ? "" : "checked"}> 공개</label>${formButtons("polls")}</form>`;
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
    headline:"정치의 꿈을 실제 준비로.",
    description:"정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳.",
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
    <div class="admin-list">${slots.length ? slots.map(x => `<article><div><b>${esc(x.date || "날짜 미정")} ${esc(x.startTime || "")}${x.endTime ? `–${esc(x.endTime)}` : ""} · ${esc(x.title)}</b><span>${x.status === "closed" || x.closed ? "마감" : x.status === "scheduled" ? "예정" : "신청가능"}</span></div><div class="admin-list-actions"><button class="edit" data-admin-edit="academy" data-id="${esc(x.id)}">수정</button><button class="delete" data-admin-delete="academy" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") : `<div class="empty-inline">아직 등록된 교육 일정이 없습니다.</div>`}</div>
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
async function presidentPanel() {
  const data = await getDomain("president"); const p = data.profile || {};
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>대통령 정보 구조</h2><span class="status-pill"><b>STRUCTURE</b>입력 준비 완료</span></div><button class="ghost-btn" data-go="/president">외부 페이지</button></div><div class="notice-box">실제 정보 입력은 나중에 해도 됩니다. 아래 필드가 대통령 전용 데이터 저장구조의 기준입니다.</div><form class="admin-form" data-admin-form="president"><div class="admin-cover-layout"><div><label>대통령 프로필 사진<input type="file" accept="image/*" data-profile-input></label><p class="image-help">프로필 사진 권장: 세로형 3:4 · 900×1200px 내외. 업로드 시 브라우저에서 자동 최적화합니다.</p></div><div class="cover-preview profile-preview" data-profile-preview ${p.photo ? `style="background-image:url('${esc(p.photo)}')" data-profile-data="${esc(p.photo)}"` : ""}>${p.photo ? "" : "프로필 사진 미리보기"}</div></div><div class="admin-form-row"><label>이름<input name="name" value="${esc(p.name || "")}"></label><label>정당<input name="party" value="${esc(p.party || "")}"></label></div><div class="admin-form-row"><label>출생<input name="birth" value="${esc(p.birth || "")}"></label><label>최종학력<input name="education" value="${esc(p.education || "")}"></label></div><div class="admin-form-row"><label>취임일<input name="inauguratedAt" value="${esc(p.inauguratedAt || "")}"></label><label>임기<input name="term" value="${esc(p.term || "")}"></label></div><label>주요 경력 · 한 줄씩<textarea name="career" rows="6">${esc((data.career || []).join("\n"))}</textarea></label><label>선거 이력 · 한 줄씩<textarea name="elections" rows="5">${esc((data.elections || []).join("\n"))}</textarea></label><label>국정 비전<textarea name="vision" rows="5">${esc(data.vision || "")}</textarea></label><label>주요 정책 · 한 줄씩<textarea name="policies" rows="6">${esc((data.policies || []).join("\n"))}</textarea></label><label>핵심 공약 · 한 줄씩<textarea name="pledges" rows="6">${esc((data.pledges || []).join("\n"))}</textarea></label><label>국정과제 · 한 줄씩<textarea name="nationalTasks" rows="6">${esc((data.nationalTasks || []).join("\n"))}</textarea></label><label>공식 채널 · 한 줄씩<textarea name="channels" rows="4">${esc((data.channels || []).join("\n"))}</textarea></label>${formButtons("president")}</form></section>`;
}
async function generationPanel() {
  const data = await getDomain("generation");
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>세대가 뽑은 대통령</h2><button class="ghost-btn" data-go="/generation-president">외부 페이지</button></div><div class="notice-box">공개페이지에서는 543개 정치인 슬롯 전체에서 한 명을 선택해 투표할 수 있습니다. 아래 후보 제한 목록을 비워두면 전체 543명을 허용합니다.</div><form class="admin-form" data-admin-form="generation"><label class="check"><input type="checkbox" name="enabled" ${data.enabled === false ? "" : "checked"}> 투표 기능 활성</label><label>후보 제한 ID · 선택사항<textarea name="candidates" rows="8" placeholder="assembly-001&#10;metropolitan-001">${esc((data.candidates || []).join("\n"))}</textarea></label>${formButtons("generation")}</form></section>`;
}
async function nationalEvaluationPanel() {
  const data = await getDomain("nationalEvaluation");
  const assembly = listAllPoliticians().filter(x => x.type === "assembly");
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>국회의원 전국 평가제</h2><button class="ghost-btn" data-go="/national-evaluation">외부 페이지</button></div><div class="notice-box">국회의원 300개 Slot 중 현재 전국 평가 대상을 한 명 선택합니다. 실제 인물정보가 연결되기 전에는 Slot 번호로 기능을 검수합니다.</div><form class="admin-form" data-admin-form="nationalEvaluation"><label>현재 평가 대상<select name="subjectId"><option value="">대상 선택 전</option>${assembly.map(x => `<option value="${x.id}" ${x.id === data.subjectId ? "selected" : ""}>국회의원 ${String(x.slot).padStart(3, "0")}</option>`).join("")}</select></label><label class="check"><input type="checkbox" name="enabled" ${data.enabled ? "checked" : ""}> 전국 평가 참여 활성</label>${formButtons("national")}</form></section>`;
}
async function systemPanel() {
  let health = { storage: "unknown", blob: "unknown" };
  try {
    const response = await fetch("/api/v3/health", { credentials: "same-origin", cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok) health = body;
  } catch {}
  return `<section class="admin-panel"><h2>시스템</h2><dl class="info-list"><div><dt>버전</dt><dd>${APP_VERSION}</dd></div><div><dt>빌드</dt><dd>${BUILD_NAME}</dd></div><div><dt>메인 Layout CSS</dt><dd>LOCKED</dd></div><div><dt>콘텐츠 저장</dt><dd>${health.storage === "ready" ? "Redis 정상" : "확인 필요"}</dd></div><div><dt>이미지 저장</dt><dd>${health.blob === "ready" ? "Vercel Blob 정상" : "Vercel Blob 연결 필요"}</dd></div><div><dt>Browser fallback</dt><dd>NONE · 비회원 최근본/화면모드만 localStorage</dd></div><div><dt>V2 runtime</dt><dd>NONE</dd></div></dl>${health.blob === "ready" ? "" : `<div class="notice-box">COLUMN·NEWS 대표사진 업로드를 사용하려면 Vercel 프로젝트에 Blob Store와 BLOB_READ_WRITE_TOKEN이 연결되어 있어야 합니다.</div>`}</section>`;
}

export async function renderAdmin() {
  const session = getUserSession();
  if (!session.authenticated || session.user?.role !== "admin") {
    const setup = await setupStatus();
    return setup.needed ? setupView(setup.setupKeyConfigured === true) : adminLoginView();
  }
  const { tab, edit } = params();
  let panel;
  if (tab === "members") panel = await membersPanel();
  else if (tab === "people") panel = peoplePanel();
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
  return pageShell(`<main class="subpage admin-page"><section class="page-hero"><span class="eyebrow">ADMIN · V3 CLEAN CORE</span><h1>정참시 관리자</h1><p>회원·콘텐츠·참여기능을 동일한 서버 Source of Truth에서 관리합니다.</p></section>${adminTabs(tab)}${panel}</main>`);
}

export async function prepareCoverPreview(file, previewEl) {
  const data = await uploadCoverImage(file);
  if (previewEl) { previewEl.style.backgroundImage = `url('${data}')`; previewEl.textContent = ""; previewEl.dataset.coverData = data; }
  return data;
}
export async function prepareProfilePreview(file, previewEl) {
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
  if (domain === "generation") { const data = await getDomain("generation"); data.enabled = fd.get("enabled") === "on"; data.candidates = splitLines(fd.get("candidates")).filter(id => /^(assembly|metropolitan|basic)-\d{3}$/.test(id)).slice(0, 543); return saveDomain("generation", data); }
  if (domain === "nationalEvaluation") { const data = await getDomain("nationalEvaluation"); const subjectId = String(fd.get("subjectId") || ""); const nextSubject = /^assembly-\d{3}$/.test(subjectId) ? subjectId : null; const previous = data.subjectId && data.subjectId !== nextSubject ? String(data.subjectId) : ""; data.history = Array.isArray(data.history) ? data.history : []; if (previous && !data.history.some(x => x.subjectId === previous)) data.history.unshift({ subjectId: previous, closedAt: new Date().toISOString() }); data.history = data.history.slice(0, 100); data.subjectId = nextSubject; data.enabled = fd.get("enabled") === "on" && !!data.subjectId; data.results = data.results || {}; return saveDomain("nationalEvaluation", data); }
  const data = await getDomain(domain); const id = form.dataset.itemId || `${domain}-${Date.now().toString(36)}`;
  if (["columns", "community", "news"].includes(domain)) { const list = data.items || []; const old = list.find(x => String(x.id) === String(id)); const cover = form.querySelector("[data-cover-preview]")?.dataset.coverData || old?.coverImage || ""; const next = { id, title: fd.get("title"), author: fd.get("author"), category: fd.get("category") || "", summary: fd.get("summary"), body: fd.get("body"), coverImage: cover, featured: fd.get("featured") === "on", published: fd.get("published") === "on", createdAt: old?.createdAt || now, updatedAt: now, likes: old?.likes || 0, views: old?.views || 0, ownerId: old?.ownerId || "" }; data.items = old ? list.map(x => x.id === id ? next : x) : [next, ...list]; }
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
export async function updateMemberAccess(id, role, status) {
  try { const r = await fetch("/api/v3/admin/users", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ id, role, status }) }); const b = await r.json().catch(() => ({})); return r.ok ? { ok: true } : { ok: false, error: b.error || "MEMBER_UPDATE_FAILED" }; }
  catch { return { ok: false, error: "MEMBER_UPDATE_FAILED" }; }
}
export async function submitFirstAdmin(form) {
  const fd = new FormData(form); if (fd.get("password") !== fd.get("passwordConfirm")) return { ok: false, error: "비밀번호 확인이 일치하지 않습니다." };
  try { const r = await fetch("/api/v3/setup", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ setupKey: fd.get("setupKey"), id: fd.get("id"), nickname: fd.get("nickname"), password: fd.get("password") }) }); const b = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, error: b.error || "SETUP_FAILED" }; await initializeUserState(); return { ok: true }; }
  catch { return { ok: false, error: "SETUP_FAILED" }; }
}
