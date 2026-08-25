const DOMAINS = new Set([
  "columns", "community", "news", "polls", "academy",
  "generation", "nationalEvaluation", "itsme", "comments",
  "keywords", "trending", "president", "brand", "politicianPhotos"
]);

const DEFAULT_ITSME_CATEGORIES = [
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
  academy: { slots: [] },
  generation: { enabled: true, candidates: [], results: {}, demoMode: false, demoResults: {} },
  nationalEvaluation: {
    enabled: false,
    subjectId: null,
    slots: {
      assembly: { slot: "assembly", evaluationId: "", subjectId: null, enabled: false, startedAt: "", updatedAt: "", closedAt: "" },
      local: { slot: "local", evaluationId: "", subjectId: null, enabled: false, startedAt: "", updatedAt: "", closedAt: "" }
    },
    results: {}, history: [], demoMode: false, demoResults: {}
  },
  itsme: { categories: DEFAULT_ITSME_CATEGORIES, items: [] },
  comments: { items: [] },
  keywords: { items: [] },
  trending: { items: [] },
  politicianPhotos: { items: [] },
    brand: {
    hero: {
      kicker: "정참시 — 정치에 참여할 시간",
      headline: "바라볼 때가 아닌, 행동할 때 정치가 시작됩니다.",
      productHeadline: "정치를 보는 것에서 움직이는 것으로!",
      subline1: "알고, 비교하고, 선택하고, 평가하는 것.",
      subline2: "한 사람의 작은 행동이 정치의 방향을 만듭니다.",
      learnLabel: "정참시 더 알아보기",
      supportLabel: "정참시 후원하기",
      artImage: ""
    },
    about: {
      title: "왜 정참시인가",
      intro: "정치는 선거일 하루에만 존재하지 않습니다. 우리의 일상과 선택, 지역과 미래를 매일 움직입니다.",
      body: "정참시는 정치인을 지지하거나 공격하기 위해 만든 곳이 아닙니다. 더 알고, 비교하고, 질문하고, 선택하고, 평가하기 위해 만들었습니다.\n\n정치인을 알아보는 것도 참여입니다. 정책과 기록을 비교하는 것도 참여입니다. 시민의 생각을 표현하고, 선출된 이후에도 계속 지켜보며 평가하는 것도 참여입니다.\n\n정치는 정치인만의 것이 아닙니다. 정치의 결과를 살아가는 사람이 시민이라면, 정치의 과정에도 시민의 자리가 있어야 합니다.\n\n한 사람의 관심은 작을 수 있습니다. 하지만 수많은 한 사람이 알고, 묻고, 비교하고, 선택하기 시작하면 정치의 방향은 달라질 수 있습니다.\n\n그래서 우리는 정참시를 만들었습니다. 바라볼 때가 아닌, 행동할 때 정치가 시작되니까요."
    },
    liveBar: { useActualCount: true, overrideCount: 0 },
    support: {
      title: "정참시 후원하기",
      intro: "정치에 참여할 수 있는 더 나은 공간을 함께 만들어 주세요.",
      body: "정참시는 시민이 정치 정보를 더 쉽게 이해하고, 비교하고, 선택하고, 평가할 수 있는 공간을 만들고 있습니다.\n\n후원은 정참시의 서비스 운영, 데이터 정비, 콘텐츠 제작, 시민 참여 기능 개선에 사용됩니다.\n\n후원 방법과 세부 운영 원칙은 준비되는 대로 투명하게 공개하겠습니다.",
      note: "현재 후원 방법은 준비 중입니다."
    },
    updatedAt: ""
  },
  president: {
    profile: { name: "", photo: "", party: "", birth: "", education: "", inauguratedAt: "", term: "" },
    career: [],
    elections: [],
    vision: "",
    policies: [],
    pledges: [],
    nationalTasks: [],
    channels: [],
    updatedAt: ""
  }
};

function validDomain(domain) { return DOMAINS.has(String(domain || "")); }
function defaultDomain(domain) { return JSON.parse(JSON.stringify(defaults[domain] || { items: [] })); }
function text(v, max = 50000) { return String(v || "").slice(0, max); }
function bool(v) { return !!v; }
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function image(v) {
  const s = String(v || "").trim();
  if (!s || !s.startsWith("https://")) return "";
  return s.slice(0, 1200);
}

