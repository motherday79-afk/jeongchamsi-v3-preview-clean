const { authenticateUser, getUser } = require("../../../../lib/v3/users");
const { issueSession, sessionFromRequest, setCookie, clearCookie } = require("../../../../lib/v3/user-auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try {
      const session = sessionFromRequest(req);
      if (!session?.id) return res.status(200).json({ ok: true, authenticated: false });
      const user = await getUser(session.id);
      if (!user || user.status !== "active") {
        clearCookie(res, req);
        return res.status(200).json({ ok: true, authenticated: false });
      }
      const { passwordHash, ...safe } = user;
      return res.status(200).json({ ok: true, authenticated: true, user: safe });
    } catch (error) {
      {
      const code = error?.code || "SESSION_READ_FAILED";
      const status = ["STORAGE_MISSING","SESSION_SECRET_MISSING"].includes(code) ? 503 : 500;
      return res.status(status).json({ ok: false, error: code });
    }
    }
  }

  if (req.method === "POST") {
    try {
      const user = await authenticateUser(req.body?.id, req.body?.password);
      if (!user) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
      setCookie(res, issueSession(user.id), req);
      return res.status(200).json({ ok: true, authenticated: true, user });
    } catch (error) {
      {
      const code = error?.code || "LOGIN_FAILED";
      const status = ["STORAGE_MISSING","SESSION_SECRET_MISSING"].includes(code) ? 503 : 500;
      return res.status(status).json({ ok: false, error: code });
    }
    }
  }

  if (req.method === "DELETE") {
    clearCookie(res, req);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
};
