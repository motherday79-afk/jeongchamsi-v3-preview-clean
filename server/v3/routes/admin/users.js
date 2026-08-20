const { requireAdmin } = require("../../../../lib/v3/access");
const { listUsers, updateUserAccess } = require("../../../../lib/v3/users");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(401).json({ ok: false, error: "ADMIN_LOGIN_REQUIRED" });

    if (req.method === "GET") return res.status(200).json({ ok: true, users: await listUsers() });
    if (req.method === "PATCH") {
      const result = await updateUserAccess(req.body?.id, { role: req.body?.role, status: req.body?.status });
      if (!result.ok) return res.status(result.error === "USER_NOT_FOUND" ? 404 : 409).json(result);
      return res.status(200).json(result);
    }
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "MEMBER_ADMIN_FAILED" });
  }
};
