import { startPerformanceMonitor } from "./performance.js";
import { startRouter, subscribe, currentRoute, route } from "./core/router.js";
import { performAction } from "./core/repository.js";
import {
  loginUser,
  registerUser,
  logoutUser,
  toggleFavoritePerson,
  togglePostLike,
  addComment,
  applyAcademy,
  getUserSession,
  hasVotedPoll,
  recordPollVote,
  recordAuthoredPost,
  removeAuthoredPost
} from "./core/user.js";
import { renderHome } from "./views/home.js";
import {
  renderAssemblyDirectory,
  renderLocalLeaderDirectory,
  renderMetropolitanDirectory,
  renderBasicDirectory,
  renderPersonDetail
} from "./views/people.js";
import { renderBoard, renderBoardDetail, renderBoardWriter } from "./views/boards.js";
import {
  renderPresident,
  renderNow,
  renderPolls,
  renderKeywords,
  renderTrending,
  renderAcademy,
  renderItsme,
  renderItsmeWrite,
  renderItsmeDetail,
  renderCompare,
  renderGeneration,
  renderNationalEvaluation,
  renderSearch
} from "./views/features.js";
import { renderLogin, renderJoin, renderMyPage, renderMyActivity, renderMyRecent } from "./views/user.js";
import {
  renderAdmin,
  submitAdminLogin,
  logout as logoutAdmin,
  prepareCoverPreview,
  saveAdminForm,
  deleteAdminItem,
  updateMemberAccess
} from "./views/admin.js";

const app = document.querySelector("#app");
let renderEpoch = 0;

