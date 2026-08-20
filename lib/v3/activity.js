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
    updatedAt: null
  };
}

async function getActivity(userId) {
  const raw = await command(["GET", key(userId)]);
  if (!raw) return emptyActivity();
  try { return { ...emptyActivity(), ...(JSON.parse(raw) || {}) }; }
  catch { return emptyActivity(); }
}

async function setActivity(userId, activity) {
  const data = { ...emptyActivity(), ...(activity || {}), updatedAt: new Date().toISOString() };
  await command(["SET", key(userId), JSON.stringify(data)]);
  return data;
}

module.exports = { emptyActivity, getActivity, setActivity };
