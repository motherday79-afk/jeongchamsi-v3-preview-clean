const { mgetJSON } = require("../../lib/v3/redis");
const { defaultDomain } = require("../../lib/v3/schema");

const DOMAINS = ["columns", "community", "news", "polls", "academy", "generation", "nationalEvaluation", "itsme", "keywords", "trending"];

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=45");
  try {
    const values = await mgetJSON(DOMAINS);
    const data = Object.fromEntries(DOMAINS.map((domain, i) => [domain, values[i] || defaultDomain(domain)]));
    return res.status(200).json({ ok: true, storage: "redis", data });
  } catch (error) {
    if (error?.code === "STORAGE_MISSING") {
      const data = Object.fromEntries(DOMAINS.map(domain => [domain, defaultDomain(domain)]));
      return res.status(200).json({ ok: true, storage: "browser-preview", data });
    }
    return res.status(503).json({ ok: false, error: "JCV3_STORAGE_UNAVAILABLE" });
  }
};
