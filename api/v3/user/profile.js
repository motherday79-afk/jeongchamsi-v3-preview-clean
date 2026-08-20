const { currentUser } = require("../../../lib/v3/access");
const { updateOwnProfile } = require("../../../lib/v3/users");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    if (req.method === "GET") return res.status(200).json({ ok: true, user });
    if (req.method !== "PATCH") { res.setHeader("Allow", "GET, PATCH"); return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" }); }
    const result = await updateOwnProfile(user.id, req.body || {});
    if (!result.ok) return res.status(400).json({ ok: false, error: result.error });
    return res.status(200).json({ ok: true, user: result.user });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "PROFILE_FAILED" });
  }
};
