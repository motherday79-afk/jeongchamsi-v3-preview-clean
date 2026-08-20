const DOMAINS = new Set([
  "columns", "community", "news", "polls", "academy",
  "generation", "nationalEvaluation", "itsme", "comments",
  "keywords", "trending"
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
  polls: {
    items: [{
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
    }]
  },
  academy: { slots: [] },
  generation: { enabled: false, candidates: [] },
  nationalEvaluation: { enabled: false, subjectId: null },
  itsme: { categories: DEFAULT_ITSME_CATEGORIES, items: [] },
  comments: { items: [] },
  keywords: { items: [] },
  trending: { items: [] }
};

function validDomain(domain) { return DOMAINS.has(String(domain || "")); }
function defaultDomain(domain) { return JSON.parse(JSON.stringify(defaults[domain] || { items: [] })); }
function text(v, max = 50000) { return String(v || "").slice(0, max); }
function bool(v) { return !!v; }
function num(v) { const n = Number(v || 0); return Number.isFinite(n) ? n : 0; }
function image(v) {
  const s = String(v || "");
  if (!s) return "";
  if (!(s.startsWith("data:image/") || s.startsWith("https://"))) return "";
  return s.slice(0, 560000);
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
    const categories = (input?.categories || DEFAULT_ITSME_CATEGORIES)
      .map(x => text(x, 60).trim()).filter(Boolean).slice(0, 20);
    return {
      categories: categories.length ? categories : [...DEFAULT_ITSME_CATEGORIES],
      items: (input?.items || []).slice(0, 500).map(sanitizePost)
    };
  }

  if (domain === "polls") {
    return {
      items: (input?.items || []).slice(0, 60).map(p => ({
        id: text(p.id, 120),
        question: text(p.question, 180),
        options: (p.options || []).slice(0, 10).map(o => ({ id: text(o.id, 140), label: text(o.label, 100), votes: num(o.votes) })),
        published: p.published !== false,
        sample: bool(p.sample),
        createdAt: text(p.createdAt, 40),
        updatedAt: text(p.updatedAt, 40)
      }))
    };
  }

  if (domain === "academy") {
    return {
      slots: (input?.slots || []).slice(0, 200).map(s => ({
        id: text(s.id, 120), date: text(s.date, 80), title: text(s.title, 120), description: text(s.description, 180),
        published: s.published !== false, closed: bool(s.closed), createdAt: text(s.createdAt, 40), updatedAt: text(s.updatedAt, 40)
      }))
    };
  }

  if (domain === "comments") {
    return {
      items: (input?.items || []).slice(0, 3000).map(c => ({
        id: text(c.id, 120), domain: text(c.domain, 30), postId: text(c.postId, 120), author: text(c.author, 40), ownerId: text(c.ownerId, 24),
        text: text(c.text, 1000), createdAt: text(c.createdAt, 40), published: c.published !== false
      }))
    };
  }

  if (domain === "keywords") {
    return {
      items: (input?.items || []).slice(0, 15).map((x, i) => ({
        id: text(x.id || `keyword-${i + 1}`, 80),
        rank: i + 1,
        label: text(x.label, 80),
        delta: text(x.delta, 20),
        published: x.published !== false
      })).filter(x => x.label)
    };
  }

  if (domain === "trending") {
    return {
      items: (input?.items || []).slice(0, 10).map((x, i) => ({
        id: text(x.id || `trending-${i + 1}`, 80),
        rank: i + 1,
        title: text(x.title, 120),
        href: text(x.href, 220),
        published: x.published !== false
      })).filter(x => x.title)
    };
  }

  if (domain === "generation") return { enabled: bool(input?.enabled), candidates: Array.isArray(input?.candidates) ? input.candidates.slice(0, 20) : [] };
  if (domain === "nationalEvaluation") return { enabled: bool(input?.enabled), subjectId: input?.subjectId ? text(input.subjectId, 120) : null };
  return defaultDomain(domain);
}

module.exports = { validDomain, defaultDomain, sanitize, DEFAULT_ITSME_CATEGORIES };
