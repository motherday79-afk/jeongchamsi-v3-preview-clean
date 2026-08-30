const CACHE = new Map();
const AUTHOR_CACHE = new Map();
const NOW_PUBLIC_CACHE = new Map();
let storageState = { available: true, error: "" };
let homeRevision = 0;
let homeSnapshotCache = null;
const HOME_CACHE_TTL_MS = 10000;
const AUTHOR_CACHE_TTL_MS = 15000;
const NOW_PUBLIC_CACHE_TTL_MS = 10000;

export const DEFAULT_ITSME_CATEGORIES = [
  "내가 대통령이라면",
  "내가 국회의원이라면",
  "내가 시장이라면",
  "내가 장관이라면"
];

const defaults = {
  columns: { items: [] },
  community: { items: [] },
  news: { items: [] },
  polls: { items: [{
    id: "sample-poll-v3",
    question: "정참시에서 가장 먼저 참여해보고 싶은 기능은?",
    description: "기능 검수용 기본 설문입니다. 관리자가 실제 설문을 등록하면 교체할 수 있습니다",
    options: [
      { id: "sample-poll-v3-o1", label: "정책·공약 제안", votes: 0 },
      { id: "sample-poll-v3-o2", label: "정치인 평가", votes: 0 },
      { id: "sample-poll-v3-o3", label: "시민 설문", votes: 0 }
    ],
    published: true,
    startsAt: "",
    endsAt: "",
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z"
  }] },
  academy: {
    config: {
      eyebrow: "JEONGCHAMSI ACADEMY",
      title: "정참시 아카데미",
      headline: "정치의 꿈을 실제 준비로",
      description: "정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳",
      cta: "수강 가능 일정 확인"
    },
    slots: []
  },
  generation: { enabled: true, candidates: [], results: {}, demoMode: false, demoResults: {} },
  nationalEvaluation: { enabled:false, subjectId:null, slots:{ assembly:{ slot:"assembly", evaluationId:"", subjectId:null, enabled:false, startedAt:"", updatedAt:"", closedAt:"" }, local:{ slot:"local", evaluationId:"", subjectId:null, enabled:false, startedAt:"", updatedAt:"", closedAt:"" } }, results:{}, history:[], demoMode:false, demoResults:{} },
  itsme: { categories: DEFAULT_ITSME_CATEGORIES, items: [] },
  comments: { items: [] },
  keywords: { items: [] },
  trending: { items: [] },
  politicianPhotos: { items: [] },
  brand: {
    hero: {
      kicker: "정참시 — 정치에 참여할 시간",
      headline: "바라볼 때가 아닌, 행동할 때 정치가 시작됩니다",
      productHeadline: "정치를 보는 것에서 움직이는 것으로!",
      subline1: "알고, 비교하고, 선택하고, 평가하는 것",
      subline2: "한 사람의 작은 행동이 정치의 방향을 만듭니다",
      learnLabel: "정참시 더 알아보기",
      supportLabel: "정참시 후원하기",
      artImage: ""
    },
    about: {
      title: "왜 정참시인가",
      intro: "세계적으로 유명한 배우들도 끊임없이 훈련합니다.",
      body: "작품을 쉬는 기간에는 발성과 호흡,\n감정을 전달하는 방법을 배우고 다듬습니다.\n\n작품 중에도 필요한 순간마다\n조언을 구하며 자신을 정비합니다.\n\n정치도 다르지 않다고 생각합니다.\n\n정참시는\n정치를 하려는 곳도,\n정치인이 되려는 곳도 아닙니다.\n\n다만 현장에서 더 나은 방법이 필요할 때,\n현장의 시각과는 다른 방향에서 해답을 찾고자 할 때,\n의도와는 다르게 난처한 상황을 겪게 될 때,\n정참시는 분명한 데이터를 기반으로 더 선명한 방법을 제공합니다.\n\n정참시는 정참시가 가장 잘하는 일을 하겠습니다.\n\n막대한 양의 데이터를 빠짐없이 수집하고,\nJCS만의 독자적인 시스템을 통해 분석하고,\n시장이 요구하는 신호를 읽어\n가장 필요한 순간에 전달하겠습니다.\n\n그다음은 여러분의 몫입니다.\n시장을 향해 마음껏 목소리를 내십시오.\n\n목적지를 정하는 것은 여러분입니다.\n가장 정확한 길을 찾는 것은 정참시가 하겠습니다."
    },
    liveBar: { useActualCount: true, overrideCount: 0 },
    support: {
      title: "정참시 후원하기",
      intro: "정치에 참여할 수 있는 더 나은 공간을 함께 만들어 주세요",
      body: "정참시는 시민이 정치 정보를 더 쉽게 이해하고, 비교하고, 선택하고, 평가할 수 있는 공간을 만들고 있습니다\n\n후원은 정참시의 서비스 운영, 데이터 정비, 콘텐츠 제작, 시민 참여 기능 개선에 사용됩니다\n\n후원 방법과 세부 운영 원칙은 준비되는 대로 투명하게 공개하겠습니다",
      note: "현재 후원 방법은 준비 중입니다"
    },
    updatedAt: ""
  },
  president: {
    profile: { name: "", photo: "", party: "", birth: "", education: "", inauguratedAt: "", term: "" },
    career: [], elections: [], vision: "", policies: [], pledges: [], nationalTasks: [], channels: [], updatedAt: ""
  }
};

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function invalidateHomeSnapshot() { homeSnapshotCache = null; }
export function clearAuthorProfileCache(ownerId = "") {
  const id = String(ownerId || "").trim();
  if (id) AUTHOR_CACHE.delete(id);
  else AUTHOR_CACHE.clear();
}
export function defaultDomain(domain) { return clone(defaults[domain] || { items: [] }); }
export function getStorageState() { return { ...storageState }; }

