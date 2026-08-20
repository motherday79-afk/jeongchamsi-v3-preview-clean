const CACHE = new Map();
const LOCAL_PREFIX = "jcv3:preview:";
const HOME_CACHE_KEY = "jcv3:home:snapshot:v3";
const HOME_REFRESH_TTL = 20_000;

let homeRefreshInFlight = null;
let homeLastRefreshAttempt = 0;

const DEFAULT_ITSME_CATEGORIES = [
  "내가 대통령이라면",
  "내가 국회의원이라면",
  "내가 시장이라면",
  "내가 장관이라면"
];

const SAMPLE_POLL = {
  id: "sample-poll-v1",
  question: "정참시에서 가장 먼저 강화했으면 하는 참여 기능은?",
  options: [
    { id: "sample-poll-v1-o1", label: "정책·공약 제안", votes: 0 },
    { id: "sample-poll-v1-o2", label: "정치인 평가", votes: 0 },
    { id: "sample-poll-v1-o3", label: "시민 설문", votes: 0 }
  ],
  published: true,
  sample: true,
  createdAt: "2026-08-21T00:00:00.000Z",
  updatedAt: "2026-08-21T00:00:00.000Z"
};

const defaults = Object.freeze({
  columns: { items: [] },
  community: { items: [] },
  news: { items: [] },
  polls: { items: [SAMPLE_POLL] },
  academy: { slots: [] },
  generation: { enabled: false, candidates: [] },
  nationalEvaluation: { enabled: false, subjectId: null },
  itsme: { categories: DEFAULT_ITSME_CATEGORIES, items: [] },
  comments: { items: [] },
  keywords: { items: [] },
  trending: { items: [] }
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
    return { ok: true, mode: body?.storage || "server", data: body?.data || null, item: body?.item || null };
  } catch (error) {
    const code = String(error?.message || error);
    if (["ALREADY_VOTED", "USER_LOGIN_REQUIRED", "NOT_OWNER"].includes(code)) return { ok: false, error: code, requiresLogin: code === "USER_LOGIN_REQUIRED" };

    if (action === "poll-vote") {
      const data = await getDomain("polls");
      const poll = (data.items || []).find(x => String(x.id) === String(payload.pollId));
      const option = poll?.options?.find(x => String(x.id) === String(payload.optionId));
      if (!option) return { ok: false, error: "POLL_NOT_FOUND" };
      option.votes = Number(option.votes || 0) + 1;
      writeLocalOverride("polls", data);
      CACHE.set("polls", data);
      return { ok: true, mode: "browser-preview", data };
    }

    if (action === "post-like" && ["columns", "community", "news", "itsme"].includes(String(payload.domain || ""))) {
      const domain = String(payload.domain);
      const data = await getDomain(domain);
      const item = (data.items || []).find(x => String(x.id) === String(payload.postId));
      if (!item) return { ok: false, error: "POST_NOT_FOUND" };
      item.likes = Math.max(0, Number(item.likes || 0) + (Number(payload.delta || 0) > 0 ? 1 : -1));
      writeLocalOverride(domain, data);
      CACHE.set(domain, data);
      return { ok: true, mode: "browser-preview", data };
    }

    if (action === "comment-add" && ["columns", "community", "news", "itsme"].includes(String(payload.domain || ""))) {
      const data = await getDomain("comments");
      const item = {
        id: `comment-${Date.now().toString(36)}`,
        domain: String(payload.domain),
        postId: String(payload.postId || ""),
        ownerId: String(payload.ownerId || "").slice(0, 24),
        author: String(payload.author || "정참시 유저").slice(0, 40),
        text: String(payload.text || "").trim().slice(0, 1000),
        createdAt: new Date().toISOString(),
        published: true
      };
      if (!item.postId || !item.text) return { ok: false, error: "INVALID_COMMENT" };
      data.items = [item, ...(data.items || [])].slice(0, 3000);
      writeLocalOverride("comments", data);
      CACHE.set("comments", data);
      return { ok: true, mode: "browser-preview", data };
    }

    if (action === "user-post-save" && ["community", "itsme"].includes(String(payload.domain || ""))) {
      const domain = String(payload.domain);
      const data = await getDomain(domain);
      const items = data.items || [];
      const old = payload.id ? items.find(x => String(x.id) === String(payload.id)) : null;
      if (old && old.ownerId && String(old.ownerId) !== String(payload.ownerId || "")) return { ok: false, error: "NOT_OWNER" };
      const id = old?.id || `${domain}-${Date.now().toString(36)}`;
      const now = new Date().toISOString();
      const item = {
        id,
        title: String(payload.title || "").trim().slice(0, 120),
        summary: String(payload.summary || "").trim().slice(0, 240),
        category: String(payload.category || "").trim().slice(0, 60),
        author: String(payload.author || "정참시 유저").slice(0, 40),
        ownerId: String(payload.ownerId || "").slice(0, 24),
        body: String(payload.body || "").trim().slice(0, 50000),
        published: true,
        createdAt: old?.createdAt || now,
        updatedAt: now,
        likes: Number(old?.likes || 0),
        views: Number(old?.views || 0)
      };
      if (!item.title || !item.body) return { ok: false, error: "TITLE_BODY_REQUIRED" };
      data.items = old ? items.map(x => String(x.id) === id ? item : x) : [item, ...items];
      writeLocalOverride(domain, data);
      CACHE.set(domain, data);
      return { ok: true, mode: "browser-preview", data, item };
    }

    if (action === "user-post-delete" && ["community", "itsme"].includes(String(payload.domain || ""))) {
      const domain = String(payload.domain);
      const data = await getDomain(domain);
      const old = (data.items || []).find(x => String(x.id) === String(payload.id));
      if (!old) return { ok: false, error: "POST_NOT_FOUND" };
      if (old.ownerId && String(old.ownerId) !== String(payload.ownerId || "")) return { ok: false, error: "NOT_OWNER" };
      data.items = (data.items || []).filter(x => String(x.id) !== String(payload.id));
      writeLocalOverride(domain, data);
      CACHE.set(domain, data);
      return { ok: true, mode: "browser-preview", data };
    }

    return { ok: false, error: code };
  }
}

export function clearDomainCache(domain) {
  if (domain) CACHE.delete(domain);
  else CACHE.clear();
}

export function getStoragePreviewState() {
  return Object.keys(defaults).filter(domain => !!localOverride(domain));
}

export { DEFAULT_ITSME_CATEGORIES };
