const { requireAdmin } = require("../../../../lib/v3/access");
const { listUsers, updateUserAccess } = require("../../../../lib/v3/users");
const { getActivity, setActivity } = require("../../../../lib/v3/activity");
const { VALID_BADGE_KEYS, loadBadgeStatus } = require("../../../../lib/v3/badge-engine");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(401).json({ ok: false, error: "ADMIN_LOGIN_REQUIRED" });

    if (req.method === "GET") {
      const users = await listUsers();
      const enriched = await Promise.all(users.map(async user => {
        const activity = await getActivity(user.id);
        return { ...user, grantedBadges: activity.grantedBadges || [], representativeBadge: activity.representativeBadge || "", showcaseBadges: activity.showcaseBadges || [] };
      }));
      return res.status(200).json({ ok: true, users: enriched });
    }
    if (req.method === "PATCH") {
      const result = await updateUserAccess(req.body?.id, {
        role: req.body?.role,
        status: req.body?.status,
        suspendDays: req.body?.suspendDays,
        suspensionReason: req.body?.suspensionReason,
        nickname: req.body?.nickname,
        name: req.body?.name,
        region: req.body?.region,
        preferredParty: req.body?.preferredParty,
        email: req.body?.email,
        phone: req.body?.phone,
        birthYear: req.body?.birthYear,
        password: req.body?.password
      });
      if (!result.ok) return res.status(result.error === "USER_NOT_FOUND" ? 404 : 409).json(result);
      let activity = await getActivity(req.body?.id);
      if (Array.isArray(req.body?.grantedBadges)) {
        activity.grantedBadges = req.body.grantedBadges.map(String).filter(x => VALID_BADGE_KEYS.has(x) && x !== "operator").filter((x,i,a)=>a.indexOf(x)===i);

      }
      if (result.user?.role === "partner" && !activity.grantedBadges.includes("jungchamsi-partner")) activity.grantedBadges.push("jungchamsi-partner");
      if (result.user?.role !== "partner" && result.user?.role !== "admin") {
        activity.grantedBadges = activity.grantedBadges.filter(x => x !== "jungchamsi-partner");
        if (activity.representativeBadge === "jungchamsi-partner") activity.representativeBadge = "";
        activity.showcaseBadges = (activity.showcaseBadges || []).filter(x => x !== "jungchamsi-partner");
      }
      if (typeof req.body?.representativeBadge === "string" && (!req.body.representativeBadge || VALID_BADGE_KEYS.has(req.body.representativeBadge))) { activity.representativeBadge = req.body.representativeBadge; activity.showcaseBadges = (activity.showcaseBadges || []).filter(x => x !== activity.representativeBadge).slice(0,3); }
      if (result.user?.role !== "admin") {
        const status = await loadBadgeStatus(result.user, activity);
        const earned = new Set(status.earnedBadges || []);
        if (activity.representativeBadge && !earned.has(activity.representativeBadge)) activity.representativeBadge = "";
        activity.showcaseBadges = (activity.showcaseBadges || []).filter(x => earned.has(x) && x !== activity.representativeBadge).slice(0,3);
      }
      activity = await setActivity(req.body?.id, activity);
      return res.status(200).json({ ...result, activity });
    }
    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "MEMBER_ADMIN_FAILED" });
  }
};
