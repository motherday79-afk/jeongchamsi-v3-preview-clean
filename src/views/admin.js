import { pageShell, esc } from "./layout.js";
import { getUserSession, initializeUserState } from "../core/user.js";
import { getDomain, saveDomain, getStorageState, DEFAULT_ITSME_CATEGORIES } from "../core/repository.js";
import { getAdminHistoryOverview, getAdminHistoryPerson } from "../core/history-repository.js?v=history-v2";
import { APP_VERSION, BUILD_NAME } from "../version.js";
import { BADGE_CATALOG, badgeGemSvg, badgeByKey } from "../data/badge-catalog.js";
import { normalizeNationalEvaluation, makeNationalEvaluationId, votesForEvaluationSlot } from "./national-evaluation-model.js";
import { stageProgress, stageLabel } from "../core/refresh-progress.js?v=jcs-aggressive-r1";

const TABS = [
  ["dashboard", "대시보드"], ["brand", "메인 타이틀"], ["members", "회원관리"], ["badges", "배지센터"], ["requests", "요청 · PARTNERS"], ["people", "인물 관리"], ["nowdata", "NOW 데이터"], ["history", "HISTORY"], ["president", "대통령"],
  ["columns", "COLUMN"], ["community", "정뮤니티"], ["itsme", "IT’S ME"], ["news", "정참시 NEWS"],
  ["polls", "시민들의 선택"], ["keywords", "정치키워드"], ["trending", "실시간 급상승"],
  ["generation", "세대별 대통령"], ["national", "전국평가"], ["academy", "아카데미"], ["push", "푸시 알림"], ["system", "시스템"]
];
const BOARD_NAMES = { columns: "COLUMN", community: "정뮤니티", news: "정참시 NEWS" };
function params() { const p = new URLSearchParams(location.search); return { tab: p.get("tab") || "dashboard", edit: p.get("edit") || "", person: p.get("person") || "", range: p.get("range") || "30" }; }
function adminTabs(active) { return `<nav class="admin-tabs" aria-label="관리자 메뉴">${TABS.map(([key, label]) => `<a href="/admin?tab=${encodeURIComponent(key)}" class="${active === key ? "active" : ""}" data-route${active === key ? ` aria-current="page"` : ""}>${label}</a>`).join("")}</nav>`; }
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
  let counts = { members:0, columns:0, community:0, itsme:0, news:0, polls:0, academy:0 };
  let error = "";
  try {
    const r = await fetch("/api/v3/admin/dashboard", { credentials:"same-origin", headers:{ Accept:"application/json" } });
    const b = await r.json().catch(() => ({}));
    if (r.ok && b.counts) counts = { ...counts, ...b.counts };
    else error = b.error || "ADMIN_DASHBOARD_FAILED";
  } catch { error = "ADMIN_DASHBOARD_FAILED"; }
  const storage = getStorageState();
  return `<section class="admin-panel"><div class="admin-panel-head"><h2>v3 운영 대시보드</h2><button type="button" class="ghost-btn" data-user-logout>로그아웃</button></div><div class="admin-stat-grid"><article><b>MEMBERS</b><strong>${counts.members}</strong><span>가입 회원</span></article><article><b>PERSON SLOTS</b><strong>543</strong><span>300 + 16 + 227</span></article><article><b>COLUMN</b><strong>${counts.columns}</strong><span>등록 글</span></article><article><b>COMMUNITY</b><strong>${counts.community}</strong><span>등록 글</span></article><article><b>IT’S ME</b><strong>${counts.itsme}</strong><span>정책 제안</span></article><article><b>NEWS</b><strong>${counts.news}</strong><span>등록 글</span></article><article><b>POLLS</b><strong>${counts.polls}</strong><span>등록 설문</span></article><article><b>ACADEMY</b><strong>${counts.academy}</strong><span>등록 일정</span></article></div><div class="notice-box">서버 Source of Truth: ${error ? `확인 필요 · ${esc(error)}` : storage.available ? "정상" : `오류 · ${esc(storage.error)}`}. 브라우저 저장 fallback은 사용하지 않습니다. PC·모바일·Fold 메인 레이아웃과 폰트는 LOCK 상태입니다</div></section>`;
}

function memberBadgeAdminCatalog(user = {}) {
  const tiers=[["BRONZE","BRONZE"],["SILVER","SILVER"],["GOLD","GOLD"],["PLATINUM","PLATINUM"],["BLACK","BLACK · 특별 명예"]];
  return tiers.map(([tier,label])=>{
    const items=BADGE_CATALOG.filter(x=>x.tier===tier);
    return `<section class="member-badge-tier member-badge-tier-${tier.toLowerCase()}"><div class="member-badge-tier-head"><b>${label}</b><span>${items.length}종</span></div><div class="member-badge-grid">${items.map(badge=>{
      const operator=badge.key==="operator";
      const roleUnlocked=operator && user.role==="admin";
      return `<label class="member-badge-chip ${badge.tier==="BLACK" ? "member-badge-operator" : ""}"><input type="checkbox" data-member-badge="${esc(user.id)}" value="${esc(badge.key)}" ${operator ? (roleUnlocked ? "checked disabled" : "disabled") : ((user.grantedBadges || []).includes(badge.key) ? "checked" : "")}>${badgeGemSvg(badge.key)}<span><b>${esc(badge.name)}</b><small>${esc(badge.tier)} · ${operator ? "운영 역할" : esc(badge.kind)}</small></span></label>`;
    }).join("")}</div></section>`;
  }).join("");
}


