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
    const urlCandidates = [
      ["UPSTASH_REDIS_REST_URL", process.env.UPSTASH_REDIS_REST_URL],
      ["KV_REST_API_URL", process.env.KV_REST_API_URL],
      ["UPSTASH_REDIS_REST_KV_REST_API_URL", process.env.UPSTASH_REDIS_REST_KV_REST_API_URL],
      ["STORAGE_KV_REST_API_URL", process.env.STORAGE_KV_REST_API_URL],
      ["UPSTASH_KV_REST_API_URL", process.env.UPSTASH_KV_REST_API_URL]
    ];
    const tokenCandidates = [
      ["UPSTASH_REDIS_REST_TOKEN", process.env.UPSTASH_REDIS_REST_TOKEN],
      ["KV_REST_API_TOKEN", process.env.KV_REST_API_TOKEN],
      ["UPSTASH_REDIS_REST_KV_REST_API_TOKEN", process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN],
      ["STORAGE_KV_REST_API_TOKEN", process.env.STORAGE_KV_REST_API_TOKEN],
      ["UPSTASH_KV_REST_API_TOKEN", process.env.UPSTASH_KV_REST_API_TOKEN]
    ];

    const urlEntry = urlCandidates.find(([, value]) => String(value || "").trim());
    const tokenEntry = tokenCandidates.find(([, value]) => String(value || "").trim());

    let code = "REDIS_REQUEST";
    const raw = String(error?.message || error || "");

    if (!urlEntry || !tokenEntry) {
      code = "ENV_MISSING";
    } else if (/unauthor|forbidden|invalid.*token|auth|401|403/i.test(raw)) {
      code = "REDIS_AUTH";
    } else if (/not configured|environment variables were not found/i.test(raw)) {
      code = "ENV_MISSING";
    }

    // Never return secret values or the Redis URL itself.
    return res.status(503).json({
      ok: false,
      error: "rank backend unavailable",
      diagnostic: {
        code,
        urlDetected: Boolean(urlEntry),
        tokenDetected: Boolean(tokenEntry),
        urlKey: urlEntry?.[0] || null,
        tokenKey: tokenEntry?.[0] || null,
        urlHasWrappingQuotes: Boolean(urlEntry && /^["']|["']$/.test(String(urlEntry[1]).trim())),
        tokenHasWrappingQuotes: Boolean(tokenEntry && /^["']|["']$/.test(String(tokenEntry[1]).trim())),
        runtime: process.env.VERCEL_ENV || "unknown"
      }
    });
  }
};
