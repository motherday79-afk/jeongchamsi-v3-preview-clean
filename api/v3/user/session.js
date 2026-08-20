const {
  config,
  issueSession,
  sessionFromRequest,
  checkCredentials,
  setCookie,
  clearCookie
} = require("../../../lib/v3/user-auth");
const { getUser, authenticateUser } = require("../../../lib/v3/users");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const session = sessionFromRequest(req);
    if (!session?.id) return res.status(200).json({ authenticated: false, user: null });
    try {
      const stored = await getUser(session.id);
      if (stored) {
        if (stored.status !== "active") {
          clearCookie(res, req);
          return res.status(200).json({ authenticated: false, user: null, error: "ACCOUNT_SUSPENDED" });
        }
        const { passwordHash: _passwordHash, ...profile } = stored;
        return res.status(200).json({ authenticated: true, user: profile });
      }
    } catch {}

    const demo = config();
    if (session.id === demo.id) {
      return res.status(200).json({ authenticated: true, user: { id: demo.id, nickname: "정참시 유저", role: "member", status: "active" } });
    }
    return res.status(200).json({ authenticated: false, user: null });
  }

  if (req.method === "POST") {
    const id = String(req.body?.id || "").trim();
    const password = String(req.body?.password || "");

    try {
      const user = await authenticateUser(id, password);
      if (user) {
        setCookie(res, issueSession(user.id), req);
        return res.status(200).json({ authenticated: true, user });
      }
    } catch {}

    if (!checkCredentials(id, password)) return res.status(401).json({ authenticated: false, error: "INVALID_CREDENTIALS" });
    setCookie(res, issueSession(id), req);
    return res.status(200).json({ authenticated: true, user: { id, nickname: "정참시 유저", role: "member", status: "active" } });
  }

  if (req.method === "DELETE") {
    clearCookie(res, req);
    return res.status(200).json({ authenticated: false });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ authenticated: false, error: "METHOD_NOT_ALLOWED" });
};
