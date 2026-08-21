const { mgetJSON } = require("../../../lib/v3/redis");
const { defaultDomain } = require("../../../lib/v3/schema");

const DOMAINS = ["columns", "community", "news", "polls", "academy", "generation", "nationalEvaluation", "itsme", "keywords", "trending", "president", "brand"];

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  try {
    const values = await mgetJSON(DOMAINS);
    const data = Object.fromEntries(DOMAINS.map((d, i) => [d, values[i] || defaultDomain(d)]));
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=30");
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "HOME_READ_FAILED" });
  }
};
