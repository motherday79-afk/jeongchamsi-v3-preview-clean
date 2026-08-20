const { health } = require("../../../lib/v3/redis");
const { sessionSecret } = require("../../../lib/v3/user-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const storage = await health();
    sessionSecret();
    return res.status(200).json({
      ok: true,
      storage: "ready",
      storageSource: storage.source,
      session: "ready"
    });
  } catch (error) {
    const status =
      error?.code === "STORAGE_MISSING" || error?.code === "SESSION_SECRET_MISSING"
        ? 503
        : 500;
    return res.status(status).json({
      ok: false,
      error: error?.code || "HEALTH_FAILED"
    });
  }
};
