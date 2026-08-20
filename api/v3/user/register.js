const { createUser } = require("../../../lib/v3/users");
const { issueSession, setCookie } = require("../../../lib/v3/user-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const result = await createUser(req.body || {}, "member");
    if (!result.ok) {
      const status = result.error === "DUPLICATE_ID" ? 409 : 400;
      return res.status(status).json(result);
    }
    setCookie(res, issueSession(result.user.id), req);
    return res.status(201).json({ ok: true, user: result.user });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "REGISTER_FAILED" });
  }
};
