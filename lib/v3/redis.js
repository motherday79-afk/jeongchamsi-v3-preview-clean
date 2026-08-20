function clean(value) {
  let v = String(value || "").trim();
  if (!v) return "";
  const eq = v.indexOf("=");
  if (eq > 0 && /^[A-Z0-9_]+=/.test(v)) v = v.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1).trim();
  return v;
}

function config() {
  const url = clean(
    process.env.JCV3_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL ||
    process.env.KV_REST_API_URL
  ).replace(/\/+$/, "");
  const token = clean(
    process.env.JCV3_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN ||
    process.env.KV_REST_API_TOKEN
  );
  if (!url || !token) {
    const error = new Error("JCV3_STORAGE_NOT_CONFIGURED");
    error.code = "STORAGE_MISSING";
    throw error;
  }
  return { url, token };
}

async function command(args) {
  const { url, token } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2200);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error) {
      const error = new Error(body.error || `REDIS_${response.status}`);
      error.code = "STORAGE_REQUEST";
      throw error;
    }
    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

const contentKey = domain => `jcv3:content:v4:${domain}`;

async function getJSON(domain) {
  const raw = await command(["GET", contentKey(domain)]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

async function setJSON(domain, data) {
  return command(["SET", contentKey(domain), JSON.stringify(data)]);
}

async function mgetJSON(domains) {
  const raw = await command(["MGET", ...domains.map(contentKey)]);
  return domains.map((domain, i) => {
    try { return raw?.[i] ? JSON.parse(raw[i]) : null; }
    catch { return null; }
  });
}

module.exports = { config, command, getJSON, setJSON, mgetJSON };
