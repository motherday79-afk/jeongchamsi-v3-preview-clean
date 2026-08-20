const { getJSON, setJSON } = require("../../lib/v3/redis");
const { validDomain, defaultDomain, sanitize } = require("../../lib/v3/schema");
const { isAdminRequest } = require("../../lib/v3/auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "GET") {
    const domain = String(req.query?.domain || "");
    if (!validDomain(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
    try {
      const data = await getJSON(domain);
      res.setHeader("Cache-Control", "public, max-age=0, s-maxage=15, stale-while-revalidate=45");
      return res.status(200).json({ ok: true, domain, storage: "redis", data: data || defaultDomain(domain) });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(200).json({ ok: true, domain, storage: "browser-preview", data: defaultDomain(domain) });
      return res.status(503).json({ ok: false, error: "JCV3_STORAGE_UNAVAILABLE", data: defaultDomain(domain) });
    }
  }

  if (req.method === "POST") {
    if (!(await isAdminRequest(req))) return res.status(401).json({ ok: false, error: "ADMIN_LOGIN_REQUIRED" });
    const domain = String(req.body?.domain || "");
    if (!validDomain(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
    try {
      const data = sanitize(domain, req.body?.data);
      await setJSON(domain, data);
      return res.status(200).json({ ok: true, domain, storage: "redis", savedAt: new Date().toISOString() });
    } catch (error) {
      if (error?.code === "PAYLOAD_TOO_LARGE") return res.status(413).json({ ok: false, error: "PAYLOAD_TOO_LARGE" });
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "SAVE_FAILED" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
};
