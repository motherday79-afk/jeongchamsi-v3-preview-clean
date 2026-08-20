import { pageShell, esc } from "./layout.js";
import { getAdminSession, loginAdmin, logoutAdmin } from "../core/auth.js";
import { getDomain, saveDomain, getStoragePreviewState } from "../core/repository.js";
import { compressCoverImage } from "../core/image.js";
import { PERSON_COUNTS, PERSON_PROVIDER_STATUS, PHOTO_PROVIDER_STATUS } from "../data/person-provider.js";
import { APP_VERSION, BUILD_NAME } from "../version.js";

const TABS = [
  ["dashboard", "대시보드"],
  ["people", "인물 관리"],
  ["columns", "COLUMN"],
  ["community", "정뮤니티"],
  ["news", "정참시 NEWS"],
  ["polls", "시민들의 선택"],
  ["academy", "아카데미"],
  ["system", "시스템"]
];

const BOARD_NAMES = { columns: "COLUMN", community: "정뮤니티", news: "정참시 NEWS" };

function params() {
  const p = new URLSearchParams(location.search);
  return { tab: p.get("tab") || "dashboard", edit: p.get("edit") || "" };
}

function adminTabs(active) {
  return `<nav class="admin-tabs">${TABS.map(([key, label]) => `<button type="button" class="${active === key ? "active" : ""}" data-admin-tab="${key}">${label}</button>`).join("")}</nav>`;
}

function loginView() {
  return pageShell(`<main class="subpage"><div class="auth-wrap"><section class="auth-card"><span class="eyebrow">ADMIN LOGIN</span><h1>정참시 관리자</h1><p>콘텐츠 작성·수정·삭제와 운영 상태를 관리합니다.</p><form class="auth-form" data-admin-login><label>아이디<input name="id" autocomplete="username" required></label><label>비밀번호<input name="password" type="password" autocomplete="current-password" required></label><button class="primary-btn" type="submit">관리자 로그인</button><div class="auth-error" data-auth-error></div></form><div class="preview-credential-note">Preview 관리자: <b>admin</b> / <b>jcv3-2026!</b><br>실제 운영 전에는 Vercel 환경변수로 반드시 변경하세요.</div></section></div></main>`);
}

