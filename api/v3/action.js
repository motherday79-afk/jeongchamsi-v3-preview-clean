const { getJSON, setJSON } = require("../../lib/v3/redis");
const { defaultDomain, sanitize } = require("../../lib/v3/schema");
const { sessionFromRequest } = require("../../lib/v3/user-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const action = String(req.body?.action || "");
  const payload = req.body?.payload || {};

  if (action === "poll-vote") {
    try {
      const current = (await getJSON("polls")) || defaultDomain("polls");
      const poll = (current.items || []).find(x => String(x.id) === String(payload.pollId));
      const option = poll?.options?.find(x => String(x.id) === String(payload.optionId));
      if (!poll || !option || poll.published === false) return res.status(404).json({ ok: false, error: "POLL_NOT_FOUND" });
      option.votes = Number(option.votes || 0) + 1;
      const data = sanitize("polls", current);
      await setJSON("polls", data);
      return res.status(200).json({ ok: true, domain: "polls", storage: "redis", data });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "ACTION_FAILED" });
    }
  }

  if (action === "post-like") {
    const user = sessionFromRequest(req);
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    const domain = String(payload.domain || "");
    if (!["columns", "community", "news"].includes(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
    try {
      const current = (await getJSON(domain)) || defaultDomain(domain);
      const post = (current.items || []).find(x => String(x.id) === String(payload.postId));
      if (!post || post.published === false) return res.status(404).json({ ok: false, error: "POST_NOT_FOUND" });
      const delta = Number(payload.delta || 0) > 0 ? 1 : -1;
      post.likes = Math.max(0, Number(post.likes || 0) + delta);
      const data = sanitize(domain, current);
      await setJSON(domain, data);
      return res.status(200).json({ ok: true, domain, storage: "redis", data });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "ACTION_FAILED" });
    }
  }

  if (action === "comment-add") {
    const user = sessionFromRequest(req);
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    const domain = String(payload.domain || "");
    const postId = String(payload.postId || "");
    const author = String(payload.author || "정참시 유저").trim().slice(0, 40);
    const text = String(payload.text || "").trim().slice(0, 1000);
    if (!["columns", "community", "news"].includes(domain) || !postId || !text) return res.status(400).json({ ok: false, error: "INVALID_COMMENT" });
    try {
      const current = (await getJSON("comments")) || defaultDomain("comments");
      current.items = [{
        id: `comment-${Date.now().toString(36)}`,
        domain,
        postId,
        author: author || "정참시 유저",
        text,
        createdAt: new Date().toISOString(),
        published: true
      }, ...(current.items || [])].slice(0, 2000);
      const data = sanitize("comments", current);
      await setJSON("comments", data);
      return res.status(200).json({ ok: true, domain: "comments", storage: "redis", data });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "ACTION_FAILED" });
    }
  }

  return res.status(400).json({ ok: false, error: "UNKNOWN_ACTION" });
};
