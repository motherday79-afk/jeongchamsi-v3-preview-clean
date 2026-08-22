const listeners = new Set();
let started = false;
let pendingScroll = null;
let scrollFlushTimer = 0;

const STATE_KEY = "__jcv3Nav";
// Do not mutate session history every animation frame while the user scrolls.
// A short bounded throttle keeps Back/Forward restoration accurate without making
// History API writes part of the mobile scroll hot path.
const SCROLL_HISTORY_FLUSH_MS = 240;

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
  const key = current.key || makeKey();
  const x = Number(point?.x || 0);
  const y = Number(point?.y || 0);

  // Replacing an identical history state is pure overhead on the scroll path.
  if (current.key && current.x === x && current.y === y) return current;

  const next = {
    ...current,
    key,
    x,
    y
  };
  history.replaceState({
    ...state,
    [STATE_KEY]: next
  }, "", location.href);
  return next;
}

function cancelScrollFlush() {
  if (!scrollFlushTimer) return;
  clearTimeout(scrollFlushTimer);
  scrollFlushTimer = 0;
}

function flushCurrentScroll(point = pendingScroll || scrollPoint()) {
  cancelScrollFlush();
  pendingScroll = null;
  return writeCurrentScroll(point);
}

function rememberCurrentScroll(point = scrollPoint()) {
  pendingScroll = point;
  if (scrollFlushTimer) return;
  scrollFlushTimer = setTimeout(() => {
    scrollFlushTimer = 0;
    const pointToSave = pendingScroll || scrollPoint();
    pendingScroll = null;
    writeCurrentScroll(pointToSave);
  }, SCROLL_HISTORY_FLUSH_MS);
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
  // Navigation is a hard boundary: persist the exact current position immediately.
  flushCurrentScroll(point);

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
  flushCurrentScroll(scrollPoint());
}

export function startRouter() {
  if (started) return;
  started = true;

  try { history.scrollRestoration = "manual"; } catch {}
  ensureCurrentState();

  addEventListener("popstate", event => {
    cancelScrollFlush();
    pendingScroll = null;
    const saved = navState(event.state) || ensureCurrentState() || {};
    const scroll = {
      x: Number.isFinite(saved.x) ? saved.x : 0,
      y: Number.isFinite(saved.y) ? saved.y : 0
    };
    emit({ type: "pop", scroll });
  });

  addEventListener("scroll", () => {
    rememberCurrentScroll(scrollPoint());
  }, { passive: true });

  // Modern Chromium/Samsung Internet can flush the exact final inertial-scroll point here.
  // Older browsers simply ignore the unsupported event and use the bounded timer above.
  addEventListener("scrollend", () => flushCurrentScroll(scrollPoint()), { passive: true });

  // Pointer/touch completion is another cheap boundary before a possible Back gesture.
  addEventListener("touchend", () => flushCurrentScroll(scrollPoint()), { passive: true });
  addEventListener("pointerup", () => flushCurrentScroll(scrollPoint()), { passive: true });

  addEventListener("pagehide", () => flushCurrentScroll(scrollPoint()));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushCurrentScroll(scrollPoint());
  });

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
