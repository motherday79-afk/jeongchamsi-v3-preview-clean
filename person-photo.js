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

async function redisCommand(args, timeoutMs = 1800) {
  const { url, token } = redisConfig();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
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
  if (v == null) return null;
  if (typeof v === "object") return v;
  if (typeof v !== "string") return null;
  try {
    if (v.startsWith(COMPRESSED_PREFIX)) {
      const raw = zlib.gunzipSync(
        Buffer.from(v.slice(COMPRESSED_PREFIX.length), "base64")
      ).toString("utf8");
      return JSON.parse(raw);
    }
    return JSON.parse(v);
  } catch {
    return null;
  }
}

function sizeOf(value) {
  return Number(value) >= 300 ? 360 : 160;
}

function sendImmutable(res, buf, mime, source) {
  res.setHeader("Content-Type", mime || "image/webp");
  res.setHeader("Content-Length", String(buf.length));
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("CDN-Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Vercel-CDN-Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-JCV3-Photo", source);
  return res.status(200).send(buf);
}

async function fetchKnownImage(photo) {
  const url = String(photo?.url || "");
  if (!/^https?:\/\//i.test(url)) return null;

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 3200);
  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
    };
    if (photo?.profileUrl && /^https?:\/\//i.test(String(photo.profileUrl))) {
      headers.Referer = String(photo.profileUrl);
    }

    const r = await fetch(url, { signal: ctl.signal, redirect: "follow", headers });
    if (!r.ok) return null;
    const ct = String(r.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("image/")) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 1200 || buf.length > 9 * 1024 * 1024) return null;
    return { buf, mime: ct };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
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

  // 1) PHOTO MASTER direct key — do not depend on the master index.
  const masterKey = `jjdd:photo-master:${PHOTO_MASTER_VERSION}:${id}:${size}`;
  const master = parseJSONValue(await redisCommand(["GET", masterKey]));
  if (master?.data) {
    const buf = Buffer.from(master.data, "base64");
    if (buf.length) {
      return sendImmutable(res, buf, master.mime || "image/webp", "MASTER-DIRECT");
    }
  }

  // 2) Last-known-good only. No search or repair on the display hot path.
  const keys = [
    `jjdd:local-photo:override:${id}`,
    `jjdd:local-photo:resolved:${id}:v5-hq-web-search`,
    `jjdd:local-photo:last-good:${id}:v1`
  ];
  const raw = await redisCommand(["MGET", ...keys]);
  const rows = Array.isArray(raw) ? raw.map(parseJSONValue) : [];
  const photo = rows.find((x) => x?.url && /^https?:\/\//i.test(String(x.url)));

  if (!photo) {
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(404).end();
  }

  const got = await fetchKnownImage(photo);
  if (!got) {
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(404).end();
  }

  return sendImmutable(res, got.buf, got.mime, "LKG-IMMUTABLE");
};
