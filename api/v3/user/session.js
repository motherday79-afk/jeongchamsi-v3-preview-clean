const {
  config,
  issueSession,
  sessionFromRequest,
  checkCredentials,
  setCookie,
  clearCookie
} = require("../../../lib/v3/user-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const session = sessionFromRequest(req);
    return res.status(200).json({ authenticated: !!session, user: session ? { id: session.id, nickname: "정참시 유저" } : null });
  }

  if (req.method === "POST") {
    const id = String(req.body?.id || "");
    const password = String(req.body?.password || "");
    if (!checkCredentials(id, password)) return res.status(401).json({ authenticated: false, error: "INVALID_CREDENTIALS" });
    setCookie(res, issueSession(id), req);
    return res.status(200).json({ authenticated: true, user: { id, nickname: "정참시 유저" } });
  }

  if (req.method === "DELETE") {
    clearCookie(res, req);
    return res.status(200).json({ authenticated: false });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ authenticated: false, error: "METHOD_NOT_ALLOWED" });
};
