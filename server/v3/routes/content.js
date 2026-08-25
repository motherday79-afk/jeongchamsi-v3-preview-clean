const { getJSON, setJSON } = require("../../../lib/v3/redis");
const { validDomain, defaultDomain, sanitize } = require("../../../lib/v3/schema");
const { requireAdmin } = require("../../../lib/v3/access");
const { mergePoliticianPhotoAssets } = require("../lib/politician-photo-assets");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "GET") {
    const domain = String(req.query?.domain || "");
    if (!validDomain(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
    try {
      const stored = await getJSON(domain);
      const data = domain === "politicianPhotos" ? mergePoliticianPhotoAssets(stored) : (stored || defaultDomain(domain));
      res.setHeader("Cache-Control", "private, no-store, max-age=0");
      return res.status(200).json({ ok: true, domain, data });
    } catch (error) {
      return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "CONTENT_READ_FAILED", data: defaultDomain(domain) });
    }
  }

  if (req.method === "POST") {
    try {
      if (!(await requireAdmin(req))) return res.status(401).json({ ok: false, error: "ADMIN_LOGIN_REQUIRED" });
      const domain = String(req.body?.domain || "");
      if (!validDomain(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
      const data = sanitize(domain, req.body?.data);
      await setJSON(domain, data);
      const savedData = domain === "politicianPhotos" ? mergePoliticianPhotoAssets(data) : data;
      return res.status(200).json({ ok: true, domain, savedAt: new Date().toISOString(), data: savedData });
    } catch (error) {
      if (error?.code === "PAYLOAD_TOO_LARGE") return res.status(413).json({ ok: false, error: "PAYLOAD_TOO_LARGE" });
      return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "CONTENT_WRITE_FAILED" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
};
