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
    badgeEvents: {},
    updatedAt: null
  };
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

function recordBadgeEvent(activity, eventName) {
  const data = { ...emptyActivity(), ...(activity || {}) };
  const key = String(eventName || '').trim();
  if (!key) return data;
  const events = data.badgeEvents && typeof data.badgeEvents === 'object' ? { ...data.badgeEvents } : {};
  events[key] = Math.max(0, Number(events[key] || 0)) + 1;
  data.badgeEvents = events;
  const granted = new Set((data.grantedBadges || []).map(String));
  if (['comment','poll-vote','generation-vote','national-evaluation','academy-apply','post-save'].includes(key)) granted.add('first-participation');
  if (key === 'poll-vote') granted.add('citizen-choice');
  data.grantedBadges = [...granted];
  return data;
}

async function setActivity(userId, activity) {
  const data = { ...emptyActivity(), ...(activity || {}), updatedAt: new Date().toISOString() };
  await command(["SET", key(userId), JSON.stringify(data)]);
  return data;
}

module.exports = { emptyActivity, getActivity, getActivities, setActivity, recordBadgeEvent };
