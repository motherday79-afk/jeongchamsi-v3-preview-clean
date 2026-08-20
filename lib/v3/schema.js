const DOMAINS = new Set([
  "columns", "community", "news", "polls", "academy",
  "generation", "nationalEvaluation", "itsme", "comments",
  "keywords", "trending", "president"
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
  generation: { enabled: true, candidates: [], results: {} },
  nationalEvaluation: { enabled: false, subjectId: null, results: {} },
  itsme: { categories: DEFAULT_ITSME_CATEGORIES, items: [] },
  comments: { items: [] },
  keywords: { items: [] },
  trending: { items: [] },
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
    return { categories: categories.length ? categories : [...DEFAULT_ITSME_CATEGORIES], items: (input?.items || []).slice(0, 500).map(sanitizePost) };
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
    const results = {};
    for (const [age, votes] of Object.entries(input?.results || {})) {
      results[text(age, 20)] = Object.fromEntries(Object.entries(votes || {}).slice(0, 543).map(([id, count]) => [text(id, 120), num(count)]));
    }
    return {
      enabled: input?.enabled !== false,
      candidates: textList(input?.candidates, 543, 120),
      results
    };
  }

  if (domain === "nationalEvaluation") {
    const results = {};
    for (const [personId, votes] of Object.entries(input?.results || {})) {
      results[text(personId, 120)] = {
        positive: num(votes?.positive),
        neutral: num(votes?.neutral),
        negative: num(votes?.negative)
      };
    }
    return { enabled: bool(input?.enabled), subjectId: input?.subjectId ? text(input.subjectId, 120) : null, results };
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
