const { mgetJSON } = require("../../../lib/v3/redis");
const { defaultDomain } = require("../../../lib/v3/schema");
const { listUsers } = require("../../../lib/v3/users");

const DOMAINS = ["columns", "community", "news", "polls", "academy", "generation", "nationalEvaluation", "itsme", "keywords", "trending", "president", "brand"];
const NOW_DOMAINS = ["nowDataPublicAdmin", "nowDataPublicHome"];

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  try {
    const readDomains=[...DOMAINS,...NOW_DOMAINS];
    const [values, users] = await Promise.all([mgetJSON(readDomains), listUsers()]);
    const data = Object.fromEntries(DOMAINS.map((d, i) => [d, values[i] || defaultDomain(d)]));
    const nowAdmin=values[DOMAINS.length]||null;
    const nowHome=values[DOMAINS.length+1]||null;
    data.nowRank={ranked:Array.isArray(nowAdmin?.top30)?nowAdmin.top30:[]};
    data.nowSignals=nowHome?.signals||{source:"none",publishedAt:null,keywords:[],rising:[]};
    data.memberCount = users.length;
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=30");
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "HOME_READ_FAILED" });
  }
};