async function dashboardPanel(session) {
  const local = getStoragePreviewState();
  const [columns, community, news, polls, academy] = await Promise.all([getDomain("columns"), getDomain("community"), getDomain("news"), getDomain("polls"), getDomain("academy")]);
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>v3 운영 대시보드</h2><button type="button" class="ghost-btn" data-admin-logout>로그아웃</button></div><div class="admin-stat-grid"><article><b>PERSON SLOTS</b><strong>${PERSON_COUNTS.total}</strong><span>300 + 16 + 227</span></article><article><b>COLUMN</b><strong>${(columns.items || []).length}</strong><span>등록 글</span></article><article><b>COMMUNITY</b><strong>${(community.items || []).length}</strong><span>등록 글</span></article><article><b>NEWS</b><strong>${(news.items || []).length}</strong><span>등록 글</span></article><article><b>POLLS</b><strong>${(polls.items || []).length}</strong><span>등록 설문</span></article><article><b>ACADEMY</b><strong>${(academy.slots || []).length}</strong><span>등록 일정</span></article><article><b>LAYOUT</b><strong>LOCKED</strong><span>PC · Mobile · Fold</span></article><article><b>VERSION</b><strong>${APP_VERSION}</strong><span>${BUILD_NAME}</span></article></div><div class="notice-box">관리자 인증: ${esc(session.mode)} · ${local.length ? `브라우저 Preview 저장 사용 중 (${local.join(", ")})` : "서버 저장 우선"}. 정치인 실제 데이터는 의도적으로 0명입니다.</div></section>`;
}

function peoplePanel() {
  return `<section class="admin-panel"><h2>인물 관리</h2><div class="people-admin-grid"><article><b>국회의원</b><strong>${PERSON_COUNTS.assembly} / 300</strong><span>모든 슬롯·상세페이지 준비</span></article><article><b>광역단체장</b><strong>${PERSON_COUNTS.metropolitan} / 16</strong><span>모든 슬롯·상세페이지 준비</span></article><article><b>기초단체장</b><strong>${PERSON_COUNTS.basic} / 227</strong><span>모든 슬롯·상세페이지 준비</span></article><article><b>인물 데이터 공급자</b><strong>${PERSON_PROVIDER_STATUS}</strong><span>협의 후 연결</span></article><article><b>사진 공급자</b><strong>${PHOTO_PROVIDER_STATUS}</strong><span>협의 후 연결</span></article><article><b>NOW RANK ENGINE</b><strong>UNDECIDED</strong><span>별도 협의 후 연결</span></article></div><div class="notice-box">여기서는 실제 정치인 CRUD를 만들지 않습니다. 데이터 출처·정규화·사진·NOW Rank 방식을 확정한 뒤 543개 기존 슬롯에 같은 ID 체계로 연결합니다.</div></section>`;
}

function formButtons(domain) {
  return `<div class="admin-form-actions"><button type="submit" class="primary-btn">저장</button><button type="button" class="ghost-btn" data-admin-cancel data-domain="${domain}">취소</button><span class="save-state" data-save-state></span></div>`;
}

function boardEditor(domain, item = null) {
  const name = BOARD_NAMES[domain];
  const hasImage = domain === "columns" || domain === "news";
  const cover = item?.coverImage || "";
  return `<form class="admin-form" data-admin-form="${domain}" data-item-id="${esc(item?.id || "")}">
    <div class="admin-form-row"><label>제목<input name="title" value="${esc(item?.title || "")}" required maxlength="120"></label><label>작성자<input name="author" value="${esc(item?.author || "정참시")}" maxlength="40"></label></div>
    <label>요약<input name="summary" value="${esc(item?.summary || "")}" maxlength="240" placeholder="메인 카드와 목록에 표시될 짧은 소개"></label>
    ${hasImage ? `<label>대표사진<input type="file" accept="image/*" data-cover-input></label><div class="image-uploader"><div class="image-preview" data-cover-preview ${cover ? `style="background-image:url('${cover}')"` : ""}>${cover ? "" : "대표사진 미리보기"}</div><div class="image-help">업로드한 이미지는 브라우저에서 자동 축소·압축합니다. COLUMN 대표카드와 상세페이지에 같은 이미지를 사용합니다.<br>새 이미지를 선택하지 않으면 기존 이미지를 유지합니다.</div></div>` : ""}
    <label>본문<textarea name="body" rows="12" required placeholder="본문을 입력하세요. 줄바꿈은 상세페이지 문단으로 표시됩니다.">${esc(item?.body || "")}</textarea></label>
    <div class="admin-form-row"><label class="check"><input type="checkbox" name="published" ${item?.published === false ? "" : "checked"}> 외부 목록/상세 노출</label>${domain === "columns" ? `<label class="check"><input type="checkbox" name="featured" ${item?.featured ? "checked" : ""}> 메인 대표 COLUMN 우선노출</label>` : "<span></span>"}</div>
    ${formButtons(domain)}
  </form>`;
}

async function boardPanel(domain, edit) {
  const name = BOARD_NAMES[domain];
  const data = await getDomain(domain);
  const items = data.items || [];
  const editing = edit === "new" ? {} : items.find(x => String(x.id) === String(edit));
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>${name}</h2><span class="status-pill"><b>POSTS</b>${items.length}개</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/${domain === "columns" ? "column" : domain}">외부 페이지</button><button class="primary-btn" type="button" data-admin-new="${domain}">새 글</button></div></div><div class="admin-list">${items.length ? items.map(x => `<article><div><b>${esc(x.title)}</b><span>${esc(x.author || "정참시")} · ${x.published === false ? "비노출" : "노출"}${x.featured ? " · 대표" : ""}</span></div><div class="admin-list-actions"><button class="edit" type="button" data-admin-edit="${domain}" data-id="${esc(x.id)}">수정</button><button class="delete" type="button" data-admin-delete="${domain}" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") : `<div class="empty-inline">등록된 글이 없습니다. ‘새 글’을 눌러 실제 외부 노출까지 확인할 수 있습니다.</div>`}</div><div class="admin-editor">${edit ? boardEditor(domain, editing || {}) : ""}</div></section>`;
}