function validPoliticianPhotoId(value = "") {
  const id = String(value || "").trim();
  if (id === "assembly-300") return false;
  const m = id.match(/^(assembly|metropolitan|basic)-(\d{3})$/);
  if (!m) return false;
  const max = { assembly:300, metropolitan:16, basic:227 }[m[1]] || 0;
  const n = Number(m[2]);
  return n >= 1 && n <= max;
}
function blobImage(v) {
  const s = image(v);
  if (!s) return "";
  try {
    const host = new URL(s).hostname.toLowerCase();
    return host.endsWith(".blob.vercel-storage.com") || host.endsWith(".public.blob.vercel-storage.com") ? s : "";
  } catch { return ""; }
}
function textList(v, maxItems = 30, maxLen = 500) {
  return (Array.isArray(v) ? v : []).slice(0, maxItems).map(x => text(x, maxLen).trim()).filter(Boolean);
}

function sanitizePost(x = {}) {
  return {
    id: text(x.id, 120),
    title: text(x.title, 120),
    summary: text(x.summary, 240),
    author: text(x.author || "정참시", 40),
    ownerId: text(x.ownerId, 24),
    category: text(x.category, 60),
    body: text(x.body, 50000),
    coverImage: image(x.coverImage),
    featured: bool(x.featured),
    published: x.published !== false,
    createdAt: text(x.createdAt, 40),
    updatedAt: text(x.updatedAt, 40),
    likes: num(x.likes),
    views: num(x.views)
  };
}

function sanitizeItsmePost(x = {}) {
  const post = sanitizePost(x);
  post.title = text(x.title, 30);
  post.summary = text(x.summary, 15);
  post.body = text(x.body, 3000);
  return post;
}

