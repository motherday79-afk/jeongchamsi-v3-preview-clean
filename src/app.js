import { startPerformanceMonitor } from "./performance.js";
import { startRouter, subscribe, currentRoute, route } from "./core/router.js";
import { performAction, clearDomainCache } from "./core/repository.js";
import {
  initializeUserState, loginUser, registerUser, logoutUser, toggleFavoritePerson,
  togglePostLike, applyAcademy, getUserSession, refreshUserActivity, updateMyProfile
} from "./core/user.js";
import { renderHome } from "./views/home.js";
import { renderPersonDetail } from "./views/people.js";
import { renderBoard, renderBoardDetail, renderBoardWriter } from "./views/boards.js";
import {
  renderPresident, renderNow, renderPolls, renderKeywords, renderTrending, renderAcademy,
  renderItsme, renderItsmeWrite, renderItsmeDetail, renderCompare, renderGeneration,
  renderNationalEvaluation, renderSearch
} from "./views/features.js";
import { renderLogin, renderJoin, renderMyPage, renderMyActivity, renderMyRecent, renderMyPosts, renderMyProfile } from "./views/user.js";
import { renderAdmin, prepareCoverPreview, prepareProfilePreview, saveAdminForm, deleteAdminItem, updateMemberAccess, submitFirstAdmin } from "./views/admin.js";

const app = document.querySelector("#app");
let renderEpoch = 0;

