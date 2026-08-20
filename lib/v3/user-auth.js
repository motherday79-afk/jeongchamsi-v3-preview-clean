const crypto = require("crypto");
const { config: redisConfig } = require("./redis");

const COOKIE = "jcv3_session";

function sessionSecret() {
  const explicit = String(process.env.JCV3_SESSION_SECRET || "").trim();
  if (explicit) return explicit;
  try { return redisConfig().token; } catch {}
  const error = new Error("JCV3_SESSION_SECRET_NOT_CONFIGURED");
  error.code = "SESSION_SECRET_MISSING";
  throw error;
}

function b64url(input) { return Buffer.from(input).toString("base64url"); }
function sign(value, secret) { return crypto.createHmac("sha256", secret).update(value).digest("base64url"); }

function issueSession(id) {
  const secret = sessionSecret();
  const payload = b64url(JSON.stringify({ id: String(id || ""), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  let secret;
  try { secret = sessionSecret(); } catch { return null; }
  const [payload, signature] = token.split(".");
  const expected = sign(payload, secret);
  const a = Buffer.from(signature || "");
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data?.id || Number(data.exp || 0) < Date.now()) return null;
    return data;
  } catch { return null; }
}

function parseCookies(req) {
  const raw = String(req.headers.cookie || "");
  return Object.fromEntries(raw.split(";").map(x => x.trim()).filter(Boolean).map(pair => {
    const i = pair.indexOf("=");
    return i < 0 ? [pair, ""] : [pair.slice(0, i), decodeURIComponent(pair.slice(i + 1))];
  }));
}

function sessionFromRequest(req) { return verifySession(parseCookies(req)[COOKIE]); }

function setCookie(res, token, req) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
}

function clearCookie(res, req) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

module.exports = { issueSession, sessionFromRequest, setCookie, clearCookie, sessionSecret };
