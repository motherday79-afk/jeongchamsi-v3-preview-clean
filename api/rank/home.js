const store = require("../../lib/store");
const { publicSnapshot } = require("../../lib/public_snapshot");

function cache(res) {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, must-revalidate");
  res.setHeader("CDN-Cache-Control", "public, max-age=30");
  res.setHeader("Vercel-CDN-Cache-Control", "public, max-age=30");
}

function finite(v) {
  return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
}

function rankOf(m) {
  if (finite(m.overallRank)) return Number(m.overallRank);
  if (finite(m.rank)) return Number(m.rank);
  if (finite(m.categoryRank)) return Number(m.categoryRank);
  return 999999;
}

function compactHomeMember(m = {}) {
  return {
    id: m.id ?? null,
    name: String(m.name || ""),
    party: String(m.party || "무소속"),
    region: String(m.region || ""),
    constituency: String(m.constituency || m.jurisdiction || ""),
    overallRank: finite(m.overallRank) ? Number(m.overallRank) : null,
    rank: finite(m.rank) ? Number(m.rank) : null,
    categoryRank: finite(m.categoryRank) ? Number(m.categoryRank) : null,
    previousOverallRank: finite(m.previousOverallRank) ? Number(m.previousOverallRank) : null,
    previousRank: finite(m.previousRank) ? Number(m.previousRank) : null,
    changeOverallRefresh: finite(m.changeOverallRefresh) ? Number(m.changeOverallRefresh) : null,
    changeRefresh: finite(m.changeRefresh) ? Number(m.changeRefresh) : null
  };
}

module.exports = async function handler(req, res) {
  cache(res);

  try {
    let current = await store.getJSON("jjdd:current:public");

    if (!current || Number(current.schemaVersion || 0) < 4 || !current.rosterVersion) {
      const full = await store.getJSON("jjdd:current");
      if (!full) {
        return res.status(404).json({ ok: false, error: "published snapshot not found" });
      }
      current = publicSnapshot(full);
      if (current.rosterVersion) {
        store.setJSON("jjdd:current:public", current).catch(() => {});
      }
    }

    const members = (Array.isArray(current.members) ? current.members : [])
      .filter((m) => m && Number(m.id) !== 300 && String(m.party || "") !== "공석")
      .filter((m) => finite(m.overallRank) || finite(m.rank) || finite(m.categoryRank))
      .sort((a, b) => rankOf(a) - rankOf(b))
      .slice(0, 10)
      .map(compactHomeMember);

    return res.status(200).json({
      ok: true,
      schemaVersion: 1,
      publicationId: current.publicationId || null,
      publishedAt: current.publishedAt || null,
      timestamp: current.timestamp || null,
      rosterVersion: current.rosterVersion || null,
      members
    });
  } catch (error) {
    const urlDetected = Boolean(
      process.env.UPSTASH_REDIS_REST_KV_REST_API_URL
    );

    const tokenDetected = Boolean(
      process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
    );

    const message = String(error?.message || "");
    let code = "REDIS_REQUEST";

    if (!urlDetected || !tokenDetected) {
      code = "ENV_MISSING";
    } else if (/401|403|unauthor|forbidden|token|auth/i.test(message)) {
      code = "REDIS_AUTH";
    } else if (/fetch|network|ENOTFOUND|ECONN/i.test(message)) {
      code = "REDIS_NETWORK";
    }

    return res.status(503).json({
      ok: false,
      error: "rank backend unavailable",
      diagnostic: {
        code,
        urlDetected,
        tokenDetected,
        runtime: process.env.VERCEL_ENV || "unknown"
      }
    });
  }
};
