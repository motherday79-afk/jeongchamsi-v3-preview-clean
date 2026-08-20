/*
 * 정참시 v3 unified API gateway
 * --------------------------------
 * Hobby-safe architecture: this is the ONLY Vercel Function.
 * Feature handlers live under /server and are normal modules, not functions.
 */

const handlers = Object.freeze({
  "action": require("../server/v3/routes/action"),
  "content": require("../server/v3/routes/content"),
  "home": require("../server/v3/routes/home"),
  "setup": require("../server/v3/routes/setup"),
  "upload": require("../server/v3/routes/upload"),
  "admin/users": require("../server/v3/routes/admin/users"),
  "user/activity": require("../server/v3/routes/user/activity"),
  "user/profile": require("../server/v3/routes/user/profile"),
  "user/register": require("../server/v3/routes/user/register"),
  "user/session": require("../server/v3/routes/user/session")
});

function normalizedPath(req) {
  const fromRewrite = Array.isArray(req.query?.path)
    ? req.query.path.join("/")
    : String(req.query?.path || "");

  if (fromRewrite) return fromRewrite.replace(/^\/+|\/+$/g, "");

  const pathname = String(req.url || "").split("?")[0];
  return pathname.replace(/^\/api\/v3\/?/, "").replace(/^\/+|\/+$/g, "");
}

module.exports = async function gateway(req, res) {
  const path = normalizedPath(req);
  const handler = handlers[path];

  if (!handler) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({
      ok: false,
      error: "API_ROUTE_NOT_FOUND",
      path
    });
  }

  return handler(req, res);
};
