import { startPerformanceMonitor } from "./performance.js";
import { startRouter, subscribe, currentRoute, route } from "./core/router.js";
import { performAction } from "./core/repository.js";
import { renderHome } from "./views/home.js";
import { renderAssemblyDirectory, renderLocalLeaderDirectory, renderMetropolitanDirectory, renderBasicDirectory, renderPersonDetail } from "./views/people.js";
import { renderBoard, renderBoardDetail } from "./views/boards.js";
import {
  renderPresident,
  renderNow,
  renderPolls,
  renderAcademy,
  renderItsme,
  renderCompare,
  renderGeneration,
  renderNationalEvaluation,
  renderSearch
} from "./views/features.js";
import {
  renderAdmin,
  submitAdminLogin,
  logout,
  prepareCoverPreview,
  saveAdminForm,
  deleteAdminItem
} from "./views/admin.js";

const app = document.querySelector("#app");
let renderEpoch = 0;

function parse(pathname) {
  return pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

async function resolveView(state) {
  const parts = parse(state.pathname);
  if (parts.length === 0) return renderHome();
  if (parts[0] === "assembly") return renderAssemblyDirectory();
  if (parts[0] === "local-leaders" && parts[1] === "metropolitan") return renderMetropolitanDirectory();
  if (parts[0] === "local-leaders" && parts[1] === "basic") return renderBasicDirectory();
  if (parts[0] === "local-leaders") return renderLocalLeaderDirectory();
  if (parts[0] === "person") return renderPersonDetail(parts[1] || "");
  if (parts[0] === "president") return renderPresident();
  if (parts[0] === "now") return renderNow();
  if (parts[0] === "column") return parts[1] ? renderBoardDetail("columns", parts[1]) : renderBoard("columns");
  if (parts[0] === "community") return parts[1] ? renderBoardDetail("community", parts[1]) : renderBoard("community");
  if (parts[0] === "news") return parts[1] ? renderBoardDetail("news", parts[1]) : renderBoard("news");
  if (parts[0] === "poll") return renderPolls();
  if (parts[0] === "academy") return renderAcademy();
  if (parts[0] === "itsme") return renderItsme();
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
  const pollId = button.dataset.pollId;
  const optionId = button.dataset.optionId;
  if (!pollId || !optionId) return;
  const key = `jcv3:voted:${pollId}`;
  if (localStorage.getItem(key)) {
    alert("이 브라우저에서는 이미 참여한 설문입니다.");
    return;
  }
  button.disabled = true;
  const result = await performAction("poll-vote", { pollId, optionId });
  if (result.ok) {
    localStorage.setItem(key, optionId);
    await render(currentRoute(), { resetScroll: false });
  } else {
    button.disabled = false;
    alert("투표 저장에 실패했습니다.");
  }
}

document.addEventListener("click", async event => {
  const go = event.target.closest("[data-go]");
  if (go) {
    const to = go.dataset.go;
    if (to) route(to);
    return;
  }

  if (event.target.closest("[data-drawer-open]")) {
    toggleDrawer(true);
    return;
  }

  if (event.target.closest("[data-drawer-close]")) {
    toggleDrawer(false);
    return;
  }

  const pollVote = event.target.closest("[data-poll-vote]");
  if (pollVote) {
    await vote(pollVote);
    return;
  }

  const tab = event.target.closest("[data-admin-tab]");
  if (tab) {
    route(`/admin?tab=${encodeURIComponent(tab.dataset.adminTab)}`);
    return;
  }

  const add = event.target.closest("[data-admin-new]");
  if (add) {
    const domain = add.dataset.adminNew;
    route(`/admin?tab=${encodeURIComponent(domain)}&edit=new`);
    return;
  }

  const edit = event.target.closest("[data-admin-edit]");
  if (edit) {
    route(`/admin?tab=${encodeURIComponent(edit.dataset.adminEdit)}&edit=${encodeURIComponent(edit.dataset.id)}`);
    return;
  }

  const cancel = event.target.closest("[data-admin-cancel]");
  if (cancel) {
    route(`/admin?tab=${encodeURIComponent(cancel.dataset.domain)}`);
    return;
  }

  const del = event.target.closest("[data-admin-delete]");
  if (del) {
    if (!confirm("이 항목을 삭제할까요?")) return;
    del.disabled = true;
    await deleteAdminItem(del.dataset.adminDelete, del.dataset.id);
    await render(currentRoute(), { resetScroll: false });
    return;
  }

  if (event.target.closest("[data-admin-logout]")) {
    await logout();
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

  const login = event.target.closest("[data-admin-login]");
  if (login) {
    event.preventDefault();
    const ok = await submitAdminLogin(login);
    if (ok) {
      history.replaceState({}, "", "/admin?tab=dashboard");
      await render(currentRoute(), { resetScroll: true });
    }
    return;
  }

  const form = event.target.closest("[data-admin-form]");
  if (form) {
    event.preventDefault();
    const state = form.querySelector("[data-save-state]");
    if (state) state.textContent = "저장 중…";
    try {
      const result = await saveAdminForm(form);
      if (state) state.textContent = result.mode === "browser-preview" ? "브라우저 Preview 저장 완료" : "서버 저장 완료";
      setTimeout(() => route(`/admin?tab=${encodeURIComponent(form.dataset.adminForm)}`), 250);
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
