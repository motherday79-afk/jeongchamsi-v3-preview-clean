const { getJSON } = require("../../../lib/v3/redis");
const { defaultDomain } = require("../../../lib/v3/schema");
const { countUsers } = require("../../../lib/v3/users");
const { getRecentBadgeCelebrations } = require("../../../lib/v3/badge-celebrations");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok:false, error:"METHOD_NOT_ALLOWED" });
  }
  try {
    const [brand, memberCount, badgeCelebrations] = await Promise.all([getJSON("brand"), countUsers(), getRecentBadgeCelebrations(6)]);
    const source = brand || defaultDomain("brand");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=30");
    return res.status(200).json({ ok:true, data:{ memberCount, liveBar:source?.liveBar || { useActualCount:true, overrideCount:0 }, badgeCelebrations } });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok:false, error:error?.code || "LIVEBAR_READ_FAILED" });
  }
};
