const DOMAINS = new Set(["columns", "community", "news", "polls", "academy", "generation", "nationalEvaluation", "itsme"]);

const defaults = {
  columns: { items: [] },
  community: { items: [] },
  news: { items: [] },
  polls: { items: [] },
  academy: { slots: [] },
  generation: { enabled: false, candidates: [] },
  nationalEvaluation: { enabled: false, subjectId: null },
  itsme: { cards: [] }
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
    return { items: (input?.items || []).slice(0, 120).map(sanitizePost) };
  }

  if (domain === "polls") {
    return {
      items: (input?.items || []).slice(0, 60).map(p => ({
        id: text(p.id, 120),
        question: text(p.question, 180),
        options: (p.options || []).slice(0, 10).map(o => ({ id: text(o.id, 140), label: text(o.label, 100), votes: num(o.votes) })),
        published: p.published !== false,
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

  if (domain === "generation") return { enabled: bool(input?.enabled), candidates: Array.isArray(input?.candidates) ? input.candidates.slice(0, 20) : [] };
  if (domain === "nationalEvaluation") return { enabled: bool(input?.enabled), subjectId: input?.subjectId ? text(input.subjectId, 120) : null };
  if (domain === "itsme") return { cards: Array.isArray(input?.cards) ? input.cards.slice(0, 20) : [] };
  return defaultDomain(domain);
}

module.exports = { validDomain, defaultDomain, sanitize };
