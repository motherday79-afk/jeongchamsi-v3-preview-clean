const listeners = new Set();
let started = false;

export function currentRoute() {
  return {
    pathname: location.pathname || "/",
    search: location.search || "",
    hash: location.hash || ""
  };
}

function emit() {
  const state = currentRoute();
  for (const fn of listeners) fn(state);
}

export function route(to, { replace = false } = {}) {
  const url = new URL(to, location.origin);
  const next = `${url.pathname}${url.search}${url.hash}`;
  const current = `${location.pathname}${location.search}${location.hash}`;
  if (next === current) return;
  history[replace ? "replaceState" : "pushState"]({}, "", next);
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function startRouter() {
  if (started) return;
  started = true;
  addEventListener("popstate", emit);
  document.addEventListener("click", event => {
    const anchor = event.target.closest("a[data-route]");
    if (!anchor || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:")) return;
    event.preventDefault();
    route(href);
  });
}
