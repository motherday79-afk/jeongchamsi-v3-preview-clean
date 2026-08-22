const listeners = new Set();
let started = false;
let scrollSyncQueued = false;

const STATE_KEY = "__jcv3Nav";

function scrollPoint() {
  return {
    x: Math.max(0, Math.round(window.scrollX || window.pageXOffset || 0)),
    y: Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0))
  };
}

function navState(source = history.state) {
  const raw = source && typeof source === "object" ? source[STATE_KEY] : null;
  return raw && typeof raw === "object" ? raw : null;
}

function makeKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function writeCurrentScroll(point = scrollPoint()) {
  const state = history.state && typeof history.state === "object" ? history.state : {};
  const current = navState(state) || {};
  history.replaceState({
    ...state,
    [STATE_KEY]: {
      ...current,
      key: current.key || makeKey(),
      x: point.x,
      y: point.y
    }
  }, "", location.href);
}

function ensureCurrentState() {
  const current = navState();
  if (current?.key && Number.isFinite(current.x) && Number.isFinite(current.y)) return current;
  const point = scrollPoint();
  writeCurrentScroll(point);
  return navState();
}

export function currentRoute() {
  return {
    pathname: location.pathname || "/",
    search: location.search || "",
    hash: location.hash || ""
  };
}

function emit(meta = {}) {
  const state = currentRoute();
  for (const fn of listeners) fn(state, meta);
}

export function route(to, { replace = false, preserveScroll = false } = {}) {
  const url = new URL(to, location.origin);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next === current) return;

  const point = scrollPoint();
  writeCurrentScroll(point);

  const previousState = history.state && typeof history.state === "object" ? history.state : {};
  const previousNav = navState(previousState) || {};
  const targetPoint = preserveScroll ? point : { x: 0, y: 0 };
  const nextState = replace
    ? {
        ...previousState,
        [STATE_KEY]: {
          ...previousNav,
          key: previousNav.key || makeKey(),
          x: targetPoint.x,
          y: targetPoint.y
        }
      }
    : {
        [STATE_KEY]: {
          key: makeKey(),
          x: targetPoint.x,
          y: targetPoint.y
        }
      };

  history[replace ? "replaceState" : "pushState"](nextState, "", next);
  emit({ type: replace ? "replace" : "push", scroll: targetPoint });
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function syncCurrentScroll() {
  writeCurrentScroll(scrollPoint());
}

export function startRouter() {
  if (started) return;
  started = true;

  try { history.scrollRestoration = "manual"; } catch {}
  ensureCurrentState();

  addEventListener("popstate", event => {
    const saved = navState(event.state) || ensureCurrentState() || {};
    const scroll = {
      x: Number.isFinite(saved.x) ? saved.x : 0,
      y: Number.isFinite(saved.y) ? saved.y : 0
    };
    emit({ type: "pop", scroll });
  });

  addEventListener("scroll", () => {
    if (scrollSyncQueued) return;
    scrollSyncQueued = true;
    requestAnimationFrame(() => {
      scrollSyncQueued = false;
      writeCurrentScroll(scrollPoint());
    });
  }, { passive: true });

  addEventListener("pagehide", () => writeCurrentScroll(scrollPoint()));

  document.addEventListener("click", event => {
    const anchor = event.target.closest("a[data-route]");
    if (!anchor || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
    event.preventDefault();
    route(href, { preserveScroll: false });
  });
}