async function badgeCenterPanel() {
  let data={ok:false,summary:{members:0,totalBadges:BADGE_CATALOG.length,blackBadges:3},holders:{},records:[]};
  try{
    const r=await fetch("/api/v3/admin/badges",{credentials:"same-origin",headers:{Accept:"application/json"}});
    const b=await r.json().catch(()=>({}));
    if(r.ok) data={...data,...b,ok:true}; else data.error=b.error||"BADGE_CENTER_FAILED";
  }catch{data.error="BADGE_CENTER_FAILED";}
  if(!data.ok) return `<section class="admin-panel"><h2>배지센터</h2><div class="notice-box">배지 현황을 불러오지 못했습니다 · ${esc(data.error||"BADGE_CENTER_FAILED")}</div></section>`;
  const tiers=[["BRONZE","BRONZE"],["SILVER","SILVER"],["GOLD","GOLD"],["PLATINUM","PLATINUM"],["BLACK","BLACK · 특별 명예"]];
  const celebrationEnabled=new Set(data.celebration?.enabledBadgeKeys||[]);
  const celebrationCandidates=BADGE_CATALOG.filter(x=>["GOLD","PLATINUM","BLACK"].includes(x.tier)&&x.key!=="operator");
  const celebrationControl=`<form class="badge-celebration-control" data-badge-celebration-form><div class="section-title"><div><h3>메인 축하 노출</h3><span>GOLD 이상 중 메인 상단에서 함께 축하할 배지를 선택합니다.</span></div></div><div class="badge-celebration-choice-grid">${celebrationCandidates.map(badge=>`<label><input type="checkbox" name="badgeKey" value="${esc(badge.key)}" ${celebrationEnabled.has(badge.key)?"checked":""}><span><b>${esc(badge.name)}</b><small>${esc(badge.tier)} · ${esc(badge.kind)}</small></span></label>`).join("")}</div><div class="admin-form-actions"><button class="primary-btn" type="submit">축하 노출 설정 저장</button><span class="save-state" data-badge-celebration-state></span></div></form>`;
  const cards=tiers.map(([tier,label])=>{
    const items=BADGE_CATALOG.filter(x=>x.tier===tier);
    return `<section class="badge-center-tier badge-center-${tier.toLowerCase()}"><div class="badge-center-tier-head"><div><b>${esc(label)}</b><span>${items.length}종</span></div><small>현재 획득 현황</small></div><div class="badge-center-grid">${items.map(badge=>`<article>${badgeGemSvg(badge.key)}<div><small>${esc(badge.kind)}</small><b>${esc(badge.name)}</b><p>${esc(badge.mission)}</p><span>획득자 <strong>${Number(data.holders?.[badge.key]||0).toLocaleString("ko-KR")}</strong>명</span></div></article>`).join("")}</div></section>`;
  }).join("");
  const leaders=(data.records||[]).slice(0,12);
  return `<section class="admin-panel badge-center-panel"><div class="admin-panel-head"><div><h2>배지센터</h2><span class="status-pill"><b>BADGES</b>${Number(data.summary?.totalBadges||BADGE_CATALOG.length)}종</span></div></div><div class="admin-stat-grid badge-center-stats"><article><b>MEMBERS</b><strong>${Number(data.summary?.members||0)}</strong><span>정참시민</span></article><article><b>BADGES</b><strong>${Number(data.summary?.totalBadges||0)}</strong><span>전체 배지</span></article><article><b>BLACK</b><strong>${Number(data.summary?.blackBadges||0)}</strong><span>특별 명예</span></article><article><b>MICHAEL</b><strong>${Number(data.holders?.michael||0)}</strong><span>1,000명 초대 달성</span></article></div><div class="member-admin-note">관리자는 운영을 위해 모든 배지를 사용할 수 있습니다. BLACK은 상하관계가 아니라 운영·완주·확장처럼 서로 다른 특별한 자격과 성취를 상징합니다.</div>${celebrationControl}${cards}<section class="badge-center-leaders"><div class="section-title"><h3>획득 현황 상위 회원</h3><span>추천 모집 현황 포함</span></div><div class="badge-center-leader-grid">${leaders.map((u,i)=>`<article><em>${i+1}</em><div><b>${esc(u.name||u.id)}</b><small>#${Number(u.referralNumber||0)} · 배지 ${Number(u.earnedCount||0)}개 · 모집 ${Number(u.recruitedCount||0).toLocaleString("ko-KR")}명</small></div><span>${(u.blackBadges||[]).length ? `${u.blackBadges.length} BLACK` : "—"}</span></article>`).join("")}</div></section></section>`;
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
      <details class="member-badge-admin"><summary><span><b>배지 관리</b><small>관리자 직접 해금 · 현재 대표 ${esc(badgeByKey(user.representativeBadge)?.name || "미설정")}</small></span><em>${(user.grantedBadges || []).length}개 해금</em></summary>${memberBadgeAdminCatalog(user)}<p class="field-help">조건을 달성하지 않은 일반 배지도 관리자가 직접 열어줄 수 있습니다. 운영자 배지는 관리자 권한으로 사용되며, 정참시장·미카엘 등 다른 BLACK 배지는 일반회원도 조건 달성 시 획득할 수 있습니다. 체크 해제 후 저장 시 관리자 해금만 회수됩니다</p></details>
      <div class="member-access-controls member-access-expanded">
        <label>권한<select data-member-role="${esc(user.id)}"><option value="member" ${user.role === "member" || !user.role ? "selected" : ""}>일반회원</option><option value="partner" ${user.role === "partner" ? "selected" : ""}>정참시 PARTNER</option><option value="admin" ${user.role === "admin" ? "selected" : ""}>관리자</option></select></label>
        <label>상태<select data-member-status="${esc(user.id)}"><option value="active" ${!suspended ? "selected" : ""}>정상</option><option value="suspended" ${suspended ? "selected" : ""}>이용정지</option></select></label>
        <label>정지기간<select data-member-days="${esc(user.id)}"><option value="0" ${suspended && !Number.isFinite(until) ? "selected" : ""}>무기한</option><option value="2" ${durationPreset===2 ? "selected" : ""}>2일</option><option value="7" ${durationPreset===7 ? "selected" : ""}>7일</option><option value="30" ${durationPreset===30 ? "selected" : ""}>30일</option></select></label>
        <label class="member-reason">제재 사유<input data-member-reason="${esc(user.id)}" value="${esc(user.suspensionReason || "")}" maxlength="200" placeholder="선택 입력"></label>
        <button class="primary-btn" type="button" data-member-access="${esc(user.id)}">회원정보 저장</button><span class="save-state member-save-state" data-member-save-state="${esc(user.id)}" role="status" aria-live="polite"></span>
      </div>
    </article>`;
  }).join("")}</div></section>`;
}
function photoKb(bytes = 0) { return `${Math.max(0, Number(bytes || 0) / 1024).toFixed(1)}KB`; }
function politicianTypeName(type = "") { return type === "assembly" ? "국회의원" : type === "metropolitan" ? "광역단체장" : "기초단체장"; }
const POLITICIAN_PHOTO_COVERAGE_CACHE_TTL = 120000;
const politicianPhotoCoverageCache = new Map();
let politicianPhotoCoverageSnapshot = new Map();
function clearPoliticianPhotoCoverageCache(type = "") {
  if (type) politicianPhotoCoverageCache.delete(String(type));
  else politicianPhotoCoverageCache.clear();
}
async function fetchPoliticianPhotoCoverageStatus(type = "assembly", { force = false } = {}) {
  const key = String(type || "assembly");
  const cached = politicianPhotoCoverageCache.get(key);
  if (!force && cached && Date.now() - cached.at < POLITICIAN_PHOTO_COVERAGE_CACHE_TTL) return cached.data;
  try {
    const r = await fetch("/api/v3/politician-photo", {
      method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json",Accept:"application/json"},
      body:JSON.stringify({action:"coverage-status",type:key})
    });
    const b = await r.json().catch(()=>({}));
    const data = r.ok && b.ok ? b : {ok:false,type:key,assetCount:0,fallbackCount:0,missingCount:0,asset:[],fallback:[],missing:[],error:b.error || `PHOTO_COVERAGE_${r.status}`};
    if (data.ok) politicianPhotoCoverageCache.set(key,{at:Date.now(),data});
    return data;
  } catch { return {ok:false,type:key,assetCount:0,fallbackCount:0,missingCount:0,asset:[],fallback:[],missing:[],error:"PHOTO_COVERAGE_FAILED"}; }
}


function politicianPhotoCoverageRows(items = []) {
  if (!items.length) return `<div class="politician-photo-coverage-empty">해당 인물이 없습니다.</div>`;
  return `<div class="politician-photo-coverage-rows">${items.map(item => `<a href="/person/${esc(encodeURIComponent(item.id))}" data-route><b>${esc(item.name || item.id)}</b><span>${esc(item.party || "")}${item.jurisdiction ? ` · ${esc(item.jurisdiction)}` : ""}</span></a>`).join("")}</div>`;
}
function politicianPhotoCoverageCount(count, deferred = false) {
  return deferred ? "확인" : `${Number(count || 0)}명`;
}
function politicianPhotoCoverageBucket(type, bucket, label, count, items, note, { deferred = false, open = false } = {}) {
  const body = Array.isArray(items) ? politicianPhotoCoverageRows(items) : `<div class="politician-photo-coverage-empty">목록을 보려면 눌러주세요.</div>`;
  return `<details class="politician-photo-coverage-list" ${open ? "open" : ""}><summary data-politician-photo-coverage-load="${esc(type)}" data-politician-photo-coverage-bucket="${esc(bucket)}"><span><b>${esc(label)}</b><small>${esc(note)}</small></span><strong>${politicianPhotoCoverageCount(count,deferred)}</strong></summary>${body}</details>`;
}
function politicianPhotoCoverageDiagnostic(type, coverage = {}, openedBucket = "") {
  const title = type === "assembly" ? "국회의원 사진 노출 진단" : type === "metropolitan" ? "광역단체장 사진 노출 진단" : "기초단체장 사진 노출 진단";
  if (coverage?.ok === false) return `<section class="politician-photo-coverage-diagnostic" data-politician-photo-coverage-section="${esc(type)}"><div class="empty-inline">${esc(title)}을 불러오지 못했습니다 · ${esc(coverage?.error || "오류")}</div></section>`;
  const deferred = coverage?.deferred === true;
  const visible = deferred ? Number(coverage.assetCount || 0) : Number(coverage.assetCount || 0) + Number(coverage.fallbackCount || 0);
  const headerNote = deferred ? `정참시 자산 ${Number(coverage.assetCount || 0)} / ${Number(coverage.total || 0)} · 외부 진단은 필요할 때만 실행` : `${visible} / ${Number(coverage.total || 0)} 노출`;
  return `<section class="politician-photo-coverage-diagnostic" data-politician-photo-coverage-section="${esc(type)}"><div class="section-title"><div><h3>${esc(title)}</h3><span>${esc(headerNote)}</span></div><b>${deferred ? `${Number(coverage.assetCount || 0)} / ${Number(coverage.total || 0)}` : `${visible} / ${Number(coverage.total || 0)}`}</b></div><div class="politician-photo-coverage-groups">${politicianPhotoCoverageBucket(type,"asset","정참시 자산",coverage.assetCount,openedBucket === "asset" ? (coverage.asset || []) : null,"서버 확보 사진",{open:openedBucket === "asset"})}${politicianPhotoCoverageBucket(type,"fallback","외부 fallback",coverage.fallbackCount,openedBucket === "fallback" ? (coverage.fallback || []) : null,deferred ? "외부 fallback 진단 · 클릭 시 확인" : "외부 사진으로 노출",{deferred,open:openedBucket === "fallback"})}${politicianPhotoCoverageBucket(type,"missing","사진 미노출",coverage.missingCount,openedBucket === "missing" ? (coverage.missing || []) : null,deferred ? "외부 진단 후 미노출 확인" : "벡터 이미지 노출",{deferred,open:openedBucket === "missing"})}</div></section>`;
}

