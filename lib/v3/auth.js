const crypto = require("crypto");

const COOKIE = "jcv3_admin";
const DEFAULT_ID = "admin";
const DEFAULT_PASSWORD = "jcv3-2026!";
const DEFAULT_SECRET = "jcv3-preview-session-secret-change-before-production-2026";

function credentials() {
  return {
    id: String(process.env.JCV3_ADMIN_ID || DEFAULT_ID),
    password: String(process.env.JCV3_ADMIN_PASSWORD || DEFAULT_PASSWORD),
    secret: String(process.env.JCV3_ADMIN_SESSION_SECRET || DEFAULT_SECRET)
  };
}

function b64url(input) { return Buffer.from(input).toString("base64url"); }
function sign(value, secret) { return crypto.createHmac("sha256", secret).update(value).digest("base64url"); }

function issueSession(id) {
  const { secret } = credentials();
  const payload = b64url(JSON.stringify({ id, exp: Date.now() + 8 * 60 * 60 * 1000 }));
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const { secret } = credentials();
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
function isAdmin(req) { return !!sessionFromRequest(req); }
function checkCredentials(id, password) {
  const c = credentials();
  return String(id || "") === c.id && String(password || "") === c.password;
}

function setSessionCookie(res, token, req) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800${secure}`);
}

function clearSessionCookie(res, req) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

module.exports = { credentials, issueSession, sessionFromRequest, isAdmin, checkCredentials, setSessionCookie, clearSessionCookie };
