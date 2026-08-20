const zlib = require("zlib");
const { publicSnapshot } = require("../../lib/public_snapshot");

const COMPRESSED_PREFIX = "__JJDD_GZIP_B64_V1__:";

function cache(res) {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, must-revalidate");
  res.setHeader("CDN-Cache-Control", "public, max-age=30");
  res.setHeader("Vercel-CDN-Cache-Control", "public, max-age=30");
}

function cleanEnv(value) {
  let v = String(value || "").trim();
  if (!v) return "";
  const eq = v.indexOf("=");
  if (eq > 0 && /^[A-Z0-9_]+=/.test(v)) v = v.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function redisConfig() {
  const url = cleanEnv(
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.STORAGE_KV_REST_API_URL ||
    process.env.UPSTASH_KV_REST_API_URL
  ).replace(/\/+$/, "");

  const token = cleanEnv(
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.STORAGE_KV_REST_API_TOKEN ||
    process.env.UPSTASH_KV_REST_API_TOKEN
  );

  if (!url || !token) {
    const e = new Error("ENV_MISSING");
    e.code = "ENV_MISSING";
    throw e;
  }
  if (!/^https:\/\//i.test(url)) {
    const e = new Error("REDIS_URL_INVALID");
    e.code = "REDIS_URL_INVALID";
    throw e;
  }
  return { url, token };
}

async function redisCommand(args) {
  const { url, token } = redisConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2200);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(args),
      signal: controller.signal
    });

    const text = await response.text();
    let body = {};
    try { body = JSON.parse(text); } catch {}

    if (!response.ok || body?.error) {
      const status = Number(response.status || 0);
      const raw = String(body?.error || text || "");
      const e = new Error("REDIS_REQUEST_FAILED");
      e.code = (
        status === 401 ||
        status === 403 ||
        /unauthor|forbidden|auth|token/i.test(raw)
      ) ? "REDIS_AUTH" : `REDIS_HTTP_${status || "ERROR"}`;
      throw e;
    }

    return body?.result ?? null;
  } catch (error) {
    if (error?.name === "AbortError") {
      const e = new Error("REDIS_TIMEOUT");
      e.code = "REDIS_TIMEOUT";
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJSONValue(v) {
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;

  try {
    if (v.startsWith(COMPRESSED_PREFIX)) {
      const raw = zlib
        .gunzipSync(Buffer.from(v.slice(COMPRESSED_PREFIX.length), "base64"))
        .toString("utf8");
      return JSON.parse(raw);
    }
    return JSON.parse(v);
  } catch {
    return null;
  }
}

async function getJSON(key) {
  return parseJSONValue(await redisCommand(["GET", key]));
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
    let current = await getJSON("jjdd:current:public");

    if (!current || !Array.isArray(current.members)) {
      const full = await getJSON("jjdd:current");
      if (!full) {
        return res.status(404).json({
          ok: false,
          error: "published snapshot not found",
          diagnostic: { code: "SNAPSHOT_MISSING" }
        });
      }
      current = publicSnapshot(full);
    }

    const members = (Array.isArray(current.members) ? current.members : [])
      .filter((m) => m && Number(m.id) !== 300 && String(m.party || "") !== "공석")
      .filter((m) => finite(m.overallRank) || finite(m.rank) || finite(m.categoryRank))
      .sort((a, b) => rankOf(a) - rankOf(b))
      .slice(0, 10)
      .map(compactHomeMember);

    return res.status(200).json({
      ok: true,
      schemaVersion: 3,
      publicationId: current.publicationId || null,
      publishedAt: current.publishedAt || null,
      timestamp: current.timestamp || null,
      rosterVersion: current.rosterVersion || null,
      members
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      error: "rank backend unavailable",
      diagnostic: {
        code: String(error?.code || error?.message || "REDIS_REQUEST"),
        runtime: process.env.VERCEL_ENV || "unknown"
      }
    });
  }
};