function pollEditor(item = null) {
  const optionText = (item?.options || []).map(x => x.label).join("\n");
  return `<form class="admin-form" data-admin-form="polls" data-item-id="${esc(item?.id || "")}"><label>질문<input name="question" value="${esc(item?.question || "")}" required maxlength="180"></label><label>선택지 · 한 줄에 하나, 최대 10개<textarea name="options" rows="8" required>${esc(optionText)}</textarea></label><label class="check"><input type="checkbox" name="published" ${item?.published === false ? "" : "checked"}> 메인/설문 페이지 노출</label>${formButtons("polls")}</form>`;
}

async function pollPanel(edit) {
  const data = await getDomain("polls");
  const items = data.items || [];
  const editing = edit === "new" ? {} : items.find(x => String(x.id) === String(edit));
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>시민들의 선택</h2><span class="status-pill"><b>POLLS</b>${items.length}개</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/poll">외부 페이지</button><button class="primary-btn" type="button" data-admin-new="polls">새 설문</button></div></div><div class="admin-list">${items.length ? items.map(x => `<article><div><b>${esc(x.question)}</b><span>선택지 ${(x.options || []).length}개 · ${x.published === false ? "비노출" : "노출"}</span></div><div class="admin-list-actions"><button class="edit" type="button" data-admin-edit="polls" data-id="${esc(x.id)}">수정</button><button class="delete" type="button" data-admin-delete="polls" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") : `<div class="empty-inline">등록된 설문이 없습니다.</div>`}</div><div class="admin-editor">${edit ? pollEditor(editing || {}) : ""}</div></section>`;
}

function academyEditor(item = null) {
  return `<form class="admin-form" data-admin-form="academy" data-item-id="${esc(item?.id || "")}"><div class="admin-form-row"><label>일정<input name="date" value="${esc(item?.date || "")}" required placeholder="2026-08-25 14:00"></label><label>과정명<input name="title" value="${esc(item?.title || "")}" required></label></div><label>간단 설명<input name="description" value="${esc(item?.description || "")}" maxlength="180"></label><div class="admin-form-row"><label class="check"><input type="checkbox" name="published" ${item?.published === false ? "" : "checked"}> 외부 노출</label><label class="check"><input type="checkbox" name="closed" ${item?.closed ? "checked" : ""}> 신청 마감</label></div>${formButtons("academy")}</form>`;
}

async function academyPanel(edit) {
  const data = await getDomain("academy");
  const items = data.slots || [];
  const editing = edit === "new" ? {} : items.find(x => String(x.id) === String(edit));
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>정참시 아카데미</h2><span class="status-pill"><b>SLOTS</b>${items.length}개</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/academy">외부 페이지</button><button class="primary-btn" type="button" data-admin-new="academy">일정 추가</button></div></div><div class="admin-list">${items.length ? items.map(x => `<article><div><b>${esc(x.date || "날짜 미정")} · ${esc(x.title || "아카데미")}</b><span>${x.closed ? "마감" : "신청가능"} · ${x.published === false ? "비노출" : "노출"}</span></div><div class="admin-list-actions"><button class="edit" type="button" data-admin-edit="academy" data-id="${esc(x.id)}">수정</button><button class="delete" type="button" data-admin-delete="academy" data-id="${esc(x.id)}">삭제</button></div></article>`).join("") : `<div class="empty-inline">등록된 일정이 없습니다.</div>`}</div><div class="admin-editor">${edit ? academyEditor(editing || {}) : ""}</div></section>`;
}

function systemPanel(session) {
  return `<section class="admin-panel"><h2>시스템</h2><div class="people-admin-grid"><article><b>APP VERSION</b><strong>${APP_VERSION}</strong><span>${BUILD_NAME}</span></article><article><b>HOME CSS</b><strong>LOCKED</strong><span>alpha3.1 SHA 고정</span></article><article><b>ADMIN SESSION</b><strong>${esc(session.mode).toUpperCase()}</strong><span>HttpOnly cookie 우선</span></article></div><div class="notice-box">서버 저장은 v3 전용 namespace만 사용합니다. 저장소가 연결되지 않은 Preview에서는 같은 브라우저의 localStorage로 자동 전환되어 게시판 작성→외부 노출 검수가 가능합니다.</div></section>`;
}

