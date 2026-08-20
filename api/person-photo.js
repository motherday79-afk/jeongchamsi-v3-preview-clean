const zlib = require("zlib");

const COMPRESSED_PREFIX = "__JJDD_GZIP_B64_V1__:";
const PHOTO_MASTER_VERSION = "v260-photo-master-1";

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
  if (!url || !token || !/^https:\/\//i.test(url)) throw new Error("REDIS_CONFIG");
  return { url, token };
}

async function redisGet(key) {
  const { url, token } = redisConfig();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 1800);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["GET", key]),
      signal: ctl.signal
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    return j?.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseJSONValue(v) {
  if (!v) return null;
  if (typeof v === "object") return v;
  try {
    if (String(v).startsWith(COMPRESSED_PREFIX)) {
      const raw = zlib.gunzipSync(
        Buffer.from(String(v).slice(COMPRESSED_PREFIX.length), "base64")
      ).toString("utf8");
      return JSON.parse(raw);
    }
    return JSON.parse(String(v));
  } catch {
    return null;
  }
}

function sizeOf(value) {
  return Number(value) >= 300 ? 360 : 160;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const id = Number(req.query?.id || 0);
  const size = sizeOf(req.query?.s || req.query?.size || 160);
  const version = String(req.query?.v || "").trim();

  if (!id || !version) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).end();
  }

  const key = `jjdd:photo-master:${PHOTO_MASTER_VERSION}:${id}:${size}`;
  const record = parseJSONValue(await redisGet(key));

  if (!record?.data) {
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(404).end();
  }

  const buf = Buffer.from(record.data, "base64");
  if (!buf.length) return res.status(404).end();

  res.setHeader("Content-Type", record.mime || "image/webp");
  res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("CDN-Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Vercel-CDN-Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-JCV3-Photo", "MASTER-IMMUTABLE");
  return res.status(200).send(buf);
};