export async function loadPoliticianPhotoCoverageDiagnostic(trigger) {
  const type = String(trigger?.dataset?.politicianPhotoCoverageLoad || "");
  const bucket = String(trigger?.dataset?.politicianPhotoCoverageBucket || "fallback");
  const section = trigger?.closest?.("[data-politician-photo-coverage-section]");
  if (!type || !section) return {ok:false,error:"PHOTO_COVERAGE_TARGET_REQUIRED"};
  const snapshot = politicianPhotoCoverageSnapshot.get(type);
  if (bucket === "asset" && snapshot) {
    section.outerHTML = politicianPhotoCoverageDiagnostic(type,{...snapshot,ok:true,deferred:true},"asset");
    return {ok:true,type,bucket,cached:true};
  }
  const original = trigger.innerHTML;
  trigger.setAttribute("aria-busy","true");
  const strong = trigger.querySelector("strong");
  if (strong) strong.textContent = "확인 중";
  const coverage = await fetchPoliticianPhotoCoverageStatus(type);
  if (!coverage.ok) {
    trigger.removeAttribute("aria-busy");
    trigger.innerHTML = original;
    return coverage;
  }
  section.outerHTML = politicianPhotoCoverageDiagnostic(type,coverage,bucket);
  return {ok:true,type,bucket,coverage};
}

