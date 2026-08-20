const listeners = new Set();

export function route(path, { replace = false } = {}) {
  const url = new URL(path, location.origin);
  if (replace) history.replaceState({}, "", url.pathname + url.search + url.hash);
  else history.pushState({}, "", url.pathname + url.search + url.hash);
  notify();
}

export function currentRoute() {
  return { pathname: location.pathname, search: location.search, hash: location.hash };
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn(currentRoute()));
}

export function startRouter() {
  addEventListener("popstate", notify);
  document.addEventListener("click", (event) => {
    const el = event.target.closest("[data-route]");
    if (!el) return;
    const href = el.getAttribute("data-route");
    if (!href) return;
    event.preventDefault();
    route(href);
  });
}
