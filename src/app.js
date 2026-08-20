import { startPerformanceMonitor } from "./performance.js";
import { startRouter, subscribe, currentRoute, route } from "./core/router.js";
import { renderHome } from "./views/home.js";
import { renderPeopleList, renderPersonDetail } from "./views/people.js";
import { renderBoard, renderBoardDetail } from "./views/boards.js";
import {
  renderNow,
  renderPresident,
  renderPolls,
  renderAcademy,
  renderItsme,
  renderCompare,
  renderGeneration,
  renderNationalEvaluation,
  renderSearch
} from "./views/features.js";
import { renderAdmin, handleAdminAction, handleAdminSubmit } from "./views/admin.js";

const app = document.querySelector("#app");
let adminTab = "dashboard";
let renderEpoch = 0;

function parse(pathname) {
  return pathname.split("/").filter(Boolean).map(decodeURIComponent);
}

async function resolveView(routeState) {
  const parts = parse(routeState.pathname);

  if (parts.length === 0) return renderHome();
  if (parts[0] === "assembly") return renderPeopleList("assembly");
  if (parts[0] === "local-leaders") return renderPeopleList("local");
  if (parts[0] === "person") return renderPersonDetail(parts[1] || "");
  if (parts[0] === "now") return renderNow();
  if (parts[0] === "president") return renderPresident();

  if (parts[0] === "column") {
    return parts[1] ? renderBoardDetail("columns", parts[1]) : renderBoard("columns");
  }
  if (parts[0] === "community") {
    return parts[1] ? renderBoardDetail("community", parts[1]) : renderBoard("community");
  }
  if (parts[0] === "news") {
    return parts[1] ? renderBoardDetail("news", parts[1]) : renderBoard("news");
  }

  if (parts[0] === "poll") return renderPolls();
  if (parts[0] === "academy") return renderAcademy();
  if (parts[0] === "itsme") return renderItsme();
  if (parts[0] === "compare") return renderCompare();
  if (parts[0] === "generation-president") return renderGeneration();
  if (parts[0] === "national-evaluation") return renderNationalEvaluation();

  if (parts[0] === "search") {
    return renderSearch(new URLSearchParams(routeState.search).get("q") || "");
  }

  if (parts[0] === "admin") return renderAdmin(adminTab);

  return renderHome();
}

async function render(routeState = currentRoute(), { resetScroll = true } = {}) {
  const epoch = ++renderEpoch;
  const html = await resolveView(routeState);

  if (epoch !== renderEpoch) return;

  app.innerHTML = html;
  document.body.classList.remove("drawer-open");

  if (resetScroll) {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  if (routeState.hash) {
    requestAnimationFrame(() => {
      document.querySelector(routeState.hash)?.scrollIntoView({ block: "start" });
    });
  }
}

function toggleDrawer(open) {
  const drawer = document.querySelector("[data-drawer]");
  const backdrop = document.querySelector(".drawer-backdrop");

  if (!drawer || !backdrop) return;

  drawer.hidden = !open;
  backdrop.hidden = !open;
  document.body.classList.toggle("drawer-open", open);
}

document.addEventListener("click", async (event) => {
  if (event.target.closest("[data-drawer-open]")) {
    toggleDrawer(true);
    return;
  }

  if (event.target.closest("[data-drawer-close]")) {
    toggleDrawer(false);
    return;
  }

  if (currentRoute().pathname === "/admin") {
    const handled = await handleAdminAction(
      event.target,
      (tab) => {
        adminTab = tab;
        render(currentRoute(), { resetScroll: false });
      }
    );
    if (handled) return;
  }
});

document.addEventListener("submit", async (event) => {
  const search = event.target.closest("[data-search-form]");

  if (search) {
    event.preventDefault();
    const fd = new FormData(search);
    route(`/search?q=${encodeURIComponent(String(fd.get("q") || ""))}`);
    return;
  }

  const adminForm = event.target.closest("[data-admin-form]");

  if (adminForm) {
    event.preventDefault();

    await handleAdminSubmit(
      adminForm,
      (tab) => {
        adminTab = tab;
        render(currentRoute(), { resetScroll: false });
      }
    );
  }
});

addEventListener("keydown", (event) => {
  if (event.key === "Escape") toggleDrawer(false);
});

startRouter();

subscribe((state) => {
  render(state, { resetScroll: true });
});

addEventListener("jcv3:home-updated", () => {
  if (currentRoute().pathname === "/") {
    render(currentRoute(), { resetScroll: false });
  }
});

await render(currentRoute(), { resetScroll: false });
startPerformanceMonitor();
