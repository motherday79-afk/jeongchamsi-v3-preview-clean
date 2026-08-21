import { startPerformanceMonitor } from "./performance.js";
import { startRouter, subscribe, currentRoute, route } from "./core/router.js";
import { performAction, clearDomainCache } from "./core/repository.js";
import {
  initializeUserState, loginUser, registerUser, logoutUser, toggleFavoritePerson,
  togglePostLike, applyAcademy, getUserSession, refreshUserActivity, updateMyProfile
} from "./core/user.js";

const app = document.querySelector("#app");
let renderEpoch = 0;

function parse(pathname) { return pathname.split("/").filter(Boolean).map(decodeURIComponent); }
async function resolveView(state) {
  const p = parse(state.pathname);
  if (!p.length) return (await import("./views/home.js?v=alpha6.0.20-function-detail")).renderHome();
  if (["login", "join", "mypage"].includes(p[0])) {
    const view = await import("./views/user.js?v=alpha6.0.20-function-detail");
    if (p[0] === "login") return view.renderLogin();
    if (p[0] === "join") return view.renderJoin();
    if (p[1] === "activity") return view.renderMyActivity(state.search);
    if (p[1] === "recent") return view.renderMyRecent();
    if (p[1] === "profile") return view.renderMyProfile();
    if (p[1] === "posts") return view.renderMyPosts(state.search);
    return view.renderMyPage();
  }
  if (p[0] === "person") return (await import("./views/people.js?v=alpha6.0.20-function-detail")).renderPersonDetail(p[1] || "");
  if (["column", "community", "news"].includes(p[0])) {
    const view = await import("./views/boards.js?v=alpha6.0.20-function-detail");
    const domain = p[0] === "column" ? "columns" : p[0];
    if (p[1] === "write") return view.renderBoardWriter(domain, state.search);
    return p[1] ? view.renderBoardDetail(domain, p[1]) : view.renderBoard(domain, state.search);
  }
  if (p[0] === "admin") return (await import("./views/admin.js?v=alpha6.0.20-function-detail")).renderAdmin();
  if (["guide","privacy","policy"].includes(p[0])) return (await import("./views/legal.js?v=alpha6.0.20-function-detail")).renderLegal(p[0]);
  const view = await import("./views/features.js?v=alpha6.0.20-function-detail");
  if (p[0] === "president") return view.renderPresident();
  if (p[0] === "now") return view.renderNow(state.search);
  if (p[0] === "poll") return view.renderPolls(state.search);
  if (p[0] === "keywords") return view.renderKeywords();
  if (p[0] === "trending") return view.renderTrending();
  if (p[0] === "academy") return view.renderAcademy();
  if (p[0] === "itsme" && p[1] === "write") return view.renderItsmeWrite(state.search);
  if (p[0] === "itsme") return p[1] ? view.renderItsmeDetail(p[1]) : view.renderItsme(state.search);
  if (p[0] === "compare") return view.renderCompare(state.search);
  if (p[0] === "generation-president") return view.renderGeneration();
  if (p[0] === "national-evaluation") return view.renderNationalEvaluation();
  if (p[0] === "search") return view.renderSearch(new URLSearchParams(state.search).get("q") || "");
  return (await import("./views/home.js?v=alpha6.0.20-function-detail")).renderHome();
}

async function render(state = currentRoute(), { resetScroll = true } = {}) {
  const epoch = ++renderEpoch;
  const html = await resolveView(state);
  if (epoch !== renderEpoch) return;
  app.innerHTML = html;
  if (app.querySelector("[data-region-province]")) (await import("./data/regions.js")).hydrateRegionSelectors(app);
  document.body.classList.remove("drawer-open");
  if (resetScroll) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}
function toggleDrawer(open) {
  const drawer = document.querySelector("[data-drawer]");
  const backdrop = document.querySelector(".drawer-backdrop");
  if (!drawer || !backdrop) return;
  drawer.hidden = !open; backdrop.hidden = !open; document.body.classList.toggle("drawer-open", open);
}
async function rerenderNoScroll() { clearDomainCache(); await refreshUserActivity(); await render(currentRoute(), { resetScroll: false }); }

