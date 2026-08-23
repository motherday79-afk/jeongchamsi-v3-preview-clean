const { mgetJSON, setJSON } = require("../../../lib/v3/redis");
const { defaultDomain } = require("../../../lib/v3/schema");
const { countUsers } = require("../../../lib/v3/users");
const { buildHomePublicSnapshot } = require("../lib/now-public-snapshot");
const { FEED_DOMAIN, publicCelebrationFeed } = require("../../../lib/v3/badge-celebrations");

const CONTENT_DOMAINS = ["columns", "community", "news", "polls", "academy", "generation", "nationalEvaluation", "itsme", "keywords", "trending", "president", "brand"];
const PUBLIC_NOW_DOMAIN = "nowDataPublicHome";
const DOMAINS = [...CONTENT_DOMAINS, PUBLIC_NOW_DOMAIN, FEED_DOMAIN];

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  try {
    const [values, memberCount] = await Promise.all([mgetJSON(DOMAINS), countUsers()]);
    const data = Object.fromEntries(CONTENT_DOMAINS.map((d, i) => [d, values[i] || defaultDomain(d)]));
    let publicNow = values[CONTENT_DOMAINS.length] || null;
    const celebrationFeed = values[CONTENT_DOMAINS.length + 1] || null;

    // One-time migration path for deployments that already have a published
    // pre-0.36.46 NOW snapshot. The normal fast path never reads the 542-row
    // source snapshot again after this compact snapshot is created.
    if (!publicNow) {
      const [current, history] = await mgetJSON(["nowDataCurrent", "nowDataHistory"]);
      if (current?.ranked?.length) {
        publicNow = buildHomePublicSnapshot(current, history);
        await setJSON(PUBLIC_NOW_DOMAIN, publicNow);
      }
    }

    data.nowRank = publicNow?.top10?.length ? {
      draftId: publicNow.draftId,
      publishedAt: publicNow.publishedAt,
      weights: publicNow.weights || {},
      total: publicNow.total || 0,
      ranked: publicNow.top10
    } : null;
    data.nowSignals = publicNow?.signals || { source:"none", publishedAt:null, keywords:[], rising:[] };
    data.memberCount = memberCount;
    data.badgeCelebrations = publicCelebrationFeed(celebrationFeed || {}, 6);
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "HOME_READ_FAILED" });
  }
};
