const { put } = require("@vercel/blob");
const { currentUser } = require("../../../lib/v3/access");
const { blobToken, blobConfigured } = require("../../../lib/v3/blob");

function safePrefix(v) {
  return String(v || "content").toLowerCase().replace(/[^a-z0-9/_-]+/g, "-").replace(/^\/+|\/+$/g, "").slice(0, 80) || "content";
}
function decodeDataUrl(value) {
  const match = String(value || "").match(/^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 900 * 1024) return null;
  return { contentType: match[1], buffer };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") return res.status(200).json({ ok: true, configured: blobConfigured() });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const user = await currentUser(req);
    if (!user) return res.status(403).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    const requestedPrefix = safePrefix(req.body?.prefix);
    const canUpload = user.role === "admin" || (user.role === "partner" && requestedPrefix === "content-cover");
    if (!canUpload) return res.status(403).json({ ok: false, error: "UPLOAD_PERMISSION_REQUIRED" });
    const token = blobToken();
    if (!token) return res.status(503).json({ ok: false, error: "BLOB_STORAGE_NOT_CONFIGURED" });

    const image = decodeDataUrl(req.body?.dataUrl);
    if (!image) return res.status(400).json({ ok: false, error: "INVALID_IMAGE_PAYLOAD" });
    const ext = image.contentType === "image/webp" ? "webp" : image.contentType === "image/png" ? "png" : "jpg";
    const prefix = requestedPrefix;
    const path = `jcv3/${prefix}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await put(path, image.buffer, {
      access: "public",
      contentType: image.contentType,
      addRandomSuffix: true,
      token
    });
    return res.status(201).json({ ok: true, url: blob.url, pathname: blob.pathname });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || "IMAGE_UPLOAD_FAILED" });
  }
};
