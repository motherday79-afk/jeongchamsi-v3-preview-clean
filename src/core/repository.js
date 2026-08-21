const CACHE = new Map();
let storageState = { available: true, error: "" };
let homeRevision = 0;

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
    description: "기능 검수용 기본 설문입니다. 관리자가 실제 설문을 등록하면 교체할 수 있습니다.",
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
      headline: "정치의 꿈을 실제 준비로.",
      description: "정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳.",
      cta: "수강 가능 일정 확인"
    },
    slots: []
  },
  generation: { enabled: true, candidates: [], results: {} },
  nationalEvaluation: { enabled: false, subjectId: null, results: {}, history: [] },
  itsme: { categories: DEFAULT_ITSME_CATEGORIES, items: [] },
  comments: { items: [] },
  keywords: { items: [] },
  trending: { items: [] },
  president: {
    profile: { name: "", photo: "", party: "", birth: "", education: "", inauguratedAt: "", term: "" },
    career: [], elections: [], vision: "", policies: [], pledges: [], nationalTasks: [], channels: [], updatedAt: ""
  }
};

function clone(v) { return JSON.parse(JSON.stringify(v)); }
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
    }
    return body;
  } catch (error) {
    return { ok: false, error: error.code || error.message, status: error.status || 0 };
  }
}

export async function getHomeSnapshot() {
  try {
    const body = await requestJSON(`/api/v3/home${homeRevision ? `?r=${homeRevision}` : ""}`);
    storageState = { available: true, error: "" };
    return body?.data || Object.fromEntries(Object.keys(defaults).map(k => [k, defaultDomain(k)]));
  } catch (error) {
    storageState = { available: false, error: error.code || error.message };
    return Object.fromEntries(Object.keys(defaults).map(k => [k, defaultDomain(k)]));
  }
}

export function clearDomainCache(domain) {
  if (domain) CACHE.delete(domain);
  else CACHE.clear();
}