document.addEventListener("click", async event => {
  const quickSelect = event.target.closest("[data-person-quick-option]");
  if (quickSelect) {
    const select = document.querySelector(quickSelect.dataset.selectTarget || "");
    const input = document.querySelector(quickSelect.dataset.inputTarget || "");
    const results = quickSelect.closest(".person-quick-results");
    if (select) { select.value = quickSelect.dataset.personQuickOption || ""; select.dispatchEvent(new Event("change", { bubbles:true })); }
    if (input) input.value = quickSelect.dataset.label || quickSelect.textContent.trim();
    if (results) results.hidden = true;
    return;
  }
  const go = event.target.closest("[data-go]");
  if (go) { const to = go.dataset.go; if (to && to !== "#") route(to); return; }
  if (event.target.closest("[data-drawer-open]")) return toggleDrawer(true);
  if (event.target.closest("[data-drawer-close]")) return toggleDrawer(false);
  const viewMode = event.target.closest("[data-view-mode]");
  if (viewMode) {
    const mode = viewMode.dataset.viewMode;
    try {
      if (mode === "desktop") localStorage.setItem("jcv3:view-mode", "desktop");
      else localStorage.removeItem("jcv3:view-mode");
    } catch {}
    window.location.reload();
    return;
  }
  if (event.target.closest("[data-user-logout]")) { await logoutUser(); route("/", { replace: true }); return render(currentRoute()); }

  const favorite = event.target.closest("[data-person-favorite]");
  if (favorite) { const r = await toggleFavoritePerson(favorite.dataset.personFavorite); if (r.requiresLogin) return route("/login"); if (!r.ok) alert("즐겨찾기 저장에 실패했습니다."); else await render(currentRoute(), { resetScroll: false }); return; }
  const like = event.target.closest("[data-post-like]");
  if (like) {
    if (!getUserSession().authenticated) return route("/login");
    const wasActive = like.classList.contains("active");
    like.classList.toggle("active", !wasActive);
    like.textContent = wasActive ? "♡ 좋아요" : "♥ 좋아요 취소";
    like.disabled = true;
    const r = await togglePostLike(like.dataset.postLike, like.dataset.postId);
    if (!r.ok) {
      like.classList.toggle("active", wasActive);
      like.textContent = wasActive ? "♥ 좋아요 취소" : "♡ 좋아요";
      like.disabled = false;
      alert("좋아요 저장에 실패했습니다.");
    } else await rerenderNoScroll();
    return;
  }
  const academy = event.target.closest("[data-academy-apply]");
  if (academy) { if (!getUserSession().authenticated) return route("/login"); const r = await applyAcademy(academy.dataset.academyApply); if (!r.ok) alert("신청 저장에 실패했습니다."); else await render(currentRoute(), { resetScroll: false }); return; }
  const pollSelect = event.target.closest("[data-poll-select]");
  if (pollSelect) {
    const scope = pollSelect.closest("[data-poll-scope]");
    if (!scope || pollSelect.disabled) return;
    scope.dataset.selectedOption = pollSelect.dataset.optionId || "";
    scope.querySelectorAll("[data-poll-select]").forEach(button => {
      const selected = button === pollSelect;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected ? "true" : "false");
    });
    const confirmButton = scope.querySelector("[data-poll-confirm]");
    const stateLabel = scope.querySelector("[data-poll-select-state]");
    if (confirmButton) confirmButton.disabled = false;
    if (stateLabel) stateLabel.textContent = "선택 완료 · 확인을 누르면 투표됩니다.";
    return;
  }
  const pollConfirm = event.target.closest("[data-poll-confirm]");
  if (pollConfirm) {
    const scope = pollConfirm.closest("[data-poll-scope]");
    const optionId = scope?.dataset.selectedOption || "";
    const pollId = scope?.dataset.pollId || "";
    if (!optionId || !pollId) return;
    if (!getUserSession().authenticated) return route("/login");
    pollConfirm.disabled = true;
    const r = await performAction("poll-vote", { pollId, optionId });
    if (!r.ok) {
      pollConfirm.disabled = false;
      alert(r.error === "ALREADY_VOTED" ? "이미 참여한 설문입니다." : "투표 저장에 실패했습니다.");
      return;
    }
    await rerenderNoScroll();
    return;
  }
  const delUser = event.target.closest("[data-user-post-delete]");
  if (delUser) { if (!confirm("이 글을 삭제할까요?")) return; const domain = delUser.dataset.userPostDelete; const r = await performAction("user-post-delete", { domain, id: delUser.dataset.id }); if (!r.ok) return alert(`삭제하지 못했습니다. ${r.error || ""}`); clearDomainCache(); const target = { itsme:"/itsme", community:"/community", columns:"/column", news:"/news" }[domain] || "/"; route(target, { replace: true }); return; }

  const tab = event.target.closest("[data-admin-tab]"); if (tab) return route(`/admin?tab=${encodeURIComponent(tab.dataset.adminTab)}`);
  const add = event.target.closest("[data-admin-new]"); if (add) return route(`/admin?tab=${encodeURIComponent(add.dataset.adminNew)}&edit=new`);
  const edit = event.target.closest("[data-admin-edit]"); if (edit) return route(`/admin?tab=${encodeURIComponent(edit.dataset.adminEdit)}&edit=${encodeURIComponent(edit.dataset.id)}`);
  const cancel = event.target.closest("[data-admin-cancel]"); if (cancel) return route(`/admin?tab=${encodeURIComponent(cancel.dataset.domain)}`);
  const del = event.target.closest("[data-admin-delete]");
  if (del) { if (!confirm("이 항목을 삭제할까요?")) return; const r = await (await import("./views/admin.js?v=alpha6.0.20-function-detail")).deleteAdminItem(del.dataset.adminDelete, del.dataset.id); if (!r.ok) alert(`삭제 실패: ${r.error || "저장소 오류"}`); else { clearDomainCache(); await render(currentRoute(), { resetScroll: false }); } return; }
  const member = event.target.closest("[data-member-access]");
  if (member) { const id = member.dataset.memberAccess; const role = document.querySelector(`[data-member-role="${CSS.escape(id)}"]`)?.value || "member"; const status = document.querySelector(`[data-member-status="${CSS.escape(id)}"]`)?.value || "active"; const r = await (await import("./views/admin.js?v=alpha6.0.20-function-detail")).updateMemberAccess(id, role, status); const st = document.querySelector("[data-member-save-state]"); if (st) st.textContent = r.ok ? "저장 완료" : `저장 실패 · ${r.error || ""}`; if (r.ok) await initializeUserState(); return; }
});

