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
  nationalEvaluation: { enabled: false, subjectId: null, results: {}, history: [], demoMode: false, demoResults: {} },
  itsme: { categories: DEFAULT_ITSME_CATEGORIES, items: [] },
  comments: { items: [] },
  keywords: { items: [] },
  trending: { items: [] },
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
      intro: "정치는 선거일 하루에만 존재하지 않습니다. 우리의 일상과 선택, 지역과 미래를 매일 움직입니다",
      body: "정참시는 정치인을 지지하거나 공격하기 위해 만든 곳이 아닙니다. 더 알고, 비교하고, 질문하고, 선택하고, 평가하기 위해 만들었습니다\n\n정치인을 알아보는 것도 참여입니다. 정책과 기록을 비교하는 것도 참여입니다. 시민의 생각을 표현하고, 선출된 이후에도 계속 지켜보며 평가하는 것도 참여입니다\n\n정치는 정치인만의 것이 아닙니다. 정치의 결과를 살아가는 사람이 시민이라면, 정치의 과정에도 시민의 자리가 있어야 합니다\n\n한 사람의 관심은 작을 수 있습니다. 하지만 수많은 한 사람이 알고, 묻고, 비교하고, 선택하기 시작하면 정치의 방향은 달라질 수 있습니다\n\n그래서 우리는 정참시를 만들었습니다. 바라볼 때가 아닌, 행동할 때 정치가 시작되니까요"
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
    return body?.data || { ...Object.fromEntries(Object.keys(defaults).map(k => [k, defaultDomain(k)])), memberCount: 0 };
  } catch (error) {
    storageState = { available: false, error: error.code || error.message };
    return { ...Object.fromEntries(Object.keys(defaults).map(k => [k, defaultDomain(k)])), memberCount: 0 };
  }
}

export function clearDomainCache(domain) {
  if (domain) CACHE.delete(domain);
  else CACHE.clear();
}


export async function getAuthorProfiles(ownerIds = []) {
  const ids = [...new Set((Array.isArray(ownerIds) ? ownerIds : []).map(x => String(x || "").trim()).filter(Boolean))].slice(0, 120);
  if (!ids.length) return {};
  try {
    const body = await requestJSON(`/api/v3/authors?ids=${encodeURIComponent(ids.join(","))}&r=${Date.now()}`);
    return body?.profiles || {};
  } catch { return {}; }
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