async function requestJSON(url, options = {}) {
  const response = await fetch(url, { credentials: "same-origin", headers: { "Accept": "application/json", ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error || `HTTP_${response.status}`);
    error.status = response.status;
    error.code = body?.error || "REQUEST_FAILED";
    throw error;
  }
  return body;
}

export async function getDomain(domain, { fresh = false } = {}) {
  if (!fresh && CACHE.has(domain)) return clone(CACHE.get(domain));
  try {
    const bust = fresh ? `&r=${Date.now()}` : "";
    const body = await requestJSON(`/api/v3/content?domain=${encodeURIComponent(domain)}${bust}`);
    const data = body?.data || defaultDomain(domain);
    CACHE.set(domain, data);
    storageState = { available: true, error: "" };
    return clone(data);
  } catch (error) {
    storageState = { available: false, error: error.code || error.message };
    return defaultDomain(domain);
  }
}

export async function saveDomain(domain, data) {
  try {
    const body = await requestJSON("/api/v3/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, data })
    });
    CACHE.set(domain, body.data || data);
    homeRevision += 1;
    invalidateHomeSnapshot();
    storageState = { available: true, error: "" };
    return { ok: true, data: clone(body.data || data) };
  } catch (error) {
    storageState = { available: false, error: error.code || error.message };
    return { ok: false, error: error.code || error.message };
  }
}

export async function performAction(action, payload = {}) {
  try {
    const body = await requestJSON("/api/v3/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    if (["user-post-save", "user-post-delete", "post-like", "poll-vote", "generation-vote", "national-evaluation-vote", "comment-add"].includes(action)) {
      CACHE.clear();
      homeRevision += 1;
      invalidateHomeSnapshot();
    }
    if (body?.ok && action === "badge-representative-set") clearAuthorProfileCache();
    return body;
  } catch (error) {
    return { ok: false, error: error.code || error.message, status: error.status || 0 };
  }
}

export async function getHomeSnapshot({ fresh = false } = {}) {
  const now = Date.now();
  if (!fresh && homeSnapshotCache && homeSnapshotCache.revision === homeRevision && now - homeSnapshotCache.at < HOME_CACHE_TTL_MS) {
    return homeSnapshotCache.data;
  }
  try {
    const body = await requestJSON(`/api/v3/home${homeRevision ? `?r=${homeRevision}` : ""}`);
    const data = body?.data || { ...Object.fromEntries(Object.keys(defaults).map(k => [k, defaultDomain(k)])), memberCount: 0 };
    homeSnapshotCache = { revision: homeRevision, at: now, data };
    storageState = { available: true, error: "" };
    return data;
  } catch (error) {
    storageState = { available: false, error: error.code || error.message };
    return { ...Object.fromEntries(Object.keys(defaults).map(k => [k, defaultDomain(k)])), memberCount: 0 };
  }
}

