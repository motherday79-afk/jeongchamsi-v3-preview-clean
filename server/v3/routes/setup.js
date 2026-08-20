const crypto = require("crypto");
const { hasActiveAdmin, createFirstAdmin } = require("../../../lib/v3/users");
const { issueSession, setCookie } = require("../../../lib/v3/user-auth");

function setupKey() { return String(process.env.JCV3_ADMIN_SETUP_KEY || "").trim(); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && aa.length > 0 && crypto.timingSafeEqual(aa, bb);
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    const needed = !(await hasActiveAdmin());
    const configured = !!setupKey();

    if (req.method === "GET") {
      return res.status(200).json({ ok: true, needed, setupKeyConfigured: configured });
    }

    if (req.method === "POST") {
      if (!needed) return res.status(409).json({ ok: false, error: "ADMIN_ALREADY_EXISTS" });
      if (!configured) return res.status(503).json({ ok: false, error: "ADMIN_SETUP_KEY_NOT_CONFIGURED" });
      if (!safeEqual(req.body?.setupKey, setupKey())) return res.status(403).json({ ok: false, error: "INVALID_ADMIN_SETUP_KEY" });

      const result = await createFirstAdmin(req.body || {});
      if (!result.ok) return res.status(result.error === "ADMIN_ALREADY_EXISTS" ? 409 : 400).json(result);
      setCookie(res, issueSession(result.user.id), req);
      return res.status(201).json({ ok: true, user: result.user });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "SETUP_FAILED" });
  }
};
