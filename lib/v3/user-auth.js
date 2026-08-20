const crypto = require("crypto");

const COOKIE = "jcv3_user";
const DEFAULT_ID = "user";
const DEFAULT_PASSWORD = "jcv3-user!";
const DEFAULT_SECRET = "jcv3-preview-user-session-secret-change-before-production-2026";

function config() {
  return {
    id: String(process.env.JCV3_DEMO_USER_ID || DEFAULT_ID),
    password: String(process.env.JCV3_DEMO_USER_PASSWORD || DEFAULT_PASSWORD),
    secret: String(process.env.JCV3_USER_SESSION_SECRET || DEFAULT_SECRET)
  };
}

function b64url(input) { return Buffer.from(input).toString("base64url"); }
function sign(value, secret) { return crypto.createHmac("sha256", secret).update(value).digest("base64url"); }

function issueSession(id) {
  const { secret } = config();
  const payload = b64url(JSON.stringify({ id, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;
  const { secret } = config();
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

function setCookie(res, token, req) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
}

function clearCookie(res, req) {
  const secure = String(req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

function sessionFromRequest(req) { return verifySession(parseCookies(req)[COOKIE]); }
function checkCredentials(id, password) {
  const c = config();
  return String(id || "") === c.id && String(password || "") === c.password;
}

module.exports = { config, issueSession, sessionFromRequest, checkCredentials, setCookie, clearCookie };
