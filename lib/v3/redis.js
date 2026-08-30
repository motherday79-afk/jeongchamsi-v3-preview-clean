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


function storageTraceForCommand(args, bodyText) {
  const list = Array.isArray(args) ? args : [];
  const command = String(list[0] || "UNKNOWN").toUpperCase();
  const bytes = Buffer.byteLength(String(bodyText || ""), "utf8");
  const keys = [];
  if (command === "MSET") {
    for (let i = 1; i < list.length; i += 2) keys.push(String(list[i] || "").slice(0, 180));
  } else if (["SET","GET","DEL","MGET","ZADD","ZREM","HSET","HGET","LPUSH","RPUSH","SADD"].includes(command)) {
    for (let i = 1; i < Math.min(list.length, 12); i += 1) {
      const value = String(list[i] || "");
      if (value.startsWith("jcv3:") || i === 1) keys.push(value.slice(0, 180));
    }
  }
  return { command, bytes, keys: [...new Set(keys)].slice(0, 12) };
}

function attachStorageTrace(error, trace) {
  if (!error || !trace) return error;
  error.storageTrace = trace;
  const suffix = `[JCS_STORAGE_TRACE command=${trace.command} bytes=${trace.bytes} keys=${trace.keys.join(",") || "-"}]`;
  if (!String(error.message || "").includes("JCS_STORAGE_TRACE")) error.message = `${String(error.message || "STORAGE_REQUEST")}\n${suffix}`;
  return error;
}

async function command(args) {
  const { url, token } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    let response;
    try {
      const requestBody = JSON.stringify(args);
      const trace = storageTraceForCommand(args, requestBody);
      if (["SET","MSET","DEL","ZADD","ZREM","HSET","LPUSH","RPUSH","SADD"].includes(trace.command)) console.info(`[JCS_STORAGE_TRACE] command=${trace.command} bytes=${trace.bytes} keys=${trace.keys.join(",") || "-"}`);
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: requestBody,
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
      const requestBody = JSON.stringify(args);
      const trace = storageTraceForCommand(args, requestBody);
      console.error(`[JCS_STORAGE_TRACE_FAIL] command=${trace.command} bytes=${trace.bytes} keys=${trace.keys.join(",") || "-"} error=${String(body.error || `REDIS_${response.status}`)}`);
      throw attachStorageTrace(error, trace);
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

async function pipeline(commands) {
  const { url, token } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    let response;
    try {
      response = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(commands) ? commands : []),
        signal: controller.signal
      });
    } catch (cause) {
      const error = new Error("JCV3_STORAGE_NETWORK_ERROR");
      error.code = "STORAGE_NETWORK"; error.cause = cause; throw error;
    }
    const body = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(body)) { const error = new Error(`REDIS_${response.status}`); error.code = "STORAGE_REQUEST"; throw error; }
    const failed = body.find(x => x && x.error);
    if (failed) { const error = new Error(failed.error); error.code = "STORAGE_REQUEST"; throw error; }
    return body.map(x => x?.result);
  } finally { clearTimeout(timer); }
}

async function mgetRawJSON(keys) {
  const raw = keys.length ? await command(["MGET", ...keys]) : [];
  return keys.map((key, i) => { try { return raw?.[i] ? JSON.parse(raw[i]) : null; } catch { return null; } });
}


async function scanDomains(pattern, count = 500) {
  const prefix = contentKey("");
  const found = [];
  let cursor = "0";
  let guard = 0;
  do {
    const result = await command(["SCAN", cursor, "MATCH", contentKey(pattern), "COUNT", String(count)]);
    cursor = String(result?.[0] ?? "0");
    const keys = Array.isArray(result?.[1]) ? result[1] : [];
    for (const key of keys) {
      const raw = String(key || "");
      if (raw.startsWith(prefix)) found.push(raw.slice(prefix.length));
    }
    guard += 1;
    if (guard > 10000) {
      const error = new Error("JCV3_STORAGE_SCAN_GUARD");
      error.code = "STORAGE_REQUEST";
      throw error;
    }
  } while (cursor !== "0");
  return [...new Set(found)];
}

async function deleteDomains(domains, batchSize = 100) {
  const unique = [...new Set((Array.isArray(domains) ? domains : []).filter(Boolean).map(String))];
  let deleted = 0;
  for (let i = 0; i < unique.length; i += batchSize) {
    const chunk = unique.slice(i, i + batchSize);
    deleted += Number(await command(["DEL", ...chunk.map(contentKey)])) || 0;
  }
  return deleted;
}
async function msetJSON(entries) {
  const items = (Array.isArray(entries) ? entries : []).filter(entry => Array.isArray(entry) && entry.length >= 2);
  if (!items.length) return null;
  const args = ["MSET"];
  for (const [domain, data] of items) args.push(contentKey(domain), JSON.stringify(data));
  return command(args);
}

module.exports = { config, command, pipeline, health, getJSON, setJSON, mgetJSON, mgetRawJSON, msetJSON, scanDomains, deleteDomains };
