const CACHE = new Map();
const LOCAL_PREFIX = "jcv3:preview:";
const HOME_CACHE_KEY = "jcv3:home:snapshot:v2";
const HOME_REFRESH_TTL = 20_000;

let homeRefreshInFlight = null;
let homeLastRefreshAttempt = 0;

const defaults = Object.freeze({
  columns: { items: [] },
  community: { items: [] },
  news: { items: [] },
  polls: { items: [] },
  academy: { slots: [] },
  generation: { enabled: false, candidates: [] },
  nationalEvaluation: { enabled: false, subjectId: null },
  itsme: { cards: [] }
});

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function stable(v) { try { return JSON.stringify(v); } catch { return ""; } }

export function defaultDomain(domain) {
  return clone(defaults[domain] || { items: [] });
}

function localKey(domain) { return LOCAL_PREFIX + domain; }

function localOverride(domain) {
  try {
    const raw = localStorage.getItem(localKey(domain));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeLocalOverride(domain, data) {
  localStorage.setItem(localKey(domain), JSON.stringify(data));
  localStorage.removeItem(HOME_CACHE_KEY);
}

function clearLocalOverride(domain) {
  localStorage.removeItem(localKey(domain));
}

function readHomeCache() {
  try { return JSON.parse(localStorage.getItem(HOME_CACHE_KEY) || "null"); }
  catch { return null; }
}

function applyLocalOverrides(snapshot) {
  const out = clone(snapshot || {});
  for (const domain of Object.keys(defaults)) {
    const local = localOverride(domain);
    if (local) out[domain] = local;
    else if (!out[domain]) out[domain] = defaultDomain(domain);
  }
  return out;
}

function fallbackHome() {
  const out = {};
  for (const domain of Object.keys(defaults)) {
    out[domain] = localOverride(domain) || CACHE.get(domain) || defaultDomain(domain);
  }
  return clone(out);
}

async function fetchJSON(url, options = {}, timeout = 1200) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: "same-origin",
      headers: {
        "Accept": "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

async function refreshHomeSnapshot() {
  if (homeRefreshInFlight) return homeRefreshInFlight;
  const now = Date.now();
  if (now - homeLastRefreshAttempt < HOME_REFRESH_TTL) return null;
  homeLastRefreshAttempt = now;

  homeRefreshInFlight = (async () => {
    try {
      const { response, body } = await fetchJSON("/api/v3/home", {}, 900);
      if (!response.ok || !body?.data) return null;

      const merged = applyLocalOverrides(body.data);
      const previous = readHomeCache();
      const baseline = applyLocalOverrides(previous?.data || fallbackHome());
      const changed = stable(baseline) !== stable(merged);

      localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data: merged, at: Date.now() }));
      if (changed) window.dispatchEvent(new CustomEvent("jcv3:home-updated"));
      return merged;
    } catch {
      return null;
    } finally {
      homeRefreshInFlight = null;
    }
  })();

  return homeRefreshInFlight;
}

export async function getHomeSnapshot() {
  const cached = readHomeCache();
  const immediate = applyLocalOverrides(cached?.data || fallbackHome());
  const age = cached?.at ? Date.now() - cached.at : Infinity;
  if (age >= HOME_REFRESH_TTL) queueMicrotask(refreshHomeSnapshot);
  return immediate;
}

export async function getDomain(domain, { fresh = false } = {}) {
  const local = localOverride(domain);
  if (local) return clone(local);
  if (!fresh && CACHE.has(domain)) return clone(CACHE.get(domain));

  try {
    const { response, body } = await fetchJSON(`/api/v3/content?domain=${encodeURIComponent(domain)}`);
    if (!response.ok) throw new Error(body?.error || `HTTP_${response.status}`);
    const data = body?.data || defaultDomain(domain);
    CACHE.set(domain, data);
    return clone(data);
  } catch {
    const data = defaultDomain(domain);
    CACHE.set(domain, data);
    return clone(data);
  }
}

export async function saveDomain(domain, data) {
  const payload = { domain, data };
  try {
    const { response, body } = await fetchJSON("/api/v3/content", {
      method: "POST",
      body: JSON.stringify(payload)
    }, 2000);

    if (!response.ok) throw new Error(body?.error || `HTTP_${response.status}`);
    CACHE.set(domain, data);
    clearLocalOverride(domain);
    localStorage.removeItem(HOME_CACHE_KEY);
    return { ok: true, mode: body?.storage || "server" };
  } catch (error) {
    writeLocalOverride(domain, data);
    CACHE.set(domain, data);
    return { ok: true, mode: "browser-preview", warning: String(error?.message || error) };
  }
}

export async function performAction(action, payload) {
  try {
    const { response, body } = await fetchJSON("/api/v3/action", {
      method: "POST",
      body: JSON.stringify({ action, payload })
    }, 1800);
    if (!response.ok) throw new Error(body?.error || `HTTP_${response.status}`);
    if (body?.domain && body?.data) {
      CACHE.set(body.domain, body.data);
      clearLocalOverride(body.domain);
    }
    localStorage.removeItem(HOME_CACHE_KEY);
    return { ok: true, mode: body?.storage || "server", data: body?.data || null };
  } catch (error) {
    if (action === "poll-vote") {
      const data = await getDomain("polls");
      const poll = (data.items || []).find(x => String(x.id) === String(payload.pollId));
      const option = poll?.options?.find(x => String(x.id) === String(payload.optionId));
      if (option) option.votes = Number(option.votes || 0) + 1;
      writeLocalOverride("polls", data);
      CACHE.set("polls", data);
      return { ok: true, mode: "browser-preview", data };
    }
    return { ok: false, error: String(error?.message || error) };
  }
}

export function clearDomainCache(domain) {
  if (domain) CACHE.delete(domain);
  else CACHE.clear();
}

export function getStoragePreviewState() {
  return Object.keys(defaults).filter(domain => !!localOverride(domain));
}
