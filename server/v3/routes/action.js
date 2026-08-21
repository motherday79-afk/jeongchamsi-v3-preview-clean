const { getJSON, setJSON, command } = require("../../../lib/v3/redis");
const { defaultDomain, sanitize } = require("../../../lib/v3/schema");
const { currentUser } = require("../../../lib/v3/access");
const { getActivity, setActivity } = require("../../../lib/v3/activity");

function toggle(list, value, max = 300) {
  const id = String(value || "");
  const exists = list.includes(id);
  return { active: !exists, list: exists ? list.filter(x => x !== id) : [id, ...list].slice(0, max) };
}

function generationAgeGroup(birthYear) {
  const year = Number(birthYear || 0);
  const current = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 1900 || year > current) return "";
  const age = current - year;
  if (age >= 10 && age < 20) return "10대";
  if (age >= 20 && age < 30) return "20대";
  if (age >= 30 && age < 40) return "30대";
  if (age >= 40 && age < 50) return "40대";
  if (age >= 50 && age < 60) return "50대";
  if (age >= 60) return "60대+";
  return "";
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const action = String(req.body?.action || "");
  const payload = req.body?.payload || {};

  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ ok: false, error: "USER_LOGIN_REQUIRED" });
    let activity = await getActivity(user.id);

    if (action === "favorite-toggle") {
      const t = toggle(activity.favorites || [], payload.personId, 100);
      activity.favorites = t.list;
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, active: t.active, activity });
    }

    if (action === "recent-record") {
      const id = String(payload.personId || "");
      if (id) activity.recentPeople = [id, ...(activity.recentPeople || []).filter(x => x !== id)].slice(0, 20);
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, activity });
    }

    if (action === "recent-merge") {
      const ids = Array.isArray(payload.personIds) ? payload.personIds.map(String).filter(Boolean).slice(0, 20) : [];
      activity.recentPeople = [...ids, ...(activity.recentPeople || [])].filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 20);
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, activity });
    }

    if (action === "post-like") {
      const domain = String(payload.domain || "");
      const postId = String(payload.postId || "");
      if (!["columns", "community", "news", "itsme"].includes(domain) || !postId) return res.status(400).json({ ok: false, error: "INVALID_POST" });
      const key = `${domain}:${postId}`;
      const t = toggle(activity.likedPosts || [], key, 300);
      const current = (await getJSON(domain)) || defaultDomain(domain);
      const post = (current.items || []).find(x => String(x.id) === postId);
      if (!post || post.published === false) return res.status(404).json({ ok: false, error: "POST_NOT_FOUND" });
      post.likes = Math.max(0, Number(post.likes || 0) + (t.active ? 1 : -1));
      await setJSON(domain, sanitize(domain, current));
      activity.likedPosts = t.list;
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, active: t.active, activity });
    }

    if (action === "comment-add") {
      const domain = String(payload.domain || "");
      const postId = String(payload.postId || "");
      const text = String(payload.text || "").trim().slice(0, 1000);
      if (!["columns", "community", "news", "itsme"].includes(domain) || !postId || !text) return res.status(400).json({ ok: false, error: "INVALID_COMMENT" });
      const current = (await getJSON("comments")) || defaultDomain("comments");
      const comment = {
        id: `comment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        domain, postId, ownerId: user.id, author: String(user.nickname || user.id).slice(0, 40), text,
        createdAt: new Date().toISOString(), published: true
      };
      current.items = [comment, ...(current.items || [])].slice(0, 3000);
      await setJSON("comments", sanitize("comments", current));
      return res.status(200).json({ ok: true, comment });
    }

    if (action === "poll-vote") {
      const pollId = String(payload.pollId || "");
      const optionId = String(payload.optionId || "");
      if (!pollId || !optionId) return res.status(400).json({ ok: false, error: "INVALID_VOTE" });
      if (activity.pollVotes?.[pollId]) return res.status(409).json({ ok: false, error: "ALREADY_VOTED" });

      // Validate the target before reserving the one-vote key. Invalid requests
      // must never leave a stranded duplicate-vote lock behind.
      const current = (await getJSON("polls")) || defaultDomain("polls");
      const poll = (current.items || []).find(x => String(x.id) === pollId && x.published !== false);
      const option = poll?.options?.find(x => String(x.id) === optionId);
      if (!poll || !option) return res.status(404).json({ ok: false, error: "POLL_NOT_FOUND" });

      const now = Date.now();
      const starts = poll.startsAt ? Date.parse(poll.startsAt) : NaN;
      const ends = poll.endsAt ? Date.parse(poll.endsAt) : NaN;
      if (Number.isFinite(starts) && now < starts) return res.status(409).json({ ok: false, error: "POLL_NOT_STARTED" });
      if (Number.isFinite(ends) && now > ends) return res.status(409).json({ ok: false, error: "POLL_ENDED" });

      const voteKey = `jcv3:pollvote:v3:${pollId}:${user.id}`;
      const reserved = await command(["SET", voteKey, optionId, "NX", "EX", 31536000]);
      if (!reserved) return res.status(409).json({ ok: false, error: "ALREADY_VOTED" });

      option.votes = Number(option.votes || 0) + 1;
      await setJSON("polls", sanitize("polls", current));
      activity.pollVotes = { ...(activity.pollVotes || {}), [pollId]: optionId };
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, activity });
    }

    if (action === "generation-vote") {
      const ageGroup = String(payload.ageGroup || "");
      const personId = String(payload.personId || "");
      const allowed = new Set(["10대", "20대", "30대", "40대", "50대", "60대+"]);
      const memberAgeGroup = generationAgeGroup(user.birthYear);
      if (!memberAgeGroup) return res.status(400).json({ ok: false, error: "BIRTH_YEAR_REQUIRED" });
      if (!allowed.has(ageGroup) || ageGroup !== memberAgeGroup || !/^(assembly|metropolitan|basic)-\d{3}$/.test(personId)) return res.status(400).json({ ok: false, error: "INVALID_GENERATION_VOTE" });
      if (activity.generationVotes?.[ageGroup]) return res.status(409).json({ ok: false, error: "ALREADY_VOTED" });

      // Validate feature state/candidate pool before reserving the member vote.
      const generation = (await getJSON("generation")) || defaultDomain("generation");
      if (generation.enabled === false) return res.status(403).json({ ok: false, error: "GENERATION_VOTE_CLOSED" });
      const candidateIds = Array.isArray(generation.candidates) ? generation.candidates.filter(Boolean) : [];
      if (candidateIds.length && !candidateIds.includes(personId)) return res.status(400).json({ ok: false, error: "CANDIDATE_NOT_ALLOWED" });

      const voteKey = `jcv3:generationvote:v2:${ageGroup}:${user.id}`;
      const reserved = await command(["SET", voteKey, personId, "NX", "EX", 31536000]);
      if (!reserved) return res.status(409).json({ ok: false, error: "ALREADY_VOTED" });

      generation.results = generation.results || {};
      generation.results[ageGroup] = generation.results[ageGroup] || {};
      generation.results[ageGroup][personId] = Number(generation.results[ageGroup][personId] || 0) + 1;
      await setJSON("generation", sanitize("generation", generation));
      activity.generationVotes = { ...(activity.generationVotes || {}), [ageGroup]: personId };
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, activity });
    }

    if (action === "national-evaluation-vote") {
      const personId = String(payload.personId || "");
      const rating = String(payload.rating || "");
      const ratings = new Set(["positive", "neutral", "negative"]);
      if (!/^assembly-\d{3}$/.test(personId) || !ratings.has(rating)) return res.status(400).json({ ok: false, error: "INVALID_NATIONAL_EVALUATION" });
      if (activity.nationalEvaluationVotes?.[personId]) return res.status(409).json({ ok: false, error: "ALREADY_VOTED" });

      const evaluation = (await getJSON("nationalEvaluation")) || defaultDomain("nationalEvaluation");
      if (evaluation.enabled !== true || String(evaluation.subjectId || "") !== personId) return res.status(403).json({ ok: false, error: "EVALUATION_CLOSED" });

      const voteKey = `jcv3:nationaleval:v1:${personId}:${user.id}`;
      const reserved = await command(["SET", voteKey, rating, "NX", "EX", 31536000]);
      if (!reserved) return res.status(409).json({ ok: false, error: "ALREADY_VOTED" });

      evaluation.results = evaluation.results || {};
      evaluation.results[personId] = { positive: 0, neutral: 0, negative: 0, ...(evaluation.results[personId] || {}) };
      evaluation.results[personId][rating] = Number(evaluation.results[personId][rating] || 0) + 1;
      await setJSON("nationalEvaluation", sanitize("nationalEvaluation", evaluation));
      activity.nationalEvaluationVotes = { ...(activity.nationalEvaluationVotes || {}), [personId]: rating };
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, activity });
    }

    if (action === "academy-apply") {
      const slotId = String(payload.slotId || "");
      if (!slotId) return res.status(400).json({ ok: false, error: "INVALID_SLOT" });
      activity.academyApplications = [slotId, ...(activity.academyApplications || []).filter(x => x !== slotId)].slice(0, 100);
      activity = await setActivity(user.id, activity);
      return res.status(200).json({ ok: true, activity });
    }

    if (action === "user-post-save") {
      const domain = String(payload.domain || "");
      const isAdmin = user.role === "admin";
      if (!["community", "itsme", "columns", "news"].includes(domain)) return res.status(400).json({ ok: false, error: "INVALID_DOMAIN" });
      if (["columns", "news"].includes(domain) && !isAdmin) return res.status(403).json({ ok: false, error: "ADMIN_REQUIRED" });
      const title = String(payload.title || "").trim().slice(0, 120);
      const body = String(payload.body || "").trim().slice(0, 50000);
      if (!title || !body) return res.status(400).json({ ok: false, error: "TITLE_BODY_REQUIRED" });
      const current = (await getJSON(domain)) || defaultDomain(domain);
      const items = current.items || [];
      const requestedId = String(payload.id || "");
      const old = requestedId ? items.find(x => String(x.id) === requestedId) : null;
      if (old && String(old.ownerId || "") !== user.id && !isAdmin) return res.status(403).json({ ok: false, error: "NOT_OWNER" });
      const id = old?.id || `${domain}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const now = new Date().toISOString();
      const next = {
        id, title,
        summary: String(payload.summary || "").trim().slice(0, 240),
        category: String(payload.category || "").trim().slice(0, 60),
        author: String(old?.author || user.nickname || user.id).slice(0, 40),
        ownerId: String(old?.ownerId || user.id),
        body,
        coverImage: String(payload.coverImage || old?.coverImage || "").slice(0, 1200), featured: Boolean(old?.featured || false), published: true,
        createdAt: old?.createdAt || now, updatedAt: now,
        likes: Number(old?.likes || 0), views: Number(old?.views || 0)
      };
      current.items = old ? items.map(x => String(x.id) === id ? next : x) : [next, ...items];
      await setJSON(domain, sanitize(domain, current));
      return res.status(200).json({ ok: true, item: next });
    }

    if (action === "user-post-delete") {
      const domain = String(payload.domain || "");
      const id = String(payload.id || "");
      const isAdmin = user.role === "admin";
      if (!["community", "itsme", "columns", "news"].includes(domain) || !id) return res.status(400).json({ ok: false, error: "INVALID_REQUEST" });
      if (["columns", "news"].includes(domain) && !isAdmin) return res.status(403).json({ ok: false, error: "ADMIN_REQUIRED" });
      const current = (await getJSON(domain)) || defaultDomain(domain);
      const old = (current.items || []).find(x => String(x.id) === id);
      if (!old) return res.status(404).json({ ok: false, error: "POST_NOT_FOUND" });
      if (String(old.ownerId || "") !== user.id && !isAdmin) return res.status(403).json({ ok: false, error: "NOT_OWNER" });
      current.items = (current.items || []).filter(x => String(x.id) !== id);
      await setJSON(domain, sanitize(domain, current));
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ ok: false, error: "UNKNOWN_ACTION" });
  } catch (error) {
    return res.status(error?.code === "STORAGE_MISSING" ? 503 : 500).json({ ok: false, error: error?.code || "ACTION_FAILED" });
  }
};
