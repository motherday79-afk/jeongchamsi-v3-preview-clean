const { authenticateUser, getUser } = require("../../../../lib/v3/users");
const { issueSession, sessionFromRequest, setCookie, clearCookie } = require("../../../../lib/v3/user-auth");
const { getActivity, emptyActivity, setActivity, recordBadgeEvent } = require("../../../../lib/v3/activity");

async function readActivitySafe(userId) {
  try { return await getActivity(userId); }
  catch { return emptyActivity(); }
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    try {
      const session = sessionFromRequest(req);
      if (!session?.id) return res.status(200).json({ ok: true, authenticated: false });
      const [user, activity] = await Promise.all([getUser(session.id), readActivitySafe(session.id)]);
      if (!user || user.status !== "active") {
        clearCookie(res, req);
        return res.status(200).json({ ok: true, authenticated: false });
      }
      const { passwordHash, ...safe } = user;
      return res.status(200).json({ ok: true, authenticated: true, user: safe, activity });
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
      const stored = await getUser(req.body?.id);
      if (stored?.status === "suspended") {
        const until = Date.parse(stored.suspendedUntil || "");
        if (!Number.isFinite(until) || until > Date.now()) {
          return res.status(403).json({ ok:false, error:"ACCOUNT_SUSPENDED", suspendedUntil:stored.suspendedUntil || "", reason:stored.suspensionReason || "" });
        }
      }
      const user = await authenticateUser(req.body?.id, req.body?.password, stored);
      if (!user) return res.status(401).json({ ok: false, error: "INVALID_CREDENTIALS" });
      setCookie(res, issueSession(user.id), req);
      let activity = await readActivitySafe(user.id);
      activity = recordBadgeEvent(activity, "login");
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, authenticated: true, user, activity });
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
