const { mgetJSON } = require("../../../lib/v3/redis");
const { defaultDomain } = require("../../../lib/v3/schema");
const { countUsers } = require("../../../lib/v3/users");
const { derivePublicSignals } = require("../lib/now-public-signals");

const CONTENT_DOMAINS = ["columns", "community", "news", "polls", "academy", "generation", "nationalEvaluation", "itsme", "keywords", "trending", "president", "brand"];
const DOMAINS = [...CONTENT_DOMAINS, "nowDataCurrent", "nowDataHistory"];

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  try {
    const [values, memberCount] = await Promise.all([mgetJSON(DOMAINS), countUsers()]);
    const data = Object.fromEntries(CONTENT_DOMAINS.map((d, i) => [d, values[i] || defaultDomain(d)]));
    const current = values[CONTENT_DOMAINS.length] || null;
    const history = values[CONTENT_DOMAINS.length + 1] || null;
    data.nowRank = current;
    data.nowSignals = derivePublicSignals(current, history);
    data.memberCount = memberCount;
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "HOME_READ_FAILED" });
  }
};
