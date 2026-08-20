const { issueSession, sessionFromRequest, checkCredentials, setSessionCookie, clearSessionCookie } = require("../../../lib/v3/auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const session = sessionFromRequest(req);
    return res.status(200).json({ authenticated: !!session, user: session ? { id: session.id } : null });
  }

  if (req.method === "POST") {
    if (!checkCredentials(req.body?.id, req.body?.password)) return res.status(401).json({ authenticated: false, error: "INVALID_CREDENTIALS" });
    const token = issueSession(String(req.body.id));
    setSessionCookie(res, token, req);
    return res.status(200).json({ authenticated: true, user: { id: String(req.body.id) } });
  }

  if (req.method === "DELETE") {
    clearSessionCookie(res, req);
    return res.status(200).json({ authenticated: false });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
};
