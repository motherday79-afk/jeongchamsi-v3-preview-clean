const { getJSON, setJSON } = require("../../lib/v3/redis");
const { defaultDomain, sanitize } = require("../../lib/v3/schema");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  }

  const action = String(req.body?.action || "");
  const payload = req.body?.payload || {};

  if (action === "poll-vote") {
    try {
      const current = (await getJSON("polls")) || defaultDomain("polls");
      const poll = (current.items || []).find(x => String(x.id) === String(payload.pollId));
      const option = poll?.options?.find(x => String(x.id) === String(payload.optionId));
      if (!poll || !option || poll.published === false) return res.status(404).json({ ok: false, error: "POLL_NOT_FOUND" });
      option.votes = Number(option.votes || 0) + 1;
      const data = sanitize("polls", current);
      await setJSON("polls", data);
      return res.status(200).json({ ok: true, domain: "polls", storage: "redis", data });
    } catch (error) {
      if (error?.code === "STORAGE_MISSING") return res.status(503).json({ ok: false, error: "JCV3_STORAGE_NOT_CONFIGURED" });
      return res.status(503).json({ ok: false, error: "ACTION_FAILED" });
    }
  }

  return res.status(400).json({ ok: false, error: "UNKNOWN_ACTION" });
};
