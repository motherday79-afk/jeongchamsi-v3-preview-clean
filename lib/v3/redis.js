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

const MAX_REQUEST_BYTES = 6_000_000;
const MAX_DIRECT_JSON_BYTES = 5_500_000;
const JSON_CHUNK_RAW_BYTES = 3_500_000;
const CHUNK_MARKER = "__jcv3_chunked_json_v1__";

function requestBytes(value) {
  return Buffer.byteLength(typeof value === "string" ? value : JSON.stringify(value), "utf8");
}

async function command(args) {
  const { url, token } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const payload = JSON.stringify(args);
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: payload,
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
      const detail = body.error || `REDIS_${response.status}`;
      const error = new Error(detail);
      error.code =
        response.status === 401 || response.status === 403
          ? "STORAGE_AUTH"
          : "STORAGE_REQUEST";
      error.storageCommand = String(args?.[0] || "").toUpperCase();
      error.requestBytes = requestBytes(payload);
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
const chunkKey = (domain, index) => `${contentKey(domain)}:__chunk__:${index}`;

function jsonText(data) {
  const value = JSON.stringify(data);
  return value === undefined ? "null" : value;
}

function parseManifest(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && parsed[CHUNK_MARKER] === 1 && Number.isInteger(parsed.chunks) && parsed.chunks > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function readChunkedJSON(domain, manifest) {
  const buffers = [];
  for (let i = 0; i < manifest.chunks; i += 1) {
    const encoded = await command(["GET", chunkKey(domain, i)]);
    if (typeof encoded !== "string" || !encoded) {
      const error = new Error(`JCV3_STORAGE_CHUNK_MISSING:${domain}:${i}`);
      error.code = "STORAGE_REQUEST";
      throw error;
    }
    buffers.push(Buffer.from(encoded, "base64"));
  }
  const joined = Buffer.concat(buffers);
  if (Number(manifest.bytes) > 0 && joined.length !== Number(manifest.bytes)) {
    const error = new Error(`JCV3_STORAGE_CHUNK_SIZE_MISMATCH:${domain}`);
    error.code = "STORAGE_REQUEST";
    throw error;
  }
  try { return JSON.parse(joined.toString("utf8")); }
  catch {
    const error = new Error(`JCV3_STORAGE_CHUNK_JSON_INVALID:${domain}`);
    error.code = "STORAGE_REQUEST";
    throw error;
  }
}

async function decodeStoredJSON(domain, raw) {
  if (!raw) return null;
  const manifest = parseManifest(raw);
  if (manifest) return readChunkedJSON(domain, manifest);
  try { return JSON.parse(raw); } catch { return null; }
}

async function writeSerializedJSON(domain, serialized) {
  const bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes <= MAX_DIRECT_JSON_BYTES) {
    return command(["SET", contentKey(domain), serialized]);
  }

  const source = Buffer.from(serialized, "utf8");
  const chunks = [];
  for (let offset = 0; offset < source.length; offset += JSON_CHUNK_RAW_BYTES) {
    chunks.push(source.subarray(offset, Math.min(source.length, offset + JSON_CHUNK_RAW_BYTES)));
  }

  for (let i = 0; i < chunks.length; i += 1) {
    const encoded = chunks[i].toString("base64");
    await command(["SET", chunkKey(domain, i), encoded]);
  }

  const manifest = JSON.stringify({
    [CHUNK_MARKER]: 1,
    encoding: "base64",
    chunks: chunks.length,
    bytes: source.length
  });
  return command(["SET", contentKey(domain), manifest]);
}

async function getJSON(domain) {
  const raw = await command(["GET", contentKey(domain)]);
  return decodeStoredJSON(domain, raw);
}

async function setJSON(domain, data) {
  return writeSerializedJSON(domain, jsonText(data));
}

async function mgetJSON(domains) {
  const list = Array.isArray(domains) ? domains : [];
  const raw = list.length ? await command(["MGET", ...list.map(contentKey)]) : [];
  return Promise.all(list.map((domain, i) => decodeStoredJSON(domain, raw?.[i] || null)));
}

async function sendPipelineChunk(commands) {
  const { url, token } = config();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const payload = JSON.stringify(commands);
    let response;
    try {
      response = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal
      });
    } catch (cause) {
      const error = new Error("JCV3_STORAGE_NETWORK_ERROR");
      error.code = "STORAGE_NETWORK"; error.cause = cause; throw error;
    }
    const body = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(body)) {
      const error = new Error(`REDIS_${response.status}`);
      error.code = "STORAGE_REQUEST";
      error.storageCommand = "PIPELINE";
      error.requestBytes = requestBytes(payload);
      throw error;
    }
    const failed = body.find(x => x && x.error);
    if (failed) {
      const error = new Error(failed.error);
      error.code = "STORAGE_REQUEST";
      error.storageCommand = "PIPELINE";
      error.requestBytes = requestBytes(payload);
      throw error;
    }
    return body.map(x => x?.result);
  } finally { clearTimeout(timer); }
}

