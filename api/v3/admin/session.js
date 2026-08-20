const {
  issueSession,
  adminIdentity,
  checkCredentials,
  setSessionCookie,
  clearSessionCookie
} = require("../../../lib/v3/auth");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    const identity = await adminIdentity(req);
    return res.status(200).json({
      authenticated: !!identity.authenticated,
      user: identity.authenticated ? { id: identity.id, role: "admin", root: !!identity.root } : null
    });
  }

  if (req.method === "POST") {
    const id = String(req.body?.id || "");
    const password = String(req.body?.password || "");
    if (!checkCredentials(id, password)) return res.status(401).json({ authenticated: false, error: "INVALID_CREDENTIALS" });
    setSessionCookie(res, issueSession(id), req);
    return res.status(200).json({ authenticated: true, user: { id, role: "admin", root: true } });
  }

  if (req.method === "DELETE") {
    clearSessionCookie(res, req);
    return res.status(200).json({ authenticated: false });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ authenticated: false, error: "METHOD_NOT_ALLOWED" });
};
