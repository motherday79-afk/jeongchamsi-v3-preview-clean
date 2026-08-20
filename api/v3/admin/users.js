const { adminIdentity } = require("../../../lib/v3/auth");
const { listUsers, updateUserAccess } = require("../../../lib/v3/users");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  const identity = await adminIdentity(req);
  if (!identity.authenticated) return res.status(401).json({ ok: false, error: "ADMIN_LOGIN_REQUIRED" });

  if (req.method === "GET") {
    try {
      return res.status(200).json({ ok: true, users: await listUsers() });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "USER_LIST_FAILED" });
    }
  }

  if (req.method === "PATCH") {
    const id = String(req.body?.id || "");
    const patch = { role: req.body?.role, status: req.body?.status };
    if (!identity.root && identity.id === id && patch.role === "member") {
      return res.status(400).json({ ok: false, error: "SELF_DEMOTION_BLOCKED" });
    }
    try {
      const result = await updateUserAccess(id, patch);
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json(result);
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "USER_UPDATE_FAILED" });
    }
  }

  res.setHeader("Allow", "GET, PATCH");
  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
};
