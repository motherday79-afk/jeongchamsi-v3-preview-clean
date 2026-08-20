const { currentUser } = require("../../../../lib/v3/access");
const { getActivity } = require("../../../../lib/v3/activity");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    return res.status(200).json({ ok: true, activity: await getActivity(user.id) });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "ACTIVITY_READ_FAILED" });
  }
};