export async function renderAdmin() {
  const session = await getAdminSession();
  if (!session.authenticated) return loginView();
  const { tab, edit } = params();
  let panel = "";
  if (tab === "dashboard") panel = await dashboardPanel(session);
  else if (tab === "people") panel = peoplePanel();
  else if (["columns", "community", "news"].includes(tab)) panel = await boardPanel(tab, edit);
  else if (tab === "polls") panel = await pollPanel(edit);
  else if (tab === "academy") panel = await academyPanel(edit);
  else if (tab === "system") panel = systemPanel(session);
  else panel = await dashboardPanel(session);

  return pageShell(`<main class="subpage admin-page"><section class="page-hero"><span class="eyebrow">ADMIN</span><h1>정참시 관리자</h1><p>${APP_VERSION} · ${BUILD_NAME}</p></section>${adminTabs(tab)}${panel}</main>`);
}

export async function submitAdminLogin(form) {
  const fd = new FormData(form);
  const result = await loginAdmin(String(fd.get("id") || ""), String(fd.get("password") || ""));
  const error = form.querySelector("[data-auth-error]");
  if (!result.ok) {
    if (error) error.textContent = result.error || "로그인에 실패했습니다.";
    return false;
  }
  return true;
}

export async function logout() {
  await logoutAdmin();
}

export async function prepareCoverPreview(input) {
  const form = input.closest("[data-admin-form]");
  const preview = form?.querySelector("[data-cover-preview]");
  const file = input.files?.[0];
  if (!form || !preview || !file) return;
  preview.textContent = "이미지 처리 중…";
  try {
    const data = await compressCoverImage(file);
    form._coverData = data;
    preview.style.backgroundImage = `url('${data}')`;
    preview.textContent = "";
  } catch (error) {
    input.value = "";
    form._coverData = "";
    preview.style.backgroundImage = "";
    preview.textContent = error.message || "이미지 처리 실패";
  }
}

export async function saveAdminForm(form) {
  const domain = form.dataset.adminForm;
  const itemId = form.dataset.itemId || "";
  const fd = new FormData(form);
  const data = await getDomain(domain);
  const now = new Date().toISOString();
  const id = itemId || `${domain}-${Date.now().toString(36)}`;
  let list = domain === "academy" ? (data.slots || []) : (data.items || []);
  const old = list.find(x => String(x.id) === String(itemId)) || null;

  if (["columns", "community", "news"].includes(domain)) {
    const next = {
      id,
      title: String(fd.get("title") || "").trim(),
      summary: String(fd.get("summary") || "").trim(),
      author: String(fd.get("author") || "정참시").trim() || "정참시",
      body: String(fd.get("body") || "").trim(),
      coverImage: form._coverData || old?.coverImage || "",
      featured: domain === "columns" ? fd.get("featured") === "on" : false,
      published: fd.get("published") === "on",
      createdAt: old?.createdAt || now,
      updatedAt: now,
      likes: Number(old?.likes || 0),
      views: Number(old?.views || 0)
    };
    if (domain === "columns" && next.featured) list = list.map(x => ({ ...x, featured: false }));
    list = old ? list.map(x => String(x.id) === String(id) ? next : x) : [next, ...list];
    data.items = list;
  } else if (domain === "polls") {
    const labels = String(fd.get("options") || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean).slice(0, 10);
    if (labels.length < 2) throw new Error("설문 선택지는 최소 2개가 필요합니다.");
    const existingVotes = new Map((old?.options || []).map(x => [x.label, Number(x.votes || 0)]));
    const next = { id, question: String(fd.get("question") || "").trim(), options: labels.map((label, i) => ({ id: `${id}-o${i + 1}`, label, votes: existingVotes.get(label) || 0 })), published: fd.get("published") === "on", createdAt: old?.createdAt || now, updatedAt: now };
    data.items = old ? list.map(x => String(x.id) === String(id) ? next : x) : [next, ...list];
  } else if (domain === "academy") {
    const next = { id, date: String(fd.get("date") || "").trim(), title: String(fd.get("title") || "").trim(), description: String(fd.get("description") || "").trim(), published: fd.get("published") === "on", closed: fd.get("closed") === "on", createdAt: old?.createdAt || now, updatedAt: now };
    data.slots = old ? list.map(x => String(x.id) === String(id) ? next : x) : [next, ...list];
  }

  return saveDomain(domain, data);
}

export async function deleteAdminItem(domain, id) {
  const data = await getDomain(domain);
  if (domain === "academy") data.slots = (data.slots || []).filter(x => String(x.id) !== String(id));
  else data.items = (data.items || []).filter(x => String(x.id) !== String(id));
  return saveDomain(domain, data);
}
