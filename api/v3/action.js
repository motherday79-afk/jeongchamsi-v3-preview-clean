const { getJSON, setJSON, command } = require("../../lib/v3/redis");
const { defaultDomain, sanitize } = require("../../lib/v3/schema");
const { sessionFromRequest } = require("../../lib/v3/user-auth");
const { getUser } = require("../../lib/v3/users");

async function currentUser(req) {
  const session = sessionFromRequest(req);
  if (!session?.id) return null;
  try {
    const stored = await getUser(session.id);
    if (stored?.status === "active") return stored;
  } catch {}
  return { id: session.id, nickname: session.id, role: "member", status: "active" };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const action = String(req.body?.action || "");
  const payload = req.body?.payload || {};
  const user = await currentUser(req);

  if (action === "poll-vote") {
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    try {
      const voteKey = `jcv3:pollvote:v1:${String(payload.pollId || "").slice(0, 120)}:${user.id}`;
      const reserved = await command(["SET", voteKey, String(payload.optionId || ""), "NX", "EX", 31536000]);
      if (!reserved) return res.status(409).json({ ok: false, error: "ALREADY_VOTED" });

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
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    const domain = String(payload.domain || "");
    if (!["columns", "community", "news", "itsme"].includes(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
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
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    const domain = String(payload.domain || "");
    const postId = String(payload.postId || "");
    const text = String(payload.text || "").trim().slice(0, 1000);
    if (!["columns", "community", "news", "itsme"].includes(domain) || !postId || !text) return res.status(400).json({ ok: false, error: "INVALID_COMMENT" });
    try {
      const current = (await getJSON("comments")) || defaultDomain("comments");
      current.items = [{
        id: `comment-${Date.now().toString(36)}`,
        domain,
        postId,
        ownerId: user.id,
        author: String(user.nickname || user.id).slice(0, 40),
        text,
        createdAt: new Date().toISOString(),
        published: true
      }, ...(current.items || [])].slice(0, 3000);
      const data = sanitize("comments", current);
      await setJSON("comments", data);
      return res.status(200).json({ ok: true, domain: "comments", storage: "redis", data });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "ACTION_FAILED" });
    }
  }

  if (action === "user-post-save") {
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    const domain = String(payload.domain || "");
    if (!["community", "itsme"].includes(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
    const title = String(payload.title || "").trim().slice(0, 120);
    const body = String(payload.body || "").trim().slice(0, 50000);
    if (!title || !body) return res.status(400).json({ ok: false, error: "TITLE_BODY_REQUIRED" });

    try {
      const current = (await getJSON(domain)) || defaultDomain(domain);
      const items = current.items || [];
      const requestedId = String(payload.id || "");
      const old = requestedId ? items.find(x => String(x.id) === requestedId) : null;
      if (old && String(old.ownerId || "") !== user.id) return res.status(403).json({ ok: false, error: "NOT_OWNER" });
      const id = old?.id || `${domain}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const next = {
        id,
        title,
        summary: String(payload.summary || "").trim().slice(0, 240),
        category: String(payload.category || "").trim().slice(0, 60),
        author: String(user.nickname || user.id).slice(0, 40),
        ownerId: user.id,
        body,
        coverImage: "",
        featured: false,
        published: true,
        createdAt: old?.createdAt || now,
        updatedAt: now,
        likes: Number(old?.likes || 0),
        views: Number(old?.views || 0)
      };
      current.items = old ? items.map(x => String(x.id) === id ? next : x) : [next, ...items];
      const data = sanitize(domain, current);
      await setJSON(domain, data);
      return res.status(200).json({ ok: true, domain, item: next, storage: "redis", data });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "ACTION_FAILED" });
    }
  }

  if (action === "user-post-delete") {
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    const domain = String(payload.domain || "");
    const id = String(payload.id || "");
    if (!["community", "itsme"].includes(domain) || !id) return res.status(400).json({ ok: false, error: "INVALID_REQUEST" });
    try {
      const current = (await getJSON(domain)) || defaultDomain(domain);
      const old = (current.items || []).find(x => String(x.id) === id);
      if (!old) return res.status(404).json({ ok: false, error: "POST_NOT_FOUND" });
      if (String(old.ownerId || "") !== user.id) return res.status(403).json({ ok: false, error: "NOT_OWNER" });
      current.items = (current.items || []).filter(x => String(x.id) !== id);
      const data = sanitize(domain, current);
      await setJSON(domain, data);
      return res.status(200).json({ ok: true, domain, storage: "redis", data });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "ACTION_FAILED" });
    }
  }

  return res.status(400).json({ ok: false, error: "UNKNOWN_ACTION" });
};