export function clearDomainCache(domain) {
  if (domain) CACHE.delete(domain);
  else { CACHE.clear(); invalidateHomeSnapshot(); }
  NOW_PUBLIC_CACHE.clear();
}


export async function getAuthorProfiles(ownerIds = []) {
  const ids = [...new Set((Array.isArray(ownerIds) ? ownerIds : []).map(x => String(x || "").trim()).filter(Boolean))].slice(0, 120);
  if (!ids.length) return {};
  const now = Date.now();
  const profiles = {};
  const missing = [];
  for (const id of ids) {
    const cached = AUTHOR_CACHE.get(id);
    if (cached && now - cached.at < AUTHOR_CACHE_TTL_MS) {
      if (cached.profile) profiles[id] = clone(cached.profile);
    } else {
      missing.push(id);
    }
  }
  if (missing.length) {
    try {
      const body = await requestJSON(`/api/v3/authors?ids=${encodeURIComponent(missing.join(","))}`);
      const fetched = body?.profiles || {};
      for (const id of missing) {
        const profile = fetched[id] || null;
        AUTHOR_CACHE.set(id, { at: now, profile: profile ? clone(profile) : null });
        if (profile) profiles[id] = clone(profile);
      }
    } catch {}
  }
  return profiles;
}


export async function getNowPublic(id = "", { fresh = false } = {}) {
  const key = String(id || "").trim() || "__all__";
  const now = Date.now();
  const cached = NOW_PUBLIC_CACHE.get(key);
  if (!fresh && cached && now - cached.at < NOW_PUBLIC_CACHE_TTL_MS) return clone(cached.data);
  try {
    const suffix = key === "__all__" ? "" : `?id=${encodeURIComponent(key)}`;
    const body = await requestJSON(`/api/v3/now-data${suffix}`);
    NOW_PUBLIC_CACHE.set(key, { at: now, data: body });
    return clone(body);
  } catch (error) {
    return { ok:false, error:error.code || error.message, current:null, signals:{source:"none",keywords:[],rising:[]}, person:null };
  }
}

export async function getNowPerson(id, options = {}) {
  const body = await getNowPublic(id, options);
  return body?.person || null;
}

export async function getNowCategory(type = "assembly", { offset = 0, limit = 30, fresh = false } = {}) {
  const safeType = ["assembly","metropolitan","basic"].includes(String(type)) ? String(type) : "assembly";
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.min(300, Math.max(1, Number(limit) || 30));
  const key = `category:${safeType}:${safeOffset}:${safeLimit}`;
  const now = Date.now();
  const cached = NOW_PUBLIC_CACHE.get(key);
  if (!fresh && cached && now - cached.at < NOW_PUBLIC_CACHE_TTL_MS) return clone(cached.data);
  try {
    const body = await requestJSON(`/api/v3/now-data?type=${encodeURIComponent(safeType)}&offset=${safeOffset}&limit=${safeLimit}`);
    NOW_PUBLIC_CACHE.set(key, { at: now, data: body });
    return clone(body);
  } catch (error) {
    return { ok:false, error:error.code || error.message, current:null, category:{ type:safeType, total:0, offset:safeOffset, limit:safeLimit, hasMore:false, rows:[] } };
  }
}

export async function getPoliticianRequests() {
  try { return await requestJSON(`/api/v3/politician-requests?r=${Date.now()}`); }
  catch (error) { return { ok:false, error:error.code || error.message, items:[] }; }
}
export async function submitPoliticianRequest(name) {
  try { return await requestJSON("/api/v3/politician-requests", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name }) }); }
  catch (error) { return { ok:false, error:error.code || error.message }; }
}
export async function updatePoliticianRequest(id, status) {
  try { return await requestJSON("/api/v3/politician-requests", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, status }) }); }
  catch (error) { return { ok:false, error:error.code || error.message }; }
}
export async function getPartnerApplications() {
  try { return await requestJSON(`/api/v3/partners?r=${Date.now()}`); }
  catch (error) { return { ok:false, error:error.code || error.message, items:[] }; }
}
export async function submitPartnerApplication(input = {}) {
  try { return await requestJSON("/api/v3/partners", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(input || {}) }); }
  catch (error) { return { ok:false, error:error.code || error.message }; }
}
export async function updatePartnerApplication(id, status, reviewNote = "") {
  try { return await requestJSON("/api/v3/partners", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, status, reviewNote }) }); }
  catch (error) { return { ok:false, error:error.code || error.message }; }
}