document.addEventListener("input", async event => {
  const search = event.target.closest("[data-member-search]");
  if (search) { const q = String(search.value || "").trim().toLowerCase(); document.querySelectorAll("[data-member-row]").forEach(row => row.hidden = !!q && !String(row.dataset.memberSearchText || "").includes(q)); }
  const quickSearch = event.target.closest("[data-person-quick-search]");
  if (quickSearch) {
    const select = document.querySelector(quickSearch.dataset.personQuickSearch || "");
    const results = document.querySelector(quickSearch.dataset.personQuickResults || "");
    if (select && results) {
      const q = String(quickSearch.value || "").trim().toLowerCase().replace(/\s+/g,"");
      const options = Array.from(select.options).slice(1);
      const matches = q ? options.filter(opt => `${opt.textContent || ""} ${opt.value || ""}`.toLowerCase().replace(/\s+/g,"").includes(q)).slice(0,6) : [];
      results.innerHTML = matches.map(opt => `<button type="button" data-person-quick-option="${String(opt.value).replace(/"/g,"&quot;")}" data-label="${String(opt.textContent||"").replace(/"/g,"&quot;")}" data-select-target="${quickSearch.dataset.personQuickSearch}" data-input-target="#${quickSearch.id}"><b>${opt.textContent}</b><span>바로 선택</span></button>`).join("");
      results.hidden = !matches.length;
    }
  }
  const personFilter = event.target.closest("[data-person-select-filter]");
  if (personFilter) {
    const select = document.querySelector(personFilter.dataset.personSelectFilter || "");
    if (select) {
      const q = String(personFilter.value || "").trim().toLowerCase();
      Array.from(select.options).forEach((opt, i) => { if (i) opt.hidden = !!q && !String(opt.textContent || "").toLowerCase().includes(q) && !String(opt.value || "").toLowerCase().includes(q); });
      const first = Array.from(select.options).find((opt, i) => i && !opt.hidden);
      if (q && first && !select.value) first.scrollIntoView?.({ block: "nearest" });
    }
  }
  const cover = event.target.closest("[data-cover-input]");
  if (cover?.files?.[0]) { try { await (await import("./views/admin.js?v=alpha6.0.20-function-detail")).prepareCoverPreview(cover.files[0], cover.closest("form")?.querySelector("[data-cover-preview]")); } catch (e) { alert(e.message || "이미지 처리 실패"); cover.value = ""; } }
  const profile = event.target.closest("[data-profile-input]");
  if (profile?.files?.[0]) { try { await (await import("./views/admin.js?v=alpha6.0.20-function-detail")).prepareProfilePreview(profile.files[0], profile.closest("form")?.querySelector("[data-profile-preview]")); } catch (e) { alert(e.message || "이미지 처리 실패"); profile.value = ""; } }
});

