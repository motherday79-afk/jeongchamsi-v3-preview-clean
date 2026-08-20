/*
 * 정참시 v3 unified API gateway
 * --------------------------------
 * Hobby-safe architecture: this is the ONLY Vercel Function.
 * Feature handlers live under /server and are loaded lazily so one optional
 * feature dependency cannot break login, signup, or unrelated API routes.
 */

const routeModules = Object.freeze({
  "action": "../server/v3/routes/action",
  "content": "../server/v3/routes/content",
  "home": "../server/v3/routes/home",
  "setup": "../server/v3/routes/setup",
  "upload": "../server/v3/routes/upload",
  "admin/users": "../server/v3/routes/admin/users",
  "user/activity": "../server/v3/routes/user/activity",
  "user/profile": "../server/v3/routes/user/profile",
  "user/register": "../server/v3/routes/user/register",
  "user/session": "../server/v3/routes/user/session"
});

function normalizedPath(req) {
  const rewritten = req.query?.path;
  const fromRewrite = Array.isArray(rewritten)
    ? rewritten.join("/")
    : String(rewritten || "");

  if (fromRewrite) return fromRewrite.replace(/^\/+|\/+$/g, "");

  const pathname = String(req.url || "").split("?")[0];
  return pathname
    .replace(/^\/api\/v3\/?/, "")
    .replace(/^\/+|\/+$/g, "");
}

module.exports = async function gateway(req, res) {
  const path = normalizedPath(req);
  const modulePath = routeModules[path];

  res.setHeader("Cache-Control", "no-store");

  if (!modulePath) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(404).json({
      ok: false,
      error: "API_ROUTE_NOT_FOUND",
      path
    });
  }

  try {
    const handler = require(modulePath);
    return await handler(req, res);
  } catch (error) {
    console.error("[JCV3_GATEWAY]", path, error);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(500).json({
      ok: false,
      error: "API_HANDLER_FAILED",
      path
    });
  }
};
