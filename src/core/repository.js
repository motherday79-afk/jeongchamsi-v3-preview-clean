const CACHE = new Map();
const LOCAL_PREFIX = "jcv3:preview:";
const HOME_CACHE_KEY = "jcv3:home:snapshot:v1";

const defaults = {
  columns: { items: [] },
  community: { items: [] },
  news: { items: [] },
  polls: { items: [] },
  academy: { courses: [], slots: [] },
  generation: { enabled: false, title: "세대가 뽑은 대통령", candidates: [] },
  nationalEvaluation: { enabled: false, subjectId: null, title: "국회의원 전국 평가제" },
  itsme: { cards: [] }
};

function clone(v) { return JSON.parse(JSON.stringify(v)); }

export function defaultDomain(domain) {
  return clone(defaults[domain] || { items: [] });
}


function localDomain(domain) {
  try {
    const local = localStorage.getItem(LOCAL_PREFIX + domain);
    return local ? JSON.parse(local) : defaultDomain(domain);
  } catch {
    return defaultDomain(domain);
  }
}

export async function getHomeSnapshot() {
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || "null"); } catch {}
  const immediate = cached?.data || {
    columns: localDomain("columns"),
    community: localDomain("community"),
    news: localDomain("news"),
    polls: localDomain("polls"),
    academy: localDomain("academy"),
    generation: localDomain("generation"),
    nationalEvaluation: localDomain("nationalEvaluation"),
    itsme: localDomain("itsme")
  };

  // SWR: never block first paint on network. Refresh in the background.
  queueMicrotask(async () => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 900);
      const response = await fetch("/api/v3/home", { signal: controller.signal, headers:{"Accept":"application/json"} });
      clearTimeout(timer);
      if (!response.ok) return;
      const body = await response.json();
      if (!body?.data) return;
      localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data: body.data, at: Date.now() }));
      window.dispatchEvent(new CustomEvent("jcv3:home-updated"));
    } catch {}
  });

  return clone(immediate);
}

export async function getDomain(domain, { fresh = false } = {}) {
  if (!fresh && CACHE.has(domain)) return clone(CACHE.get(domain));
  try {
    const response = await fetch(`/api/v3/content?domain=${encodeURIComponent(domain)}`, {
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const body = await response.json();
    const data = body?.data || defaultDomain(domain);
    CACHE.set(domain, data);
    return clone(data);
  } catch {
    const local = localStorage.getItem(LOCAL_PREFIX + domain);
    const data = local ? JSON.parse(local) : defaultDomain(domain);
    CACHE.set(domain, data);
    return clone(data);
  }
}

export async function saveDomain(domain, data, adminToken = "") {
  const payload = { domain, data };
  try {
    const response = await fetch("/api/v3/content", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { "X-JCV3-Admin": adminToken } : {})
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.error || `HTTP_${response.status}`);
    CACHE.set(domain, data);
    localStorage.removeItem(LOCAL_PREFIX + domain);
    return { ok: true, mode: "server" };
  } catch (error) {
    localStorage.setItem(LOCAL_PREFIX + domain, JSON.stringify(data));
    CACHE.set(domain, data);
    return { ok: true, mode: "preview", warning: String(error?.message || error) };
  }
}

export function clearDomainCache(domain) {
  if (domain) CACHE.delete(domain); else CACHE.clear();
}