async function peoplePanel() {
  const [{ PERSON_PROVIDER_STATUS, PHOTO_PROVIDER_STATUS }, provider] = await Promise.all([import("../data/person-meta.js"), import("../data/person-provider.js")]);
  const people = provider.listAllPoliticians();
  const photos = await getDomain("politicianPhotos", { fresh:true });
  const assets = new Map((photos.items || []).map(x => [String(x.id), x]));
  const personById = new Map(people.map(person => [String(person.id), person]));
  const assetCounts = { assembly:0, metropolitan:0, basic:0 };
  for (const id of assets.keys()) {
    const type = String(personById.get(String(id))?.type || "");
    if (Object.hasOwn(assetCounts, type)) assetCounts[type] += 1;
  }
  const assetTargets = {
    assembly: people.filter(x => x.type === "assembly" && x.id !== "assembly-300").length,
    metropolitan: people.filter(x => x.type === "metropolitan").length,
    basic: people.filter(x => x.type === "basic").length
  };
  const manualCount = [...assets.values()].filter(x => String(x.sourceType || "manual") === "manual").length;
  const wikimediaCount = [...assets.values()].filter(x => String(x.sourceType || "") === "auto-wikimedia").length;
  const officialCount = [...assets.values()].filter(x => String(x.sourceType || "") === "auto-official-review").length;
  const autoCount = wikimediaCount + officialCount;
  const seedCount = [...assets.values()].filter(x => ["seed-local","seed-external"].includes(String(x.sourceType || ""))).length;
  const targetCount = assetTargets.assembly + assetTargets.metropolitan + assetTargets.basic;

  politicianPhotoCoverageSnapshot = new Map(["assembly","metropolitan","basic"].map(type => {
    const rows = people
      .filter(person => person.type === type && person.id !== "assembly-300")
      .filter(person => assets.has(String(person.id)))
      .map(person => ({ id:person.id, name:person.name, party:person.party, jurisdiction:person.jurisdiction || person.region || "" }));
    return [type,{ type, total:assetTargets[type], assetCount:assetCounts[type], asset:rows, fallbackCount:0, missingCount:0 }];
  }));
  const coverageDiagnostics = ["assembly","metropolitan","basic"]
    .map(type => politicianPhotoCoverageDiagnostic(type,{...politicianPhotoCoverageSnapshot.get(type),ok:true,deferred:true}))
    .join("");

  return `<section class="admin-panel politician-photo-admin">
    <div class="admin-panel-head"><div><h2>인물 관리 · 정치인 사진</h2><span class="status-pill"><b>PHOTO ASSETS</b>국회의원 ${assetCounts.assembly} · 광역단체장 ${assetCounts.metropolitan} · 기초단체장 ${assetCounts.basic}</span></div></div>
    <div class="people-admin-grid"><article><b>국회의원</b><strong>${assetCounts.assembly} / ${assetTargets.assembly}</strong><span>정참시 사진 자산</span></article><article><b>광역단체장</b><strong>${assetCounts.metropolitan} / ${assetTargets.metropolitan}</strong><span>정참시 사진 자산</span></article><article><b>기초단체장</b><strong>${assetCounts.basic} / ${assetTargets.basic}</strong><span>정참시 사진 자산</span></article><article><b>인물 공급자</b><strong>${PERSON_PROVIDER_STATUS}</strong><span>앱 내부 Seed</span></article><article><b>사진 공급자</b><strong>${PHOTO_PROVIDER_STATUS}</strong></article><article><b>전체 사진 자산</b><strong>${assets.size} / ${targetCount}</strong><span>자동 ${autoCount} · 수기 ${manualCount} · 패키지 ${seedCount}</span></article></div>
    ${coverageDiagnostics}
  </section>`;
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
const HERO_TONES = [
  ["default","기본","#e9f4f0"], ["white","화이트","#ffffff"], ["mint","민트","#9ee7d1"], ["yellow","옐로 포인트","#ffd84d"], ["dark","다크","#15352e"]
];
function heroToneSwatches(name, current = "default", label = "색상") {
  return `<fieldset class="hero-tone-field"><legend>${esc(label)}</legend><div class="hero-tone-choices">${HERO_TONES.map(([value,text,color]) => `<label class="hero-tone-choice"><input type="radio" name="${esc(name)}" value="${value}" ${String(current || "default") === value ? "checked" : ""}><span class="hero-tone-swatch" style="--hero-tone-swatch:${color}"></span><b>${esc(text)}</b></label>`).join("")}</div></fieldset>`;
}
function heroHeadlinePreviewHtml(headline = "", accent = "") {
  const text = String(headline || "");
  const accentText = String(accent || "").trim();
  const index = accentText ? text.indexOf(accentText) : -1;
  if (index < 0) return esc(text).replace(/\n/g,"<br>");
  const prefix = text.slice(0,index);
  const suffix = text.slice(index + accentText.length);
  const autoBreak = accentText === "움직이는 것" && !text.includes("\n") && prefix;
  return `${esc(prefix).replace(/\n/g,"<br>")}${autoBreak ? "<br>" : ""}<strong>${esc(accentText)}</strong>${esc(suffix).replace(/\n/g,"<br>")}`;
}

async function brandPanel() {
  const data = await getDomain("brand");
  const hero = {
    kicker:"정참시 — 정치에 참여할 시간",
    headline:"바라볼 때가 아닌, 행동할 때 정치가 시작됩니다",
    productKicker:"JEONGCHAMSI",
    productTagline:"정치에 참여할 시간",
    productHeadline:"정치를 보는 것에서 움직이는 것으로!",
    productAccentText:"움직이는 것",
    productDescription:"인물·이슈·여론·제안을 한곳에서 보고, 비교하고, 직접 참여하세요",
    productPrimaryLabel:"정참시 응원하기",
    productPrimaryHref:"/about",
    productSecondaryLabel:"정참시 후원하기",
    productSecondaryHref:"https://toon.at/donate/jungchamsi",
    productHeadlineTone:"white",
    productAccentTone:"yellow",
    productDescriptionTone:"mint",
    subline1:"알고, 비교하고, 선택하고, 평가하는 것",
    subline2:"한 사람의 작은 행동이 정치의 방향을 만듭니다",
    learnLabel:"정참시 더 알아보기",
    supportLabel:"정참시 후원하기",
    artImage:"",
    ...(data.hero || {})
  };
  const storedAbout = data.about || {};
  const legacyAboutBody = String(storedAbout.body || "").trim();
  const legacyAbout = !legacyAboutBody || legacyAboutBody.startsWith("정참시는 정치인을 지지하거나 공격하기 위해 만든 곳이 아닙니다.") || legacyAboutBody.startsWith("작품이 없는 시간에는 발성과 호흡");
  const about = {
    title:"왜 정참시인가",
    intro:legacyAbout ? APPROVED_ABOUT_INTRO : String(storedAbout.intro || APPROVED_ABOUT_INTRO),
    body:legacyAbout ? APPROVED_ABOUT_BODY : String(storedAbout.body || APPROVED_ABOUT_BODY)
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
  const art = hero.artImage || "";
  return `<section class="admin-panel brand-admin-current">
    <div class="admin-panel-head"><div><h2>메인 타이틀 · 현재 메인 히어로</h2><span class="status-pill"><b>LIVE HERO</b>실제 메인 1:1 편집</span></div><div class="inline-actions"><button class="ghost-btn" type="button" data-go="/">메인 보기</button><button class="ghost-btn" type="button" data-go="/about">더 알아보기 페이지</button></div></div>
    <div class="notice-box">이 편집기는 현재 메인 첫 화면의 히어로 문구·버튼·비주얼을 직접 관리합니다. 저장 전 미리보기만 바뀌고, 저장해야 실제 메인에 반영됩니다.</div>
    <form class="admin-form brand-admin-form" data-admin-form="brand-settings">
      <div class="section-title"><h2>상단 함께하는 사람 표시</h2><span>현재 가입 ${actualMemberCount.toLocaleString("ko-KR")}명</span></div>
      <div class="admin-form-row"><label class="check"><input type="checkbox" name="liveBarUseActual" ${liveBar.useActualCount !== false ? "checked" : ""}> 실제 가입 회원수 자동 사용</label><label>수동 표시 인원<input type="number" name="liveBarOverride" min="0" step="1" value="${Math.max(0,Number(liveBar.overrideCount||0))}"></label></div>

      <div class="section-title top-gap"><h2>현재 메인 히어로 문구</h2><span>메인 첫 화면에 직접 연결</span></div>
      <div class="admin-form-row"><label>영문 라벨<input name="productKicker" maxlength="60" value="${esc(hero.productKicker)}" required></label><label>보조 라벨<input name="productTagline" maxlength="60" value="${esc(hero.productTagline)}" required></label></div>
      <label class="admin-hero-primary-copy">메인 헤드라인<textarea name="productHeadline" rows="2" maxlength="180" required>${esc(hero.productHeadline)}</textarea><small>줄바꿈도 그대로 반영됩니다.</small></label>
      <label>강조할 문구<input name="productAccentText" maxlength="80" value="${esc(hero.productAccentText || "움직이는 것")}" placeholder="예: 움직이는 것"><small>헤드라인 안에서 이 문구와 일치하는 부분만 강조 색상으로 표시됩니다.</small></label>
      <label>설명 문구<textarea name="productDescription" rows="3" maxlength="260" required>${esc(hero.productDescription)}</textarea><small>현재 메인의 ‘인물·이슈·여론·제안을 한곳에서 보고, 비교하고, 직접 참여하세요’ 영역입니다.</small></label>
      <div class="hero-tone-editor-grid">${heroToneSwatches("productHeadlineTone", hero.productHeadlineTone, "헤드라인 기본색")}${heroToneSwatches("productAccentTone", hero.productAccentTone, "강조 문구색")}${heroToneSwatches("productDescriptionTone", hero.productDescriptionTone, "설명 문구색")}</div>
      <div class="admin-product-hero-preview" data-hero-live-preview data-headline-tone="${esc(hero.productHeadlineTone)}" data-accent-tone="${esc(hero.productAccentTone)}" data-description-tone="${esc(hero.productDescriptionTone)}">
        <div class="admin-product-hero-preview-kicker"><span data-hero-preview-kicker>${esc(hero.productKicker)}</span><em data-hero-preview-tagline>${esc(hero.productTagline)}</em></div>
        <h3 data-hero-preview-headline>${heroHeadlinePreviewHtml(hero.productHeadline, hero.productAccentText)}</h3>
        <p data-hero-preview-description>${esc(hero.productDescription)}</p>
        <small>색상·강조 문구는 저장 전에 여기서 바로 확인할 수 있습니다.</small>
      </div>
      <div class="admin-form-row"><label>1번 버튼 문구<input name="productPrimaryLabel" maxlength="60" value="${esc(hero.productPrimaryLabel)}"></label><label>1번 버튼 주소<input name="productPrimaryHref" maxlength="300" value="${esc(hero.productPrimaryHref)}" placeholder="/about 또는 https://..."></label></div>
      <div class="admin-form-row"><label>2번 버튼 문구<input name="productSecondaryLabel" maxlength="60" value="${esc(hero.productSecondaryLabel)}"></label><label>2번 버튼 주소<input name="productSecondaryHref" maxlength="300" value="${esc(hero.productSecondaryHref)}" placeholder="/support 또는 https://..."></label></div>

      <div class="section-title top-gap"><h2>히어로 비주얼</h2><span>선택 · 미리보기 · 저장</span></div>
      <label>히어로 이미지<input type="file" accept="image/jpeg,image/png,image/webp" data-cover-input></label>
      <div class="image-uploader"><div class="image-preview brand-art-preview product-hero-admin-preview" data-cover-preview ${art ? `style="background-image:url('${esc(art)}')"` : ""} data-cover-data="${esc(hero.artImage || "")}"></div><div class="image-help"><b>권장 1200 × 675px 이상 · 16:9</b><span>JPG · PNG · WebP · 원본 최대 12MB. 업로드 시 브라우저에서 최대 1200×675 기준으로 자동 최적화하며, 저장 전에는 미리보기만 확인할 수 있습니다.</span></div></div>

      <details class="brand-legacy-details"><summary>브랜드 상세페이지 문구 편집</summary>
        <label>상단 문구<input name="kicker" maxlength="100" value="${esc(hero.kicker)}"></label>
        <label>메인 문구<textarea name="headline" rows="3" maxlength="180">${esc(hero.headline)}</textarea></label>
        <label>서브 1<input name="subline1" maxlength="180" value="${esc(hero.subline1)}"></label>
        <label>서브 2<input name="subline2" maxlength="180" value="${esc(hero.subline2)}"></label>
        <div class="admin-form-row"><label>더 알아보기 버튼<input name="learnLabel" maxlength="60" value="${esc(hero.learnLabel)}"></label><label>후원 버튼<input name="supportLabel" maxlength="60" value="${esc(hero.supportLabel)}"></label></div>
        <div class="section-title top-gap"><h2>정참시 더 알아보기</h2><span>/about</span></div>
        <label>페이지 제목<input name="aboutTitle" maxlength="100" value="${esc(about.title)}"></label>
        <label>도입문<textarea name="aboutIntro" rows="3" maxlength="600">${esc(about.intro)}</textarea></label>
        <label>본문<textarea name="aboutBody" rows="12" maxlength="12000">${esc(about.body)}</textarea></label>
        <div class="section-title top-gap"><h2>정참시 후원하기</h2><span>/support</span></div>
        <label>페이지 제목<input name="supportTitle" maxlength="100" value="${esc(support.title)}"></label>
        <label>도입문<textarea name="supportIntro" rows="3" maxlength="600">${esc(support.intro)}</textarea></label>
        <label>본문<textarea name="supportBody" rows="10" maxlength="12000">${esc(support.body)}</textarea></label>
        <label>후원 안내/준비 상태<textarea name="supportNote" rows="3" maxlength="1000">${esc(support.note)}</textarea></label>
      </details>
      <div class="admin-form-actions"><button class="primary-btn" type="submit">메인 타이틀 저장</button><span class="save-state" data-save-state role="status" aria-live="polite"></span></div>
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
  return `<section class="admin-panel"><div class="admin-panel-head"><div><h2>정참시민 전국 평가제</h2><span class="status-pill"><b>SYNC</b>어드민 · 메인 · 평가페이지 공통 편집기</span></div><button class="ghost-btn" data-go="/national-evaluation">외부 페이지</button></div>${tools.renderNationalEvaluationAdminEditor(data, { context:"admin", open:true })}</section>`;
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
  const rawFraction = summary.total ? Math.min(1, summary.completed / summary.total) : 0;
  const pct = draft?.pipeline?.stage ? stageProgress(draft.pipeline.stage, draft.pipeline.stage === 'now' ? rawFraction : 1) : Math.round(rawFraction * 100);
  const top30 = draft?.top30?.length ? draft.top30 : (data.current?.top30 || []);
  const ready = data.configured?.searchAds && data.configured?.news;
  const draftStatus = draft?.pipeline?.stage ? stageLabel(draft.pipeline.stage) : (draft?.status || "대기");
  return `<section class="admin-panel now-data-center">
    <div class="admin-panel-head"><div><h2>NOW 데이터 센터 <span class="admin-live-pulse" data-live-status="ready" aria-hidden="true"><i></i></span></h2><span class="status-pill"><b>JEONGCHAMSI INTELLIGENT LIVE DATA</b></span></div></div>
    <div class="now-data-kpis">
      <article><span>수집 대상</span><strong>${num(data.rosterTotal)}</strong><small>실제 정치인</small></article>
      <article><span>각종 대형 엔진 PC/모바일</span><strong>${data.configured?.searchAds ? `READY <span class="admin-live-pulse" data-live-status="ready" aria-hidden="true"><i></i></span>` : `연결필요 <span class="admin-live-pulse is-idle" data-live-status="idle" aria-hidden="true"><i></i></span>`}</strong><small>각종 SNS PC/모바일</small></article>
      <article><span>구글 · 네이버 · 다음</span><strong>${data.configured?.news ? `READY <span class="admin-live-pulse" data-live-status="ready" aria-hidden="true"><i></i></span>` : `확인필요 <span class="admin-live-pulse is-idle" data-live-status="idle" aria-hidden="true"><i></i></span>`}</strong><small>JEONGCHAMSI INTELLIGENT NEWS DATA</small></article>
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
    ${!ready ? `<div class="notice-box">라이브 데이터 연결 상태를 확인해 주세요.</div>` : ""}
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
function setNowProgress(done,total,label="수집 중",stage="now") {
  const fraction = total ? Math.min(1, Math.max(0, done / total)) : 0;
  const pct = stageProgress(stage,fraction);
  const bar = document.querySelector("[data-now-progress-bar]"); if (bar) bar.style.width = `${pct}%`;
  const count = document.querySelector("[data-now-progress-count]"); if (count) count.textContent = stage === "now" ? `${num(done)} / ${num(total)}` : `${pct.toFixed(pct % 1 ? 1 : 0)}%`;
  const text = document.querySelector("[data-now-progress-label]"); if (text) text.textContent = label || stageLabel(stage);
}
function setNowStage(stage,fraction=1,detail="") {
  const pct=stageProgress(stage,fraction),bar=document.querySelector("[data-now-progress-bar]"),count=document.querySelector("[data-now-progress-count]"),text=document.querySelector("[data-now-progress-label]"),state=document.querySelector("[data-now-live-state]");
  if(bar)bar.style.width=`${pct}%`;if(count)count.textContent=`${pct.toFixed(pct % 1 ? 1 : 0)}%`;if(text)text.textContent=stageLabel(stage);if(state&&detail)state.textContent=detail;
}
async function finalizeWithPipelineProgress(draftId){
  let settled=false,result=null;const request=nowApi({action:"finalize",draftId}).then(r=>{result=r;settled=true;return r;});
  while(!settled){const status=await fetchNowDataStatus();const pipe=status?.draft?.pipeline;if(pipe?.stage)setNowStage(pipe.stage,1,pipe.detail||"");await new Promise(resolve=>setTimeout(resolve,280));}
  await request;return result;
}
async function runBatchQueue({draftId,batchIndexes,total,batchSize,action}) {
  let cursor = 0, doneBatches = 0, firstError = "", firstDetail = "";
  const workers = Array.from({length:Math.min(2,batchIndexes.length || 1)}, async () => {
    while (true) {
      const at = cursor++; if (at >= batchIndexes.length) return;
      const batchIndex = batchIndexes[at];
      let r = await nowApi({ action, draftId, batchIndex });
      if (!r.ok) { await new Promise(resolve => setTimeout(resolve, 350)); r = await nowApi({ action, draftId, batchIndex }); }
      if (!r.ok && !firstError) { firstError = r.error || "BATCH_FAILED"; firstDetail = r.detail || ""; }
      doneBatches++;
      setNowProgress(Math.min(total, doneBatches * batchSize), total, "NOW SEARCH + NEWS COLLECTION", "now");
      const state = document.querySelector("[data-now-live-state]"); if (state) state.textContent = `배치 ${doneBatches}/${batchIndexes.length} · 최근 처리 #${batchIndex + 1}${r.elapsedMs ? ` · ${(r.elapsedMs/1000).toFixed(1)}초` : ""}`;
    }
  });
  await Promise.all(workers); return firstError ? { ok:false, error:firstError, detail:firstDetail } : { ok:true };
}
export async function runNowDataRefresh() {
  const searchWeight = Number(document.querySelector("[data-now-search-weight]")?.value || 50), newsWeight = Number(document.querySelector("[data-now-news-weight]")?.value || 50);
  const start = await nowApi({ action:"start", searchWeight, newsWeight }); if (!start.ok) return start;
  setNowProgress(0,start.total,"NOW SEARCH + NEWS COLLECTION","now");
  const queue = await runBatchQueue({draftId:start.draftId,batchIndexes:Array.from({length:start.batchCount},(_,i)=>i),total:start.total,batchSize:start.batchSize,action:"collect-batch"});
  if (!queue.ok) return queue;
  setNowStage("evidence",0,"한국갤럽 · 중앙선거여론조사심의위원회 공개 근거 수집");
  const evidence = await nowApi({ action:"collect-external-evidence", draftId:start.draftId });
  if (!evidence.ok) return evidence;
  setNowStage("evidence",1,`외부근거 ${num(evidence.recordCount)}건 · 정치인 매칭 ${num(evidence.matchedPeople)}명${evidence.warnings?.length ? ` · 경고 ${num(evidence.warnings.length)}건` : ""}`);
  setNowStage("official",0,"선거 · 인구 · 연령×성별 공식자료 수집 및 JCS 정규화");
  const baseline = await nowApi({ action:"collect-age-gender-baseline", draftId:start.draftId });
  if (!baseline.ok) return baseline;
  setNowStage("official",1,`AGE×GENDER ${num(baseline.rosterTotal)}명 · DIRECT ${num(baseline.directCount)} · PARTY ${num(baseline.partyProxyCount)} · REGIONAL ${num(baseline.regionalPartyProxyCount)}`);
  setNowStage("market",0,"정당 · 지역 · 경쟁자 시장맥락 계산 준비");
  const finalized=await finalizeWithPipelineProgress(start.draftId);
  if(finalized?.ok)setNowStage("verify",1,"JCS AGGRESSIVE INTELLIGENCE SNAPSHOT 저장 완료");
  return finalized;
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


async function fetchHistoryStatus(personId="", range="30") {
  return personId ? getAdminHistoryPerson(personId, range) : getAdminHistoryOverview();
}
function historyDelta(value){
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return `<span class="history-v2-delta neutral">관측 부족</span>`;
  const n=Math.round(Number(value)*10)/10;
  return `<span class="history-v2-delta ${n>0?"up":n<0?"down":"neutral"}">${n>0?"+":""}${n}</span>`;
}
function historyCoreCards(person){
  const d=person?.summary?.coreDeltas||{},volatility=person?.summary?.volatility||{},latest=person?.summary?.latest?.scores||{};
  const rows=[['overallInterest','종합 관심'],['highEngagement','심층 관심'],['massExpansion','대중 확산'],['activity','활동성'],['issueHeat','이슈 온도'],['mediaSpread','미디어 확산']];
  return rows.map(([key,label])=>{const vol=Number(volatility[key]);return `<article><small>${label}</small><strong>${latest[key]===null||latest[key]===undefined?'—':Math.round(Number(latest[key]))}</strong>${historyDelta(d[key])}<em>${Number.isFinite(vol)?`변동성 ${Math.round(vol*10)/10}`:'변동성 —'}</em></article>`;}).join('');
}
function historyEvidenceRow(label,value){return value===null||value===undefined||value===''?'':`<span><b>${esc(label)}</b>${esc(String(value))}</span>`;}
function historyObservationMarkup(row={}){
  const full=row.completeness==='FULL',scores=row.intelligence?.scores||{},search=row.external?.search||{},news=row.external?.news||{},signal=row.intelligence?.signal||{};
  const date=String(row.publishedAt||'').slice(0,16).replace('T',' ');
  const headline=(news.headlines||[])[0]?.title||news.latest?.title||'';
  const competitors=Array.isArray(row.related)?row.related.slice(0,4):[];
  const competitorLine=competitors.length?`<p class="history-v2-competitors">경쟁구도 · ${competitors.map(x=>{const p=x.person||{};const name=p.name||p.id||'정치인';const rank=x.globalRank??x.rank;return `${esc(name)} ${rank!==undefined&&rank!==null?`NOW ${esc(String(rank))}위`:''}`;}).join(' · ')}</p>`:'';
  return `<article class="history-v2-observation ${full?'is-full':'is-partial'}"><div class="history-v2-observation-head"><div><span class="history-v2-source">${full?'FULL SNAPSHOT':'LEGACY PARTIAL'}</span><b>${esc(date||row.draftId||'관측 시점')}</b></div><strong>전체 ${row.rank?.global??'—'}위 · 카테고리 ${row.rank?.category??'—'}위</strong></div><div class="history-v2-observation-core">${[['overallInterest','종합'],['highEngagement','심층'],['massExpansion','확산'],['activity','활동'],['issueHeat','이슈'],['mediaSpread','미디어']].map(([key,label])=>`<span><small>${label}</small><b>${scores[key]===undefined?'—':Math.round(Number(scores[key]))}</b></span>`).join('')}</div><div class="history-v2-evidence">${historyEvidenceRow('PC',search.monthlyPcQcCnt)}${historyEvidenceRow('MOBILE',search.monthlyMobileQcCnt)}${historyEvidenceRow('검색합',search.monthlyTotalQcCnt)}${historyEvidenceRow('뉴스24h',news.count24)}${historyEvidenceRow('채널',news.sources24)}</div>${signal.label||row.intelligence?.whyNow?`<div class="history-v2-diagnosis"><b>${esc(signal.label||'당시 분석')}</b><p>${esc(signal.diagnosis||row.intelligence?.whyNow||'')}</p></div>`:''}${competitorLine}${headline?`<p class="history-v2-headline">근거 뉴스 · ${esc(headline)}</p>`:''}</article>`;
}
function historyDailyMarkup(day={}){
  const overall=day.core?.overallInterest||{},rank=day.rank?.global||{};
  return `<article class="history-v2-daily-card"><div><b>${esc(day.date||'')}</b><span>${num(day.observationCount||0)}회 관측 · KST</span></div><div><small>종합관심 평균</small><strong>${overall.average===undefined?'—':esc(String(overall.average))}</strong><span>${overall.low===undefined?'':`최저 ${esc(String(overall.low))} · 최고 ${esc(String(overall.high))}`}</span></div><div><small>전체순위 평균</small><strong>${rank.average===undefined?'—':esc(String(rank.average))}</strong><span>${rank.best===undefined?'':`최고 ${esc(String(rank.best))}위 · 최저 ${esc(String(rank.worst))}위`}</span></div></article>`;
}
function historyEventsMarkup(events=[]){
  if(!events.length)return `<div class="notice-box">이 기간에 연결된 정치 이벤트가 아직 없습니다.</div>`;
  return `<div class="history-v2-events">${events.slice(-20).reverse().map(e=>`<article><span>${esc(String(e.occurredAt||'').slice(0,10))}</span><div><b>${esc(e.title||'정치 이벤트')}</b><small>${esc(e.category||'EVENT')}</small>${e.note?`<p>${esc(e.note)}</p>`:''}</div></article>`).join('')}</div>`;
}
async function historyPanel() {
  const current=params();
  const range=['7','30','90','365','all'].includes(current.range)?current.range:'30';
  const data=await fetchHistoryStatus(current.person,range);
  if(!data.ok)return `<section class="admin-panel"><h2>HISTORY V2</h2><div class="notice-box">상태를 불러오지 못했습니다 · ${esc(data.error||"HISTORY_STATUS_FAILED")}</div></section>`;
  const selected=(data.roster||[]).find(x=>String(x.id)===String(current.person))||null;
  const observations=data.person?.observations||[];
  const rangeButtons=['7','30','90','365','all'].map(value=>`<button type="button" class="${range===value?'active':''}" data-history-range="${value}" data-go="/admin?tab=history${current.person?`&person=${encodeURIComponent(current.person)}`:''}&range=${value}">${value==='all'?'전체':`${value}일`}</button>`).join('');
  const searchSource=(data.roster||[]).map(p=>{const typeLabel=p.type==='assembly'?'국회의원':p.type==='metropolitan'?'광역단체장':'기초단체장';const meta=[typeLabel,p.party,p.jurisdiction].filter(Boolean).join(' · ');const searchText=[p.name,p.party,p.jurisdiction,p.office,typeLabel].filter(Boolean).join(' ');return `<span hidden data-history-search-item data-history-search-id="${esc(p.id)}" data-history-search-text="${esc(searchText)}" data-history-search-name="${esc(p.name)}" data-history-search-meta="${esc(meta)}"></span>`;}).join('');
  const selector=`<div class="history-v2-selector"><div class="history-v2-search-wrap"><label for="history-v2-search">정치인 HISTORY 검색</label><div class="history-v2-search-box"><input id="history-v2-search" type="search" autocomplete="off" data-history-search-input placeholder="이름 · 정당 · 지역으로 검색" value="${esc(selected?.name||'')}"><span aria-hidden="true">⌕</span></div><div class="history-v2-search-results" data-history-search-results hidden></div><div data-history-search-source hidden>${searchSource}</div><small>이름을 입력하면 국회의원 · 광역단체장 · 기초단체장을 바로 찾아 선택할 수 있습니다.</small></div></div>`;
  const daily=data.person?.daily||[],rawSampleSize=Number(data.person?.summary?.rawSampleSize||observations.length),dailySampleSize=Number(data.person?.summary?.dailySampleSize||daily.length);
  const normalizationNote=data.person?.summary?.normalization==='RAW_INTRADAY'?`시간 단위 원본 ${rawSampleSize}회로 단기 변화를 계산합니다.`:`일 단위 정규화 ${dailySampleSize}일 · 원본 ${rawSampleSize}회. 하루 리프레시 횟수가 많아도 장기 추세가 과대평가되지 않습니다.`;
  const dailyBlock=selected&&daily.length&&range!=='7'?`<div class="history-v2-section-title"><h3>DAILY SUMMARY</h3><span>Asia/Seoul · 일 단위 정규화</span></div><div class="history-v2-daily-list">${daily.slice(-14).reverse().map(historyDailyMarkup).join('')}</div>`:'';
  const personBlock=selected?`<section class="history-v2-browser"><div class="history-v2-person-head"><div><span>POLITICAL HISTORY</span><h3>${esc(selected.name)}</h3><p>${esc([selected.party,selected.jurisdiction].filter(Boolean).join(' · '))}</p></div><div class="history-v2-range">${rangeButtons}</div></div><div class="history-v2-normalization"><b>${range==='7'?'INTRADAY':'DAILY NORMALIZED'}</b><span>${esc(normalizationNote)}</span></div><div class="history-v2-core-grid">${historyCoreCards(data.person)}</div>${dailyBlock}<div class="history-v2-section-title"><h3>시간축 관측</h3><span>${observations.length}회 · FULL과 LEGACY PARTIAL을 구분해 표시</span></div>${observations.length?`<div class="history-v2-observations">${observations.slice(-30).reverse().map(historyObservationMarkup).join('')}</div>`:`<div class="notice-box">선택한 기간에 저장된 HISTORY 관측이 없습니다. 현재 기준점 보존 또는 Legacy Backfill 후 확인할 수 있습니다.</div>`}<div class="history-v2-section-title"><h3>정치 이벤트</h3><span>동일 시간축 연결</span></div>${historyEventsMarkup(data.person?.events||[])}</section>`:`<section class="history-v2-browser is-empty"><div class="notice-box">이름 · 정당 · 지역을 검색해 정치인을 선택하면 7일 · 30일 · 90일 · 365일 변화, 당시 6대 지표, 순위, 검색·뉴스 원천값, SIGNAL과 이벤트를 시간축으로 볼 수 있습니다.</div></section>`;
  return `<section class="admin-panel history-data-center history-v2-center">
    <div class="admin-panel-head"><div><h2>HISTORY V2 · POLITICAL INTELLIGENCE</h2><span class="status-pill"><b>INTERNAL INTELLIGENCE</b>INTERNAL_ADMIN</span></div></div>
    <div class="now-data-kpis">
      <article><span>IMMUTABLE SNAPSHOTS</span><strong>${num(data.snapshotCount)}</strong><small>${esc(data.latestDraftId||"아직 V2 Snapshot 없음")}</small></article>
      <article><span>ROSTER</span><strong>${num(data.rosterTotal)}</strong><small>국회의원 299 · 광역 16 · 기초 227</small></article>
      <article><span>CURRENT BASELINE</span><strong>${data.currentCaptured?'SAVED':'READY'}</strong><small>${esc(data.currentDraftId||'NOW 게시 데이터 대기')}</small></article>
      <article><span>BACKFILL PAGE</span><strong>${num(data.backfill?.pageSize||25)}</strong><small>PARTIAL은 없는 값을 0으로 만들지 않음</small></article>
    </div>
    <div class="member-admin-note"><b>오늘의 분석은 사라지지 않는다.</b> 현재 542명 분석을 그대로 보존하고, 이후 게시 시점의 21개 Intelligence 지표·순위·검색·뉴스·SIGNAL을 immutable observation으로 축적합니다.</div>
    <dl class="info-list"><div><dt>NOW</dt><dd>JCS_NOW_V1</dd></div><div><dt>HISTORY V2</dt><dd>JCS_HISTORY_PIPELINE_V2</dd></div><div><dt>DERIVED V2</dt><dd>JCS_DERIVED_V2</dd></div><div><dt>LEGACY COMPAT</dt><dd>JCS_HISTORY_PIPELINE_V1 / JCS_DERIVED_V1</dd></div></dl>
    <div class="history-v2-actions"><button class="primary-btn" type="button" data-history-capture-current ${data.currentCaptured?'disabled':''}>${data.currentCaptured?'현재 기준점 보존 완료':'현재 542명 기준점 보존'}</button><button class="ghost-btn" type="button" data-history-backfill>Legacy History Backfill</button><span class="save-state" data-history-state>${data.currentCaptured?'현재 NOW 기준점이 V2에 안전하게 저장되어 있습니다.':'새 수집 없이 현재 NOW 데이터를 첫 FULL SNAPSHOT으로 저장할 수 있습니다.'}</span></div>
    ${selector}${personBlock}
  </section>`;
}
async function historyApi(body) {
  try {
    const r=await fetch("/api/v3/admin/history",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body)});
    const b=await r.json().catch(()=>({}));return r.ok?b:{ok:false,error:b.error||"HISTORY_API_FAILED"};
  } catch { return {ok:false,error:"HISTORY_API_FAILED"}; }
}
export async function captureHistoryCurrent(){return historyApi({action:"capture-current"});}
export async function runHistoryBackfill() {
  let cursor=0,done=false,result={ok:true,nextCursor:0,total:542};
  const state=document.querySelector("[data-history-state]");
  while(!done) {
    result=await historyApi({action:"backfill",cursor});
    if(!result.ok)return result;
    cursor = Number(result.nextCursor||0);done=Boolean(result.done);
    if(state)state.textContent=`${Math.min(cursor,Number(result.total)||542)} / ${Number(result.total)||542} · FULL Snapshot 중복 ${Number(result.skippedFull)||0}건 제외`;
  }
  return result;
}


async function pushPanel() {
  let status = { ok:false, configured:false, devices:0, latest:[], history:[] };
  try {
    const r = await fetch("/api/v3/action", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json",Accept:"application/json"}, body:JSON.stringify({action:"push-status",payload:{}}) });
    const b = await r.json().catch(()=>({}));
    if (r.ok) status = { ...status, ...b, ok:true }; else status.error = b.error || "PUSH_STATUS_FAILED";
  } catch { status.error = "PUSH_STATUS_FAILED"; }
  const history = (status.history || []).map(item => `<article><div><b>${esc(item.title || "")}</b><span>${esc(String(item.createdAt || "").slice(0,16).replace("T"," "))} · ${item.scope === "test" ? "테스트" : "전체"}</span></div><strong>${Number(item.success || 0)} 성공${Number(item.failed || 0) ? ` · ${Number(item.failed)} 실패` : ""}</strong></article>`).join("");
  return `<section class="admin-panel push-admin-panel">
    <div class="admin-panel-head"><div><h2>푸시 알림 관리</h2><span class="status-pill"><b>FCM</b>${status.configured ? "연결 준비" : "환경변수 필요"}</span></div></div>
    <div class="admin-stat-grid"><article><b>REGISTERED</b><strong>${Number(status.devices || 0)}</strong><span>최근 등록 테스트 기기</span></article><article><b>FIREBASE</b><strong>${status.configured ? "READY" : "SETUP"}</strong><span>${status.configured ? "발송 가능" : "Firebase 연결 전"}</span></article></div>
    <div class="notice-box">첫 테스트는 <b>최근 등록기기 1대 테스트 발송</b>으로 확인한 뒤 전체 테스트기기 발송을 사용하세요. 이미지 없이 텍스트만 보내는 것도 가능합니다.</div>
    <form class="admin-form push-compose-grid" data-push-form>
      <div class="push-compose-fields">
        <label>알림 제목<input name="title" maxlength="80" required value="정참시 새로운 소식"></label>
        <label>알림 내용<textarea name="body" rows="4" maxlength="240" required>정참시에서 새로운 콘텐츠를 확인해보세요.</textarea></label>
        <label>클릭 후 이동 경로<input name="targetUrl" placeholder="/ 또는 /person/assembly-001" value="/"><small>정참시 V3 내부 경로만 허용합니다.</small></label>
        <label>푸시 대표 이미지 · 선택<input type="file" accept="image/jpeg,image/png,image/webp" data-push-image-input></label>
        <div class="push-image-preview" data-push-image-preview data-cover-data=""><span>이미지를 선택하면 큰 이미지 알림으로 미리봅니다</span></div>
        <div class="admin-form-actions"><button class="ghost-btn" type="submit" name="scope" value="test">테스트 발송</button><button class="primary-btn" type="submit" name="scope" value="all">전체 테스트기기 발송</button><span class="save-state" data-push-state></span></div>
      </div>
      <aside class="push-phone-preview"><span>ANDROID PREVIEW</span><div class="push-preview-card" data-push-preview><div class="push-preview-app">정참시 · 지금</div><b data-push-preview-title>정참시 새로운 소식</b><p data-push-preview-body>정참시에서 새로운 콘텐츠를 확인해보세요.</p><div class="push-preview-image" data-push-preview-image hidden></div></div></aside>
    </form>
    <section class="push-history"><div class="section-title"><h3>최근 발송 기록</h3><span>최대 10건 표시</span></div>${history || `<div class="notice-box">아직 발송 기록이 없습니다.</div>`}</section>
  </section>`;
}

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
  else if (tab === "badges") panel = await badgeCenterPanel();
  else if (tab === "requests") panel = await (await import("./participation.js")).renderParticipationAdminPanel();
  else if (tab === "people") panel = await peoplePanel();
  else if (tab === "nowdata") panel = await nowDataPanel();
  else if (tab === "history") panel = await historyPanel();
  else if (tab === "president") panel = await presidentPanel();
  else if (["columns", "community", "news"].includes(tab)) panel = await boardPanel(tab, edit);
  else if (tab === "itsme") panel = await itsmePanel();
  else if (tab === "polls") panel = await pollsPanel();
  else if (tab === "keywords") panel = await listEditorPanel("keywords", "실시간 정치키워드", 15, "정치키워드 | ▲2");
  else if (tab === "trending") panel = await listEditorPanel("trending", "실시간 급상승", 10, "제목 | /column/게시물ID");
  else if (tab === "generation") panel = await generationPanel();
  else if (tab === "national") panel = await nationalEvaluationPanel();
  else if (tab === "academy") panel = await academyPanel();
  else if (tab === "push") panel = await pushPanel();
  else if (tab === "system") panel = await systemPanel();
  else panel = await dashboardPanel();
  return pageShell(`<main class="subpage admin-page"><section class="page-hero"><span class="eyebrow">ADMIN · V3 CLEAN CORE</span><h1>정참시 관리자 <span class="admin-live-pulse admin-live-pulse-hero" data-live-status="ready" aria-hidden="true"><i></i></span></h1><p>Leveraging the Collective Intelligence of Three Leading LLMs and the JEONGCHAMSI Intelligent Data Analysis System, We Deliver Optimized Solutions.</p></section>${adminTabs(tab)}${panel}</main>`);
}

export function syncBrandHeroPreview(form) {
  if (!form?.matches?.('[data-admin-form="brand-settings"]')) return;
  const preview = form.querySelector('[data-hero-live-preview]');
  if (!preview) return;
  const value = name => form.querySelector(`[name="${name}"]`)?.value || "";
  const checked = name => form.querySelector(`[name="${name}"]:checked`)?.value || "default";
  const headline = String(value("productHeadline") || "").trim();
  const accentText = String(value("productAccentText") || "").trim();
  preview.dataset.headlineTone = checked("productHeadlineTone");
  preview.dataset.accentTone = checked("productAccentTone");
  preview.dataset.descriptionTone = checked("productDescriptionTone");
  const kicker = preview.querySelector('[data-hero-preview-kicker]');
  const tagline = preview.querySelector('[data-hero-preview-tagline]');
  const headlineEl = preview.querySelector('[data-hero-preview-headline]');
  const description = preview.querySelector('[data-hero-preview-description]');
  if (kicker) kicker.textContent = value("productKicker") || "JEONGCHAMSI";
  if (tagline) tagline.textContent = value("productTagline") || "정치에 참여할 시간";
  if (description) description.textContent = value("productDescription");
  if (!headlineEl) return;
  headlineEl.replaceChildren();
  const appendText = (target, text) => String(text || "").split("\n").forEach((part, index) => { if (index) target.append(document.createElement("br")); target.append(document.createTextNode(part)); });
  const accentIndex = accentText ? headline.indexOf(accentText) : -1;
  if (accentIndex < 0) { appendText(headlineEl, headline); return; }
  const prefix = headline.slice(0, accentIndex);
  const suffix = headline.slice(accentIndex + accentText.length);
  appendText(headlineEl, prefix);
  if (accentText === "움직이는 것" && !headline.includes("\n") && prefix) headlineEl.append(document.createElement("br"));
  const strong = document.createElement("strong");
  strong.textContent = accentText;
  headlineEl.append(strong);
  appendText(headlineEl, suffix);
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
        productKicker:String(fd.get("productKicker") || "JEONGCHAMSI").trim(),
        productTagline:String(fd.get("productTagline") || "정치에 참여할 시간").trim(),
        productHeadline:String(fd.get("productHeadline") || "정치를 보는 것에서 움직이는 것으로!").trim(),
        productAccentText:String(fd.get("productAccentText") ?? "").trim().slice(0,80),
        productDescription:String(fd.get("productDescription") || "인물·이슈·여론·제안을 한곳에서 보고, 비교하고, 직접 참여하세요").trim(),
        productPrimaryLabel:String(fd.get("productPrimaryLabel") || "정참시 응원하기").trim(),
        productPrimaryHref:String(fd.get("productPrimaryHref") || "/about").trim(),
        productSecondaryLabel:String(fd.get("productSecondaryLabel") || "정참시 후원하기").trim(),
        productSecondaryHref:String(fd.get("productSecondaryHref") || "https://toon.at/donate/jungchamsi").trim(),
        productHeadlineTone:String(fd.get("productHeadlineTone") || "white").trim(),
        productAccentTone:String(fd.get("productAccentTone") || "yellow").trim(),
        productDescriptionTone:String(fd.get("productDescriptionTone") || "mint").trim(),
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
  if (domain === "nationalEvaluation") {
    const data = normalizeNationalEvaluation(await getDomain("nationalEvaluation"));
    const subjectId = String(fd.get("subjectId") || "");
    const nextSubject = /^assembly-\d{3}$/.test(subjectId) ? subjectId : null;
    const current = data.slots.assembly;
    const nowIso = new Date().toISOString();
    if (current?.subjectId && current.subjectId !== nextSubject && current.evaluationId) {
      const votes = votesForEvaluationSlot(data, current);
      data.history = [{ evaluationId:current.evaluationId, slot:"assembly", subjectId:current.subjectId, ...votes, startedAt:current.startedAt || "", closedAt:nowIso }, ...(data.history || []).filter(x=>String(x?.evaluationId||"")!==String(current.evaluationId))].slice(0,200);
    }
    const changed = current?.subjectId !== nextSubject || !!current?.closedAt;
    data.slots.assembly = nextSubject ? { slot:"assembly", evaluationId:changed ? makeNationalEvaluationId("assembly",Date.now(),nextSubject) : current.evaluationId, subjectId:nextSubject, enabled:fd.get("enabled") === "on", startedAt:changed ? nowIso : (current.startedAt || nowIso), updatedAt:nowIso, closedAt:"" } : { slot:"assembly", evaluationId:"", subjectId:null, enabled:false, startedAt:"", updatedAt:nowIso, closedAt:"" };
    data.subjectId = data.slots.assembly.subjectId;
    data.enabled = data.slots.assembly.enabled;
    return saveDomain("nationalEvaluation", data);
  }
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
export function preparePoliticianPhotoPreview(file, previewEl, stateEl) {
  if (!file) return { ok:false, error:"사진을 선택해 주세요" };
  if (!["image/jpeg","image/png","image/webp"].includes(String(file.type || "").toLowerCase())) throw new Error("JPG · PNG · WebP만 사용할 수 있습니다");
  if (file.size > 5 * 1024 * 1024) throw new Error("원본 이미지는 5MB 이하만 사용할 수 있습니다");
  const url = URL.createObjectURL(file);
  if (previewEl) { previewEl.style.backgroundImage = `url('${url}')`; previewEl.textContent = ""; previewEl.hidden = false; }
  if (stateEl) stateEl.textContent = `선택 완료 · 원본 ${photoKb(file.size)} · 저장 시 자동 최적화`;
  return { ok:true };
}

export async function savePoliticianPhotoForm(form) {
  const id = String(form?.dataset?.personId || "").trim();
  const file = form?.querySelector("[data-politician-photo-input]")?.files?.[0];
  if (!id || !file) return { ok:false, error:"새 사진을 선택해 주세요" };
  try {
    const { uploadPoliticianPhotoSet, deletePoliticianPhotoBlobs } = await import("../core/image.js");
    const current = await getDomain("politicianPhotos", { fresh:true });
    const previous = (Array.isArray(current?.items) ? current.items : []).find(x => String(x?.id || "") === id);
    const oldUrls = Object.values(previous?.variants || {}).filter(value => /^https:\/\//i.test(String(value || "")));
    const uploaded = await uploadPoliticianPhotoSet(file, id);
    const newUrls = Object.values(uploaded?.variants || {}).filter(Boolean);
    const response = await fetch("/api/v3/politician-photo", {
      method:"POST",
      credentials:"same-origin",
      headers:{ "Content-Type":"application/json", Accept:"application/json" },
      body:JSON.stringify({ action:"manual-upsert", id, uploaded })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body?.ok) {
      await deletePoliticianPhotoBlobs(newUrls);
      return { ok:false, error:body?.error || "POLITICIAN_PHOTO_SAVE_FAILED" };
    }
    const cleanup = oldUrls.length ? await deletePoliticianPhotoBlobs(oldUrls) : { ok:true, deleted:0 };
    clearPoliticianPhotoCoverageCache();
    return { ok:true, record:body.record, cleanup, message:`저장 완료 · 최적화 ${photoKb(uploaded.bytes.total)}` };
  } catch (error) { return { ok:false, error:error?.message || "정치인 사진 저장 실패" }; }
}


export async function updateMemberAccess(id, patch = {}) {
  try {
    const r = await fetch("/api/v3/admin/users", { method:"PATCH", credentials:"same-origin", headers:{ "Content-Type":"application/json", Accept:"application/json" }, body:JSON.stringify({ id, ...patch }) });
    const b = await r.json().catch(() => ({}));
    return r.ok ? { ok:true, user:b.user } : { ok:false, error:b.error || "MEMBER_UPDATE_FAILED" };
  } catch { return { ok:false, error:"MEMBER_UPDATE_FAILED" }; }
}
export async function saveBadgeCelebrationConfig(form) {
  const enabledBadgeKeys=Array.from(form.querySelectorAll('input[name="badgeKey"]:checked')).map(input=>input.value);
  try {
    const r=await fetch("/api/v3/admin/badges",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({enabledBadgeKeys})});
    const b=await r.json().catch(()=>({}));
    return r.ok?{ok:true,celebration:b.celebration}:{ok:false,error:b.error||"BADGE_CELEBRATION_SAVE_FAILED"};
  } catch { return {ok:false,error:"BADGE_CELEBRATION_SAVE_FAILED"}; }
}
export async function submitFirstAdmin(form) {
  const fd = new FormData(form); if (fd.get("password") !== fd.get("passwordConfirm")) return { ok: false, error: "비밀번호 확인이 일치하지 않습니다" };
  try { const r = await fetch("/api/v3/setup", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ setupKey: fd.get("setupKey"), id: fd.get("id"), nickname: fd.get("nickname"), password: fd.get("password") }) }); const b = await r.json().catch(() => ({})); if (!r.ok) return { ok: false, error: b.error || "SETUP_FAILED" }; await initializeUserState(); return { ok: true }; }
  catch { return { ok: false, error: "SETUP_FAILED" }; }
}


export async function preparePushImage(file, previewEl) {
  const { uploadCoverImage } = await import("../core/image.js");
  const data = await uploadCoverImage(file);
  if (previewEl) {
    previewEl.style.backgroundImage = `url('${data}')`;
    previewEl.dataset.coverData = data;
    previewEl.innerHTML = "";
  }
  return data;
}

export async function sendPushNotification(form, scope = "test") {
  const fd = new FormData(form);
  const payload = {
    title:String(fd.get("title") || ""),
    body:String(fd.get("body") || ""),
    targetUrl:String(fd.get("targetUrl") || "/"),
    image:String(form.querySelector("[data-push-image-preview]")?.dataset.coverData || ""),
    scope:scope === "all" ? "all" : "test"
  };
  try {
    const r = await fetch("/api/v3/action", { method:"POST", credentials:"same-origin", headers:{"Content-Type":"application/json",Accept:"application/json"}, body:JSON.stringify({action:"push-send",payload}) });
    const b = await r.json().catch(()=>({}));
    return r.ok ? {ok:true,...b} : {ok:false,error:b.error || "PUSH_SEND_FAILED"};
  } catch { return {ok:false,error:"PUSH_SEND_FAILED"}; }
}
const APPROVED_ABOUT_INTRO = "세계적으로 유명한 배우들도 끊임없이 훈련합니다.";
const APPROVED_ABOUT_BODY = `작품을 쉬는 기간에는 발성과 호흡,
감정을 전달하는 방법을 배우고 다듬습니다.

작품 중에도 필요한 순간마다
조언을 구하며 자신을 정비합니다.

정치도 다르지 않다고 생각합니다.

정참시는
정치를 하려는 곳도,
정치인이 되려는 곳도 아닙니다.

다만 현장에서 더 나은 방법이 필요할 때,
현장의 시각과는 다른 방향에서 해답을 찾고자 할 때,
의도와는 다르게 난처한 상황을 겪게 될 때,
정참시는 분명한 데이터를 기반으로 더 선명한 방법을 제공합니다.

정참시는 정참시가 가장 잘하는 일을 하겠습니다.

막대한 양의 데이터를 빠짐없이 수집하고,
JCS만의 독자적인 시스템을 통해 분석하고,
시장이 요구하는 신호를 읽어
가장 필요한 순간에 전달하겠습니다.

그다음은 여러분의 몫입니다.
시장을 향해 마음껏 목소리를 내십시오.

목적지를 정하는 것은 여러분입니다.
가장 정확한 길을 찾는 것은 정참시가 하겠습니다.`;
