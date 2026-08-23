const { command } = require("./redis");

function key(userId) { return `jcv3:useractivity:v1:${String(userId || "").slice(0, 24)}`; }

function emptyActivity() {
  return {
    favorites: [],
    recentPeople: [],
    likedPosts: [],
    pollVotes: {},
    generationVotes: {},
    nationalEvaluationVotes: {},
    academyApplications: [],
    grantedBadges: [],
    representativeBadge: "",
    showcaseBadges: [],
    badgeSignals: { events: [] },
    badgeRecognition: { initialized:false, knownBadgeKeys:[], updatedAt:"" },
    updatedAt: null
  };
}

function recordBadgeEvent(activity, type, at = new Date().toISOString()) {
  const current = { ...emptyActivity(), ...(activity || {}) };
  const event = { type: String(type || "activity").slice(0, 40), at: String(at || new Date().toISOString()).slice(0, 40) };
  const existing = Array.isArray(current.badgeSignals?.events) ? current.badgeSignals.events : [];
  const cutoff = Date.now() - 180 * 86400000;
  const events = [...existing, event]
    .filter(x => x && Date.parse(x.at || 0) >= cutoff)
    .slice(-360);
  current.badgeSignals = { ...(current.badgeSignals || {}), events };
  return current;
}

async function getActivity(userId) {
  const raw = await command(["GET", key(userId)]);
  if (!raw) return emptyActivity();
  try { return { ...emptyActivity(), ...(JSON.parse(raw) || {}) }; }
  catch { return emptyActivity(); }
}

async function getActivities(userIds = []) {
  const ids = [...new Set((Array.isArray(userIds) ? userIds : []).map(x => String(x || "").slice(0, 24)).filter(Boolean))];
  if (!ids.length) return {};
  const raw = await command(["MGET", ...ids.map(key)]);
  return Object.fromEntries(ids.map((id, i) => {
    try { return [id, { ...emptyActivity(), ...(raw?.[i] ? JSON.parse(raw[i]) : {}) }]; }
    catch { return [id, emptyActivity()]; }
  }));
}

async function setActivity(userId, activity) {
  const data = { ...emptyActivity(), ...(activity || {}), updatedAt: new Date().toISOString() };
  await command(["SET", key(userId), JSON.stringify(data)]);
  return data;
}

module.exports = { emptyActivity, getActivity, getActivities, setActivity, recordBadgeEvent };