function parse(pathname) { return pathname.split("/").filter(Boolean).map(decodeURIComponent); }
async function resolveView(state) {
  const p = parse(state.pathname);
  if (!p.length) return renderHome();
  if (p[0] === "login") return renderLogin();
  if (p[0] === "join") return renderJoin();
  if (p[0] === "mypage" && p[1] === "activity") return renderMyActivity(state.search);
  if (p[0] === "mypage" && p[1] === "recent") return renderMyRecent();
  if (p[0] === "mypage" && p[1] === "profile") return renderMyProfile();
  if (p[0] === "mypage" && p[1] === "posts") return renderMyPosts(state.search);
  if (p[0] === "mypage") return renderMyPage();
  if (p[0] === "person") return renderPersonDetail(p[1] || "");
  if (p[0] === "president") return renderPresident();
  if (p[0] === "now") return renderNow(state.search);
  if (p[0] === "column") return p[1] ? renderBoardDetail("columns", p[1]) : renderBoard("columns");
  if (p[0] === "community" && p[1] === "write") return renderBoardWriter("community", state.search);
  if (p[0] === "community") return p[1] ? renderBoardDetail("community", p[1]) : renderBoard("community");
  if (p[0] === "news") return p[1] ? renderBoardDetail("news", p[1]) : renderBoard("news");
  if (p[0] === "poll") return renderPolls();
  if (p[0] === "keywords") return renderKeywords();
  if (p[0] === "trending") return renderTrending();
  if (p[0] === "academy") return renderAcademy();
  if (p[0] === "itsme" && p[1] === "write") return renderItsmeWrite(state.search);
  if (p[0] === "itsme") return p[1] ? renderItsmeDetail(p[1]) : renderItsme(state.search);
  if (p[0] === "compare") return renderCompare(state.search);
  if (p[0] === "generation-president") return renderGeneration();
  if (p[0] === "national-evaluation") return renderNationalEvaluation();
  if (p[0] === "search") return renderSearch(new URLSearchParams(state.search).get("q") || "");
  if (p[0] === "admin") return renderAdmin();
  return renderHome();
}
async function render(state = currentRoute(), { resetScroll = true } = {}) {
  const epoch = ++renderEpoch;
  const html = await resolveView(state);
  if (epoch !== renderEpoch) return;
  app.innerHTML = html;
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
  const go = event.target.closest("[data-go]");
  if (go) { const to = go.dataset.go; if (to && to !== "#") route(to); return; }
  if (event.target.closest("[data-drawer-open]")) return toggleDrawer(true);
  if (event.target.closest("[data-drawer-close]")) return toggleDrawer(false);
  if (event.target.closest("[data-user-logout]")) { await logoutUser(); route("/", { replace: true }); return render(currentRoute()); }

  const favorite = event.target.closest("[data-person-favorite]");
  if (favorite) { const r = await toggleFavoritePerson(favorite.dataset.personFavorite); if (r.requiresLogin) return route("/login"); if (!r.ok) alert("즐겨찾기 저장에 실패했습니다."); else await render(currentRoute(), { resetScroll: false }); return; }
  const like = event.target.closest("[data-post-like]");
  if (like) { const r = await togglePostLike(like.dataset.postLike, like.dataset.postId); if (r.requiresLogin) return route("/login"); if (!r.ok) alert("좋아요 저장에 실패했습니다."); else await rerenderNoScroll(); return; }
  const academy = event.target.closest("[data-academy-apply]");
  if (academy) { if (!getUserSession().authenticated) return route("/login"); const r = await applyAcademy(academy.dataset.academyApply); if (!r.ok) alert("신청 저장에 실패했습니다."); else await render(currentRoute(), { resetScroll: false }); return; }
  const vote = event.target.closest("[data-poll-vote]");
  if (vote) { if (!getUserSession().authenticated) return route("/login"); vote.disabled = true; const r = await performAction("poll-vote", { pollId: vote.dataset.pollId, optionId: vote.dataset.optionId }); if (!r.ok) alert(r.error === "ALREADY_VOTED" ? "이미 참여한 설문입니다." : "투표 저장에 실패했습니다."); await rerenderNoScroll(); return; }
  const delUser = event.target.closest("[data-user-post-delete]");
  if (delUser) { if (!confirm("이 글을 삭제할까요?")) return; const r = await performAction("user-post-delete", { domain: delUser.dataset.userPostDelete, id: delUser.dataset.id }); if (!r.ok) return alert("삭제하지 못했습니다."); clearDomainCache(); route(delUser.dataset.userPostDelete === "itsme" ? "/itsme" : "/community", { replace: true }); return; }

  const tab = event.target.closest("[data-admin-tab]"); if (tab) return route(`/admin?tab=${encodeURIComponent(tab.dataset.adminTab)}`);
  const add = event.target.closest("[data-admin-new]"); if (add) return route(`/admin?tab=${encodeURIComponent(add.dataset.adminNew)}&edit=new`);
  const edit = event.target.closest("[data-admin-edit]"); if (edit) return route(`/admin?tab=${encodeURIComponent(edit.dataset.adminEdit)}&edit=${encodeURIComponent(edit.dataset.id)}`);
  const cancel = event.target.closest("[data-admin-cancel]"); if (cancel) return route(`/admin?tab=${encodeURIComponent(cancel.dataset.domain)}`);
  const del = event.target.closest("[data-admin-delete]");
  if (del) { if (!confirm("이 항목을 삭제할까요?")) return; const r = await deleteAdminItem(del.dataset.adminDelete, del.dataset.id); if (!r.ok) alert(`삭제 실패: ${r.error || "저장소 오류"}`); else { clearDomainCache(); await render(currentRoute(), { resetScroll: false }); } return; }
  const member = event.target.closest("[data-member-access]");
  if (member) { const id = member.dataset.memberAccess; const role = document.querySelector(`[data-member-role="${CSS.escape(id)}"]`)?.value || "member"; const status = document.querySelector(`[data-member-status="${CSS.escape(id)}"]`)?.value || "active"; const r = await updateMemberAccess(id, role, status); const st = document.querySelector("[data-member-save-state]"); if (st) st.textContent = r.ok ? "저장 완료" : `저장 실패 · ${r.error || ""}`; if (r.ok) await initializeUserState(); return; }
});

document.addEventListener("input", async event => {
  const search = event.target.closest("[data-member-search]");
  if (search) { const q = String(search.value || "").trim().toLowerCase(); document.querySelectorAll("[data-member-row]").forEach(row => row.hidden = !!q && !String(row.dataset.memberSearchText || "").includes(q)); }
  const cover = event.target.closest("[data-cover-input]");
  if (cover?.files?.[0]) { try { await prepareCoverPreview(cover.files[0], cover.closest("form")?.querySelector("[data-cover-preview]")); } catch (e) { alert(e.message || "이미지 처리 실패"); cover.value = ""; } }
  const profile = event.target.closest("[data-profile-input]");
  if (profile?.files?.[0]) { try { await prepareProfilePreview(profile.files[0], profile.closest("form")?.querySelector("[data-profile-preview]")); } catch (e) { alert(e.message || "이미지 처리 실패"); profile.value = ""; } }
});

