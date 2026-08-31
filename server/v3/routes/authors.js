const { listUsers } = require("../../../lib/v3/users");
const { getActivities } = require("../../../lib/v3/activity");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok:false, error:"METHOD_NOT_ALLOWED" });
  }
  try {
    const ids = [...new Set(String(req.query?.ids || "").split(",").map(x => x.trim().slice(0,24)).filter(Boolean))].slice(0,120);
    if (!ids.length) return res.status(200).json({ ok:true, profiles:{} });
    const users = await listUsers();
    const wanted = users.filter(u => ids.includes(String(u.id)) && u.status === "active");
    const activities = await getActivities(wanted.map(u => u.id));
    const profiles = Object.fromEntries(wanted.map(u => [u.id, {
      id:u.id,
      nickname:String(u.nickname || u.id).slice(0,40),
      role:["admin","partner"].includes(u.role) ? u.role : "member",
      representativeBadge:String(activities[u.id]?.representativeBadge || "")
    }]));
    return res.status(200).json({ ok:true, profiles });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok:false, error:error?.code || "AUTHOR_PROFILE_FAILED", profiles:{} });
  }
};