document.addEventListener("change", async event => {
  const region = event.target.closest("[data-region-province],[data-region-city]");
  if (region) (await import("./data/regions.js")).handleRegionChange(region);
});

document.addEventListener("submit", async event => {
  const form = event.target;
  if (form.matches("[data-search-form]")) { event.preventDefault(); const fd = new FormData(form); return route(`/search?q=${encodeURIComponent(String(fd.get("q") || ""))}`); }
  if (form.matches("[data-user-login]")) { event.preventDefault(); const fd = new FormData(form); const r = await loginUser(fd.get("id"), fd.get("password")); const e = form.querySelector("[data-user-auth-error]"); if (!r.ok) { if (e) e.textContent = r.error || "로그인 실패"; return; } route("/mypage", { replace: true }); return; }
  if (form.matches("[data-user-join]")) { event.preventDefault(); const fd = new FormData(form); if (fd.get("password") !== fd.get("passwordConfirm")) { const e=form.querySelector("[data-user-auth-error]"); if(e)e.textContent="비밀번호 확인이 일치하지 않습니다."; return; } const r = await registerUser(Object.fromEntries(fd.entries())); const e=form.querySelector("[data-user-auth-error]"); if(!r.ok){if(e)e.textContent=r.error||"회원가입 실패";return;} route("/mypage",{replace:true}); return; }
  if (form.matches("[data-user-profile-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await updateMyProfile(Object.fromEntries(fd.entries())); const st=form.querySelector("[data-user-profile-state]"); if(!r.ok){if(st)st.textContent=`저장 실패 · ${r.error||""}`;return;} if(st)st.textContent="저장 완료"; await render(currentRoute(), { resetScroll:false }); return; }
  if (form.matches("[data-first-admin-setup]")) { event.preventDefault(); const r = await (await import("./views/admin.js?v=alpha6.0.20-function-detail")).submitFirstAdmin(form); const e = form.querySelector("[data-admin-setup-error]"); if (!r.ok) { if (e) e.textContent = r.error || "관리자 생성 실패"; return; } route("/admin", { replace: true }); await render(currentRoute()); return; }
  if (form.matches("[data-user-post-form]")) { event.preventDefault(); const fd = new FormData(form); const domain = form.dataset.userPostForm; const coverImage = form.querySelector("[data-cover-preview]")?.dataset.coverData || ""; const r = await performAction("user-post-save", { domain, id: form.dataset.itemId || "", title: fd.get("title"), summary: fd.get("summary"), category: fd.get("category"), body: fd.get("body"), coverImage }); const e=form.querySelector("[data-user-post-error]"); if(!r.ok){ const messages={ ITSME_TITLE_TOO_LONG:"IT’S ME 제목은 30자까지 입력할 수 있습니다.", ITSME_SUMMARY_TOO_LONG:"IT’S ME 요약은 15자까지 입력할 수 있습니다.", ITSME_BODY_TOO_LONG:"IT’S ME 내용은 3,000자까지 입력할 수 있습니다." }; if(e)e.textContent=messages[r.error]||`저장 실패 · ${r.error||""}`;return;} clearDomainCache(); const base = { itsme:"itsme", community:"community", columns:"column", news:"news" }[domain] || "community"; route(`/${base}/${r.item.id}`, { replace: true }); return; }
  if (form.matches("[data-comment-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("comment-add", { domain: form.dataset.commentForm, postId: form.dataset.postId, text: fd.get("comment") }); const st=form.querySelector("[data-comment-state]"); if(!r.ok){if(st)st.textContent=`등록 실패 · ${r.error||""}`;return;} clearDomainCache("comments"); form.reset(); await render(currentRoute(), { resetScroll: false }); return; }
  if (form.matches("[data-compare-form]")) { event.preventDefault(); const fd = new FormData(form); return route(`/compare?a=${encodeURIComponent(fd.get("a"))}&b=${encodeURIComponent(fd.get("b"))}`); }
  if (form.matches("[data-generation-vote-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("generation-vote", { ageGroup: fd.get("ageGroup"), personId: fd.get("personId") }); const st=form.querySelector("[data-generation-vote-state]"); if(!r.ok){if(st)st.textContent=r.error==="ALREADY_VOTED"?"이 세대 투표에 이미 참여했습니다.":`투표 실패 · ${r.error||""}`;return;} await rerenderNoScroll(); return; }
  if (form.matches("[data-national-evaluation-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("national-evaluation-vote", { personId: form.dataset.personId, rating: fd.get("rating") }); const st=form.querySelector("[data-national-evaluation-state]"); if(!r.ok){if(st)st.textContent=r.error==="ALREADY_VOTED"?"이미 이 평가에 참여했습니다.":`평가 저장 실패 · ${r.error||""}`;return;} await rerenderNoScroll(); return; }
  if (form.matches("[data-admin-form]")) { event.preventDefault(); const r = await (await import("./views/admin.js?v=alpha6.0.20-function-detail")).saveAdminForm(form); const st=form.querySelector("[data-save-state]"); if (!r.ok) { if(st) st.textContent=`저장 실패 · ${r.error || "서버 저장소 오류"}`; return; } if(st)st.textContent="저장 완료"; clearDomainCache(); const rawTab=form.dataset.adminForm.replace(/-(settings|list)$/,''); const targetTab=rawTab==="nationalEvaluation"?"national":rawTab==="academy"?"academy":rawTab; setTimeout(()=>route(`/admin?tab=${encodeURIComponent(targetTab)}`,{replace:true}),150); return; }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") toggleDrawer(false);
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('[role="button"][data-go]')) { event.preventDefault(); route(event.target.dataset.go); }
});

function requiresUserBeforeFirstPaint(state) {
  const p = parse(state.pathname);
  if (["login","join","mypage","admin"].includes(p[0])) return true;
  if (["column","community","news"].includes(p[0]) && p[1] === "write") return true;
  if (p[0] === "itsme" && p[1] === "write") return true;
  return false;
}

startPerformanceMonitor();
startRouter();
subscribe(state => render(state, { resetScroll: true }));

const initialState = currentRoute();
document.documentElement.classList.add("jcv3-user-pending");
if (requiresUserBeforeFirstPaint(initialState)) {
  await initializeUserState();
  document.documentElement.classList.remove("jcv3-user-pending");
  await render(initialState, { resetScroll: false });
} else {
  const userInit = initializeUserState();
  await render(initialState, { resetScroll: false });
  await userInit;
  document.documentElement.classList.remove("jcv3-user-pending");
  await render(currentRoute(), { resetScroll: false });
}