document.addEventListener("submit", async event => {
  const form = event.target;
  if (form.matches("[data-search-form]")) { event.preventDefault(); const fd = new FormData(form); return route(`/search?q=${encodeURIComponent(String(fd.get("q") || ""))}`); }
  if (form.matches("[data-user-login]")) { event.preventDefault(); const fd = new FormData(form); const r = await loginUser(fd.get("id"), fd.get("password")); const e = form.querySelector("[data-user-auth-error]"); if (!r.ok) { if (e) e.textContent = r.error || "로그인 실패"; return; } route("/mypage", { replace: true }); return; }
  if (form.matches("[data-user-join]")) { event.preventDefault(); const fd = new FormData(form); if (fd.get("password") !== fd.get("passwordConfirm")) { const e=form.querySelector("[data-user-auth-error]"); if(e)e.textContent="비밀번호 확인이 일치하지 않습니다."; return; } const r = await registerUser(Object.fromEntries(fd.entries())); const e=form.querySelector("[data-user-auth-error]"); if(!r.ok){if(e)e.textContent=r.error||"회원가입 실패";return;} route("/mypage",{replace:true}); return; }
  if (form.matches("[data-user-profile-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await updateMyProfile(Object.fromEntries(fd.entries())); const st=form.querySelector("[data-user-profile-state]"); if(!r.ok){if(st)st.textContent=`저장 실패 · ${r.error||""}`;return;} if(st)st.textContent="저장 완료"; await render(currentRoute(), { resetScroll:false }); return; }
  if (form.matches("[data-first-admin-setup]")) { event.preventDefault(); const r = await submitFirstAdmin(form); const e = form.querySelector("[data-admin-setup-error]"); if (!r.ok) { if (e) e.textContent = r.error || "관리자 생성 실패"; return; } route("/admin", { replace: true }); await render(currentRoute()); return; }
  if (form.matches("[data-user-post-form]")) { event.preventDefault(); const fd = new FormData(form); const domain = form.dataset.userPostForm; const r = await performAction("user-post-save", { domain, id: form.dataset.itemId || "", title: fd.get("title"), summary: fd.get("summary"), category: fd.get("category"), body: fd.get("body") }); const e=form.querySelector("[data-user-post-error]"); if(!r.ok){if(e)e.textContent=`저장 실패 · ${r.error||""}`;return;} clearDomainCache(); route(`/${domain === "itsme" ? "itsme" : "community"}/${r.item.id}`, { replace: true }); return; }
  if (form.matches("[data-comment-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("comment-add", { domain: form.dataset.commentForm, postId: form.dataset.postId, text: fd.get("comment") }); const st=form.querySelector("[data-comment-state]"); if(!r.ok){if(st)st.textContent=`등록 실패 · ${r.error||""}`;return;} clearDomainCache("comments"); form.reset(); await render(currentRoute(), { resetScroll: false }); return; }
  if (form.matches("[data-compare-form]")) { event.preventDefault(); const fd = new FormData(form); return route(`/compare?a=${encodeURIComponent(fd.get("a"))}&b=${encodeURIComponent(fd.get("b"))}`); }
  if (form.matches("[data-generation-vote-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("generation-vote", { ageGroup: fd.get("ageGroup"), personId: fd.get("personId") }); const st=form.querySelector("[data-generation-vote-state]"); if(!r.ok){if(st)st.textContent=r.error==="ALREADY_VOTED"?"이 세대 투표에 이미 참여했습니다.":`투표 실패 · ${r.error||""}`;return;} await rerenderNoScroll(); return; }
  if (form.matches("[data-national-evaluation-form]")) { event.preventDefault(); const fd = new FormData(form); const r = await performAction("national-evaluation-vote", { personId: form.dataset.personId, rating: fd.get("rating") }); const st=form.querySelector("[data-national-evaluation-state]"); if(!r.ok){if(st)st.textContent=r.error==="ALREADY_VOTED"?"이미 이 평가에 참여했습니다.":`평가 저장 실패 · ${r.error||""}`;return;} await rerenderNoScroll(); return; }
  if (form.matches("[data-admin-form]")) { event.preventDefault(); const r = await saveAdminForm(form); const st=form.querySelector("[data-save-state]"); if (!r.ok) { if(st) st.textContent=`저장 실패 · ${r.error || "서버 저장소 오류"}`; return; } if(st)st.textContent="저장 완료"; clearDomainCache(); const rawTab=form.dataset.adminForm.replace(/-(settings|list)$/,''); const targetTab=rawTab==="nationalEvaluation"?"national":rawTab; setTimeout(()=>route(`/admin?tab=${encodeURIComponent(targetTab)}`,{replace:true}),150); return; }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") toggleDrawer(false);
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('[role="button"][data-go]')) { event.preventDefault(); route(event.target.dataset.go); }
});

await initializeUserState();
startRouter();
subscribe(state => render(state, { resetScroll: true }));
await render(currentRoute(), { resetScroll: false });
startPerformanceMonitor();