function parse(pathname) {
  return pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

async function resolveView(state) {
  const parts = parse(state.pathname);

  if (parts.length === 0) return renderHome();
  if (parts[0] === "login") return renderLogin();
  if (parts[0] === "join") return renderJoin();
  if (parts[0] === "mypage" && parts[1] === "activity") return renderMyActivity();
  if (parts[0] === "mypage" && parts[1] === "recent") return renderMyRecent();
  if (parts[0] === "mypage") return renderMyPage();

  if (parts[0] === "assembly") return renderAssemblyDirectory();
  if (parts[0] === "local-leaders" && parts[1] === "metropolitan") return renderMetropolitanDirectory();
  if (parts[0] === "local-leaders" && parts[1] === "basic") return renderBasicDirectory();
  if (parts[0] === "local-leaders") return renderLocalLeaderDirectory();
  if (parts[0] === "person") return renderPersonDetail(parts[1] || "");

  if (parts[0] === "president") return renderPresident();
  if (parts[0] === "now") return renderNow(state.search);
  if (parts[0] === "column") return parts[1] ? renderBoardDetail("columns", parts[1]) : renderBoard("columns");
  if (parts[0] === "community" && parts[1] === "write") return renderBoardWriter("community", state.search);
  if (parts[0] === "community") return parts[1] ? renderBoardDetail("community", parts[1]) : renderBoard("community");
  if (parts[0] === "news") return parts[1] ? renderBoardDetail("news", parts[1]) : renderBoard("news");
  if (parts[0] === "poll") return renderPolls();
  if (parts[0] === "keywords") return renderKeywords();
  if (parts[0] === "trending") return renderTrending();
  if (parts[0] === "academy") return renderAcademy();
  if (parts[0] === "itsme" && parts[1] === "write") return renderItsmeWrite(state.search);
  if (parts[0] === "itsme") return parts[1] ? renderItsmeDetail(parts[1]) : renderItsme(state.search);
  if (parts[0] === "compare") return renderCompare();
  if (parts[0] === "generation-president") return renderGeneration();
  if (parts[0] === "national-evaluation") return renderNationalEvaluation();
  if (parts[0] === "search") return renderSearch(new URLSearchParams(state.search).get("q") || "");
  if (parts[0] === "admin") return renderAdmin();

  return renderHome();
}

async function render(state = currentRoute(), { resetScroll = true } = {}) {
  const epoch = ++renderEpoch;
  const html = await resolveView(state);
  if (epoch !== renderEpoch) return;

  app.innerHTML = html;
  document.body.classList.remove("drawer-open");

  if (resetScroll) window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  if (state.hash) requestAnimationFrame(() => document.querySelector(state.hash)?.scrollIntoView({ block: "start" }));
}

function toggleDrawer(open) {
  const drawer = document.querySelector("[data-drawer]");
  const backdrop = document.querySelector(".drawer-backdrop");
  if (!drawer || !backdrop) return;
  drawer.hidden = !open;
  backdrop.hidden = !open;
  document.body.classList.toggle("drawer-open", open);
}

async function vote(button) {
  const session = getUserSession();
  if (!session.authenticated) {
    route("/login");
    return;
  }
  const pollId = button.dataset.pollId;
  const optionId = button.dataset.optionId;
  if (!pollId || !optionId) return;
  if (hasVotedPoll(pollId)) {
    alert("이미 참여한 설문입니다.");
    return;
  }
  button.disabled = true;
  const result = await performAction("poll-vote", { pollId, optionId });
  if (result.ok) {
    recordPollVote(pollId, optionId);
    await render(currentRoute(), { resetScroll: false });
  } else {
    button.disabled = false;
    if (result.error === "ALREADY_VOTED") {
      recordPollVote(pollId, optionId);
      alert("이미 참여한 설문입니다.");
      await render(currentRoute(), { resetScroll: false });
    } else alert("투표 저장에 실패했습니다.");
  }
}

async function handlePostLike(button) {
  const domain = button.dataset.postLike;
  const postId = button.dataset.postId;
  const result = togglePostLike(domain, postId);
  if (result.requiresLogin) {
    route("/login");
    return;
  }
  if (!result.ok) return;
  await performAction("post-like", { domain, postId, delta: result.active ? 1 : -1 });
  await render(currentRoute(), { resetScroll: false });
}

async function deleteUserPost(button) {
  const session = getUserSession();
  if (!session.authenticated) return route("/login");
  if (!confirm("이 글을 삭제할까요?")) return;
  const domain = button.dataset.userPostDelete;
  const id = button.dataset.id;
  const result = await performAction("user-post-delete", { domain, id, ownerId: session.user.id });
  if (!result.ok) return alert("삭제하지 못했습니다.");
  removeAuthoredPost(domain, id);
  route(domain === "itsme" ? "/itsme" : "/community", { replace: true });
}

document.addEventListener("click", async event => {
  const go = event.target.closest("[data-go]");
  if (go) {
    const to = go.dataset.go;
    if (to && to !== "#") route(to);
    return;
  }

  if (event.target.closest("[data-drawer-open]")) return toggleDrawer(true);
  if (event.target.closest("[data-drawer-close]")) return toggleDrawer(false);

  if (event.target.closest("[data-user-logout]")) {
    await logoutUser();
    route("/", { replace: true });
    await render(currentRoute(), { resetScroll: true });
    return;
  }

  const favorite = event.target.closest("[data-person-favorite]");
  if (favorite) {
    const result = toggleFavoritePerson(favorite.dataset.personFavorite);
    if (result.requiresLogin) return route("/login");
    await render(currentRoute(), { resetScroll: false });
    return;
  }

  const postLike = event.target.closest("[data-post-like]");
  if (postLike) return handlePostLike(postLike);

  const academy = event.target.closest("[data-academy-apply]");
  if (academy) {
    const result = applyAcademy(academy.dataset.academyApply);
    if (result.requiresLogin) return route("/login");
    if (result.ok) await render(currentRoute(), { resetScroll: false });
    return;
  }

  const pollVote = event.target.closest("[data-poll-vote]");
  if (pollVote) return vote(pollVote);

  const userDelete = event.target.closest("[data-user-post-delete]");
  if (userDelete) return deleteUserPost(userDelete);

  const tab = event.target.closest("[data-admin-tab]");
  if (tab) return route(`/admin?tab=${encodeURIComponent(tab.dataset.adminTab)}`);

  const add = event.target.closest("[data-admin-new]");
  if (add) return route(`/admin?tab=${encodeURIComponent(add.dataset.adminNew)}&edit=new`);

  const edit = event.target.closest("[data-admin-edit]");
  if (edit) return route(`/admin?tab=${encodeURIComponent(edit.dataset.adminEdit)}&edit=${encodeURIComponent(edit.dataset.id)}`);

  const cancel = event.target.closest("[data-admin-cancel]");
  if (cancel) return route(`/admin?tab=${encodeURIComponent(cancel.dataset.domain)}`);

  const del = event.target.closest("[data-admin-delete]");
  if (del) {
    if (!confirm("이 항목을 삭제할까요?")) return;
    del.disabled = true;
    await deleteAdminItem(del.dataset.adminDelete, del.dataset.id);
    await render(currentRoute(), { resetScroll: false });
    return;
  }

  const memberAccess = event.target.closest("[data-member-access]");
  if (memberAccess) {
    const id = memberAccess.dataset.memberAccess;
    const role = document.querySelector(`[data-member-role="${CSS.escape(id)}"]`)?.value || "member";
    const status = document.querySelector(`[data-member-status="${CSS.escape(id)}"]`)?.value || "active";
    memberAccess.disabled = true;
    const result = await updateMemberAccess(id, role, status);
    const state = document.querySelector("[data-member-save-state]");
    if (state) state.textContent = result.ok ? `저장 완료 · ${result.mode || ""}` : `저장 실패 · ${result.error || ""}`;
    memberAccess.disabled = false;
    if (result.ok) await render(currentRoute(), { resetScroll: false });
    return;
  }

  if (event.target.closest("[data-admin-logout]")) {
    await logoutAdmin();
    route("/admin", { replace: true });
    await render(currentRoute(), { resetScroll: true });
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") toggleDrawer(false);
  if ((event.key === "Enter" || event.key === " ") && event.target.matches('[role="button"][data-go]')) {
    event.preventDefault();
    route(event.target.dataset.go);
  }
});

document.addEventListener("input", event => {
  const search = event.target.closest("[data-member-search]");
  if (!search) return;
  const q = String(search.value || "").trim().toLowerCase();
  document.querySelectorAll("[data-member-row]").forEach(row => {
    row.hidden = !!q && !String(row.dataset.memberSearchText || "").includes(q);
  });
});

document.addEventListener("change", async event => {
  const input = event.target.closest("[data-cover-input]");
  if (input) await prepareCoverPreview(input);
});

document.addEventListener("submit", async event => {
  const search = event.target.closest("[data-search-form]");
  if (search) {
    event.preventDefault();
    const fd = new FormData(search);
    route(`/search?q=${encodeURIComponent(String(fd.get("q") || ""))}`);
    return;
  }

  const userLogin = event.target.closest("[data-user-login]");
  if (userLogin) {
    event.preventDefault();
    const fd = new FormData(userLogin);
    const result = await loginUser(fd.get("id"), fd.get("password"));
    const error = userLogin.querySelector("[data-user-auth-error]");
    if (!result.ok) {
      if (error) error.textContent = result.error || "로그인에 실패했습니다.";
      return;
    }
    route("/mypage", { replace: true });
    return;
  }

  const userJoin = event.target.closest("[data-user-join]");
  if (userJoin) {
    event.preventDefault();
    const fd = new FormData(userJoin);
    const result = await registerUser(Object.fromEntries(fd.entries()));
    const error = userJoin.querySelector("[data-user-auth-error]");
    if (!result.ok) {
      if (error) error.textContent = result.error || "회원가입에 실패했습니다.";
      return;
    }
    route("/mypage", { replace: true });
    return;
  }

  const userPost = event.target.closest("[data-user-post-form]");
  if (userPost) {
    event.preventDefault();
    const session = getUserSession();
    if (!session.authenticated) return route("/login");
    const fd = new FormData(userPost);
    const domain = userPost.dataset.userPostForm;
    const result = await performAction("user-post-save", {
      domain,
      id: userPost.dataset.itemId || "",
      title: fd.get("title"),
      summary: fd.get("summary"),
      category: fd.get("category"),
      body: fd.get("body"),
      ownerId: session.user.id,
      author: session.user.nickname || session.user.id
    });
    const error = userPost.querySelector("[data-user-post-error]");
    if (!result.ok) {
      if (error) error.textContent = result.error || "글 저장에 실패했습니다.";
      return;
    }
    const id = result.item?.id || userPost.dataset.itemId;
    if (id) recordAuthoredPost(domain, id);
    route(domain === "itsme" ? `/itsme/${encodeURIComponent(id)}` : `/community/${encodeURIComponent(id)}`, { replace: true });
    return;
  }

  const comment = event.target.closest("[data-comment-form]");
  if (comment) {
    event.preventDefault();
    const fd = new FormData(comment);
    const result = addComment(comment.dataset.commentForm, comment.dataset.postId, fd.get("comment"));
    if (result.requiresLogin) return route("/login");
    const state = comment.querySelector("[data-comment-state]");
    if (!result.ok) {
      if (state) state.textContent = result.error || "댓글 저장 실패";
      return;
    }
    const saved = await performAction("comment-add", {
      domain: comment.dataset.commentForm,
      postId: comment.dataset.postId,
      ownerId: result.comment.ownerId,
      author: result.comment.author,
      text: result.comment.text
    });
    if (!saved.ok && state) state.textContent = "댓글 저장 실패";
    await render(currentRoute(), { resetScroll: false });
    return;
  }

  const adminLogin = event.target.closest("[data-admin-login]");
  if (adminLogin) {
    event.preventDefault();
    const ok = await submitAdminLogin(adminLogin);
    if (ok) {
      history.replaceState({}, "", "/admin?tab=dashboard");
      await render(currentRoute(), { resetScroll: true });
    }
    return;
  }

  const adminForm = event.target.closest("[data-admin-form]");
  if (adminForm) {
    event.preventDefault();
    const state = adminForm.querySelector("[data-save-state]");
    try {
      const result = await saveAdminForm(adminForm);
      if (state) state.textContent = `저장 완료 · ${result.mode}`;
      const domain = adminForm.dataset.adminForm === "itsmeCategories" ? "itsme" : adminForm.dataset.adminForm;
      setTimeout(() => route(`/admin?tab=${encodeURIComponent(domain)}`), 250);
    } catch (error) {
      if (state) state.textContent = error.message || "저장 실패";
    }
  }
});

startRouter();
subscribe(state => render(state, { resetScroll: true }));
addEventListener("jcv3:home-updated", () => {
  if (currentRoute().pathname === "/") render(currentRoute(), { resetScroll: false });
});
await render(currentRoute(), { resetScroll: false });
startPerformanceMonitor();