function sanitize(domain, input) {
  const rawSize = Buffer.byteLength(JSON.stringify(input || {}), "utf8");
  if (rawSize > 4_200_000) {
    const error = new Error("PAYLOAD_TOO_LARGE");
    error.code = "PAYLOAD_TOO_LARGE";
    throw error;
  }

  if (["columns", "community", "news"].includes(domain)) {
    return { items: (input?.items || []).slice(0, 500).map(sanitizePost) };
  }

  if (domain === "itsme") {
    const categories = (input?.categories || DEFAULT_ITSME_CATEGORIES).map(x => text(x, 60).trim()).filter(Boolean).slice(0, 20);
    return { categories: categories.length ? categories : [...DEFAULT_ITSME_CATEGORIES], items: (input?.items || []).slice(0, 500).map(sanitizeItsmePost) };
  }

  if (domain === "polls") {
    return { items: (input?.items || []).slice(0, 60).map(p => ({
      id: text(p.id, 120),
      question: text(p.question, 180),
      description: text(p.description, 240),
      options: (p.options || []).slice(0, 10).map(o => ({ id: text(o.id, 140), label: text(o.label, 100), votes: num(o.votes) })),
      published: p.published !== false,
      startsAt: text(p.startsAt, 40),
      endsAt: text(p.endsAt, 40),
      createdAt: text(p.createdAt, 40),
      updatedAt: text(p.updatedAt, 40)
    })) };
  }

  if (domain === "academy") {
    return { slots: (input?.slots || []).slice(0, 200).map(s => ({
      id: text(s.id, 120), date: text(s.date, 80), title: text(s.title, 120), description: text(s.description, 180),
      published: s.published !== false, closed: bool(s.closed), createdAt: text(s.createdAt, 40), updatedAt: text(s.updatedAt, 40)
    })) };
  }

  if (domain === "comments") {
    return { items: (input?.items || []).slice(0, 3000).map(c => ({
      id: text(c.id, 120), domain: text(c.domain, 30), postId: text(c.postId, 120), author: text(c.author, 40), ownerId: text(c.ownerId, 24),
      text: text(c.text, 1000), createdAt: text(c.createdAt, 40), published: c.published !== false
    })) };
  }

  if (domain === "keywords") {
    return { items: (input?.items || []).slice(0, 15).map((x, i) => ({
      id: text(x.id || `keyword-${i + 1}`, 80), rank: i + 1, label: text(x.label, 80), delta: text(x.delta, 20), published: x.published !== false
    })).filter(x => x.label) };
  }

  if (domain === "trending") {
    return { items: (input?.items || []).slice(0, 10).map((x, i) => ({
      id: text(x.id || `trending-${i + 1}`, 80), rank: i + 1, title: text(x.title, 120), href: text(x.href, 220), published: x.published !== false
    })).filter(x => x.title) };
  }

  if (domain === "generation") {
    const cleanResults = source => {
      const out = {};
      for (const [age, votes] of Object.entries(source || {})) {
        out[text(age, 20)] = Object.fromEntries(Object.entries(votes || {}).slice(0, 543).map(([id, count]) => [text(id, 120), Math.max(0, num(count))]));
      }
      return out;
    };
    return {
      enabled: input?.enabled !== false,
      candidates: textList(input?.candidates, 543, 120),
      results: cleanResults(input?.results),
      demoMode: input?.demoMode === true,
      demoResults: cleanResults(input?.demoResults)
    };
  }

  if (domain === "nationalEvaluation") {
    const cleanVotes = votes => ({
      positive: Math.max(0, num(votes?.positive)),
      neutral: Math.max(0, num(votes?.neutral)),
      negative: Math.max(0, num(votes?.negative))
    });
    const allowedSubject = (slot, id) => slot === "assembly"
      ? /^assembly-\d{3}$/.test(String(id || ""))
      : (/^metropolitan-\d{3}$/.test(String(id || "")) || /^basic-\d{3}$/.test(String(id || "")));
    const cleanSlot = (slot, raw = {}, fallback = {}) => {
      const candidate = text(raw?.subjectId || fallback?.subjectId, 120);
      const subjectId = allowedSubject(slot, candidate) ? candidate : null;
      const legacyId = subjectId ? `legacy-${slot}-${subjectId}` : "";
      return {
        slot,
        evaluationId: subjectId ? text(raw?.evaluationId || legacyId, 160) : "",
        subjectId,
        enabled: subjectId ? (typeof raw?.enabled === "boolean" ? raw.enabled : bool(fallback?.enabled)) : false,
        startedAt: text(raw?.startedAt || fallback?.startedAt, 60),
        updatedAt: text(raw?.updatedAt || fallback?.updatedAt, 60),
        closedAt: text(raw?.closedAt || fallback?.closedAt, 60)
      };
    };
    const results = {};
    for (const [evaluationId, votes] of Object.entries(input?.results || {}).slice(0, 1000)) {
      const key = text(evaluationId, 160);
      if (key) results[key] = cleanVotes(votes);
    }
    const demoResults = {};
    for (const [evaluationId, votes] of Object.entries(input?.demoResults || {}).slice(0, 1000)) {
      const key = text(evaluationId, 160);
      if (key) demoResults[key] = cleanVotes(votes);
    }
    const rawSlots = input?.slots && typeof input.slots === "object" ? input.slots : {};
    const legacyAssemblyId = allowedSubject("assembly", input?.subjectId) ? text(input.subjectId, 120) : null;
    const slots = {
      assembly: cleanSlot("assembly", rawSlots.assembly || {}, { subjectId: legacyAssemblyId, enabled: input?.enabled === true }),
      local: cleanSlot("local", rawSlots.local || {}, {})
    };
    const history = Array.isArray(input?.history) ? input.history.slice(0, 200).map(x => {
      const slot = x?.slot === "local" ? "local" : "assembly";
      const subjectId = text(x?.subjectId, 120);
      if (!allowedSubject(slot, subjectId)) return null;
      const frozen = cleanVotes(x?.results || x);
      return {
        evaluationId: text(x?.evaluationId || `legacy-${slot}-${subjectId}`, 160),
        slot,
        subjectId,
        positive: frozen.positive,
        neutral: frozen.neutral,
        negative: frozen.negative,
        startedAt: text(x?.startedAt, 60),
        closedAt: text(x?.closedAt, 60)
      };
    }).filter(Boolean) : [];
    return {
      enabled: slots.assembly.enabled,
      subjectId: slots.assembly.subjectId,
      slots,
      results,
      history,
      demoMode: input?.demoMode === true,
      demoResults
    };
  }


  if (domain === "politicianPhotos") {
    const seen = new Set();
    const items = [];
    for (const raw of (Array.isArray(input?.items) ? input.items : []).slice(0, 543)) {
      const id = text(raw?.id, 40);
      if (!validPoliticianPhotoId(id) || seen.has(id)) continue;
      const mini = blobImage(raw?.variants?.mini);
      const card = blobImage(raw?.variants?.card);
      const profile = blobImage(raw?.variants?.profile);
      if (!mini || !card || !profile) continue;
      seen.add(id);
      const miniBytes = Math.max(0, Math.round(num(raw?.bytes?.mini)));
      const cardBytes = Math.max(0, Math.round(num(raw?.bytes?.card)));
      const profileBytes = Math.max(0, Math.round(num(raw?.bytes?.profile)));
      const sourceType = ["manual","auto-wikimedia"].includes(String(raw?.sourceType || "")) ? String(raw.sourceType) : "manual";
      items.push({
        id,
        variants: { mini, card, profile },
        bytes: { mini:miniBytes, card:cardBytes, profile:profileBytes, total:Math.max(0, Math.round(num(raw?.bytes?.total || miniBytes + cardBytes + profileBytes))) },
        original: { width:Math.max(0,Math.round(num(raw?.original?.width))), height:Math.max(0,Math.round(num(raw?.original?.height))), size:Math.max(0,Math.round(num(raw?.original?.size))) },
        focus: text(raw?.focus || "50% 28%", 30),
        sourceType,
        verified: raw?.verified !== false,
        sourcePage: image(raw?.sourcePage),
        sourceUrl: image(raw?.sourceUrl),
        matchScore: Math.max(0,Math.round(num(raw?.matchScore))),
        verification: textList(raw?.verification, 12, 300),
        assetizedAt: text(raw?.assetizedAt, 40),
        updatedAt: text(raw?.updatedAt, 40)
      });
    }
    return { items };
  }

  if (domain === "brand") {
    return {
      hero: {
        kicker: text(input?.hero?.kicker, 100),
        headline: text(input?.hero?.headline, 180),
        productHeadline: text(input?.hero?.productHeadline, 180),
        subline1: text(input?.hero?.subline1, 180),
        subline2: text(input?.hero?.subline2, 180),
        learnLabel: text(input?.hero?.learnLabel, 60),
        supportLabel: text(input?.hero?.supportLabel, 60),
        artImage: image(input?.hero?.artImage)
      },
      about: {
        title: text(input?.about?.title, 100),
        intro: text(input?.about?.intro, 600),
        body: text(input?.about?.body, 12000)
      },
      liveBar: {
        useActualCount: input?.liveBar?.useActualCount !== false,
        overrideCount: Math.max(0, Math.round(num(input?.liveBar?.overrideCount)))
      },
      support: {
        title: text(input?.support?.title, 100),
        intro: text(input?.support?.intro, 600),
        body: text(input?.support?.body, 12000),
        note: text(input?.support?.note, 1000)
      },
      updatedAt: text(input?.updatedAt, 40)
    };
  }

  if (domain === "president") {
    const p = input?.profile || {};
    return {
      profile: {
        name: text(p.name, 80), photo: image(p.photo), party: text(p.party, 80), birth: text(p.birth, 80), education: text(p.education, 180),
        inauguratedAt: text(p.inauguratedAt, 40), term: text(p.term, 100)
      },
      career: textList(input?.career, 30, 500),
      elections: textList(input?.elections, 20, 500),
      vision: text(input?.vision, 3000),
      policies: textList(input?.policies, 30, 500),
      pledges: textList(input?.pledges, 30, 500),
      nationalTasks: textList(input?.nationalTasks, 50, 500),
      channels: textList(input?.channels, 20, 500),
      updatedAt: text(input?.updatedAt, 40)
    };
  }

  return defaultDomain(domain);
}

module.exports = { validDomain, defaultDomain, sanitize, DEFAULT_ITSME_CATEGORIES };
