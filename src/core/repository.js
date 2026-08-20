const CACHE = new Map();
const LOCAL_PREFIX = "jcv3:preview:";
const HOME_CACHE_KEY = "jcv3:home:snapshot:v1";
const HOME_REFRESH_TTL = 20_000;

let homeRefreshInFlight = null;
let homeLastRefreshAttempt = 0;

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
function stable(v) { try { return JSON.stringify(v); } catch { return ""; } }

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

function readHomeCache() {
  try { return JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || "null"); }
  catch { return null; }
}

function fallbackHome() {
  return {
    columns: localDomain("columns"),
    community: localDomain("community"),
    news: localDomain("news"),
    polls: localDomain("polls"),
    academy: localDomain("academy"),
    generation: localDomain("generation"),
    nationalEvaluation: localDomain("nationalEvaluation"),
    itsme: localDomain("itsme")
  };
}

async function refreshHomeSnapshot() {
  if (homeRefreshInFlight) return homeRefreshInFlight;

  const now = Date.now();
  if (now - homeLastRefreshAttempt < HOME_REFRESH_TTL) return null;
  homeLastRefreshAttempt = now;

  homeRefreshInFlight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 900);

    try {
      const response = await fetch("/api/v3/home", {
        signal: controller.signal,
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) return null;

      const body = await response.json();
      if (!body?.data) return null;

      const previous = readHomeCache();
      const changed = stable(previous?.data) !== stable(body.data);

      localStorage.setItem(
        HOME_CACHE_KEY,
        JSON.stringify({ data: body.data, at: Date.now() })
      );

      if (changed) {
        window.dispatchEvent(new CustomEvent("jcv3:home-updated"));
      }

      return body.data;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
      homeRefreshInFlight = null;
    }
  })();

  return homeRefreshInFlight;
}

export async function getHomeSnapshot() {
  const cached = readHomeCache();
  const immediate = cached?.data || fallbackHome();
  const age = cached?.at ? Date.now() - cached.at : Infinity;

  if (age >= HOME_REFRESH_TTL) {
    queueMicrotask(refreshHomeSnapshot);
  }

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
    const data = localDomain(domain);
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
    localStorage.removeItem(HOME_CACHE_KEY);

    return { ok: true, mode: "server" };
  } catch (error) {
    localStorage.setItem(LOCAL_PREFIX + domain, JSON.stringify(data));
    localStorage.removeItem(HOME_CACHE_KEY);
    CACHE.set(domain, data);

    return {
      ok: true,
      mode: "preview",
      warning: String(error?.message || error)
    };
  }
}

export function clearDomainCache(domain) {
  if (domain) CACHE.delete(domain);
  else CACHE.clear();
}
