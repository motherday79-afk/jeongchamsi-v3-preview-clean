/*
 * 정참시 v3 unified API gateway
 * Hobby-safe: exactly ONE Vercel Function.
 * Literal require() loaders let Vercel bundle every route module correctly.
 */
const routeLoaders = Object.freeze({
  "action": () => require("../server/v3/routes/action"),
  "authors": () => require("../server/v3/routes/authors"),
  "politician-requests": () => require("../server/v3/routes/politician-requests"),
  "partners": () => require("../server/v3/routes/partners"),
  "content": () => require("../server/v3/routes/content"),
  "home": () => require("../server/v3/routes/home"),
  "livebar": () => require("../server/v3/routes/livebar"),
  "health": () => require("../server/v3/routes/health"),
  "setup": () => require("../server/v3/routes/setup"),
  "upload": () => require("../server/v3/routes/upload"),
  "admin/users": () => require("../server/v3/routes/admin/users"),
  "user/activity": () => require("../server/v3/routes/user/activity"),
  "user/profile": () => require("../server/v3/routes/user/profile"),
  "user/register": () => require("../server/v3/routes/user/register"),
  "user/session": () => require("../server/v3/routes/user/session")
});

function normalizedPath(req) {
  const rewritten = req.query?.path;
  const fromRewrite = Array.isArray(rewritten) ? rewritten.join("/") : String(rewritten || "");
  if (fromRewrite) return fromRewrite.replace(/^\/+|\/+$/g, "");
  return String(req.url || "")
    .split("?")[0]
    .replace(/^\/api\/v3\/?/, "")
    .replace(/^\/+|\/+$/g, "");
}

module.exports = async function gateway(req, res) {
  const path = normalizedPath(req);
  const load = routeLoaders[path];
  res.setHeader("Cache-Control", "no-store");

  if (!load) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(404).json({ ok:false, error:"API_ROUTE_NOT_FOUND", path });
  }

  let handler;
  try {
    handler = load();
  } catch (error) {
    console.error("[JCV3_GATEWAY_LOAD]", path, error);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({ ok:false, error:"API_MODULE_LOAD_FAILED", path });
  }

  try {
    return await handler(req, res);
  } catch (error) {
    console.error("[JCV3_GATEWAY_HANDLER]", path, error);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({ ok:false, error:error?.code || "API_HANDLER_FAILED", path });
  }
};
