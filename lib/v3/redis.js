function clean(value) {
  let v = String(value || "").trim();
  if (!v) return "";
  const eq = v.indexOf("=");
  if (eq > 0 && /^[A-Z0-9_]+=/.test(v)) v = v.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

function pair(urlName, tokenName, source) {
  const url = clean(process.env[urlName]).replace(/\/+$/, "");
  const token = clean(process.env[tokenName]);
  if (!url || !token) return null;
  if (!/^https:\/\//i.test(url)) return null;
  return { url, token, source };
}

function config() {
  // Deliberately use only canonical variable PAIRS.
  // Never mix URL from one provider name with a token from another.
  // Never read legacy malformed names such as
  // UPSTASH_REDIS_REST_KV_REST_API_URL.
  const selected =
    pair("JCV3_REDIS_REST_URL", "JCV3_REDIS_REST_TOKEN", "JCV3") ||
    pair("KV_REST_API_URL", "KV_REST_API_TOKEN", "VERCEL_KV") ||
    pair("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "UPSTASH");

  if (!selected) {
    const error = new Error("JCV3_STORAGE_NOT_CONFIGURED");
    error.code = "STORAGE_MISSING";
    throw error;
  }
  return selected;
}

async function command(args) {
  const { url, token } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(args),
        signal: controller.signal
      });
    } catch (cause) {
      const error = new Error("JCV3_STORAGE_NETWORK_ERROR");
      error.code = "STORAGE_NETWORK";
      error.cause = cause;
      throw error;
    }

    const body = await response.json().catch(() => ({}));

    if (!response.ok || body.error) {
      const error = new Error(body.error || `REDIS_${response.status}`);
      error.code =
        response.status === 401 || response.status === 403
          ? "STORAGE_AUTH"
          : "STORAGE_REQUEST";
      throw error;
    }

    return body.result;
  } finally {
    clearTimeout(timer);
  }
}

async function health() {
  const cfg = config();
  await command(["PING"]);
  return { ok: true, source: cfg.source };
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

async function msetJSON(entries = []) {
  if (!Array.isArray(entries) || !entries.length) return null;
  const args = ["MSET"];
  for (const [domain, data] of entries) args.push(contentKey(domain), JSON.stringify(data));
  return command(args);
}

module.exports = { config, command, health, getJSON, setJSON, mgetJSON, msetJSON };