async function pipeline(commands) {
  const list = Array.isArray(commands) ? commands : [];
  if (!list.length) return [];
  const output = [];
  let chunk = [];
  for (const cmd of list) {
    const candidate = [...chunk, cmd];
    if (requestBytes(candidate) > MAX_REQUEST_BYTES) {
      if (chunk.length) {
        output.push(...await sendPipelineChunk(chunk));
        chunk = [];
      }
      if (requestBytes([cmd]) > MAX_REQUEST_BYTES) {
        const error = new Error(`JCV3_STORAGE_SINGLE_PIPELINE_COMMAND_TOO_LARGE:${String(cmd?.[0] || "UNKNOWN")}`);
        error.code = "STORAGE_REQUEST";
        error.requestBytes = requestBytes([cmd]);
        throw error;
      }
    }
    chunk.push(cmd);
  }
  if (chunk.length) output.push(...await sendPipelineChunk(chunk));
  return output;
}

async function mgetRawJSON(keys) {
  const raw = keys.length ? await command(["MGET", ...keys]) : [];
  return keys.map((key, i) => { try { return raw?.[i] ? JSON.parse(raw[i]) : null; } catch { return null; } });
}

async function scanDomains(pattern = "*", options = {}) {
  if (typeof options === "number") options = { count: options };
  if (pattern && typeof pattern === "object" && !Array.isArray(pattern)) {
    options = pattern;
    pattern = options.pattern || options.match || "*";
  }
  const count = Math.max(1, Math.min(1000, Number(options?.count) || 500));
  const maxIterations = Math.max(1, Math.min(10000, Number(options?.maxIterations) || 10000));
  const prefix = contentKey("");
  const rawPattern = String(pattern || "*");
  const match = rawPattern.startsWith(prefix) ? rawPattern : `${prefix}${rawPattern}`;
  const found = [];
  let cursor = "0";
  let guard = 0;
  do {
    const result = await command(["SCAN", cursor, "MATCH", match, "COUNT", String(count)]);
    cursor = String(result?.[0] ?? "0");
    const keys = Array.isArray(result?.[1]) ? result[1] : [];
    for (const key of keys) {
      const raw = String(key || "");
      if (raw.startsWith(prefix)) found.push(raw.slice(prefix.length));
    }
    guard += 1;
    if (guard >= maxIterations && cursor !== "0") {
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

async function flushMset(args) {
  if (args.length <= 1) return;
  await command(args);
}

async function msetJSON(entries) {
  const items = (Array.isArray(entries) ? entries : []).filter(entry => Array.isArray(entry) && entry.length >= 2);
  if (!items.length) return null;

  let args = ["MSET"];
  for (const [domain, data] of items) {
    const serialized = jsonText(data);
    if (Buffer.byteLength(serialized, "utf8") > MAX_DIRECT_JSON_BYTES) {
      await flushMset(args);
      args = ["MSET"];
      await writeSerializedJSON(domain, serialized);
      continue;
    }

    const pair = [contentKey(domain), serialized];
    const candidate = [...args, ...pair];
    if (args.length > 1 && requestBytes(candidate) > MAX_REQUEST_BYTES) {
      await flushMset(args);
      args = ["MSET", ...pair];
    } else {
      args = candidate;
    }
  }
  await flushMset(args);
  return "OK";
}

module.exports = {
  config, command, pipeline, health, getJSON, setJSON, mgetJSON, mgetRawJSON, msetJSON, scanDomains, deleteDomains,
  MAX_REQUEST_BYTES, MAX_DIRECT_JSON_BYTES, JSON_CHUNK_RAW_BYTES, CHUNK_MARKER
};
