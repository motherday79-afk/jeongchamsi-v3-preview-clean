const { sessionFromRequest } = require("./user-auth");
const { getUser } = require("./users");

async function currentUser(req) {
  const session = sessionFromRequest(req);
  if (!session?.id) return null;
  const user = await getUser(session.id);
  if (!user || user.status !== "active") return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

async function requireAdmin(req) {
  const user = await currentUser(req);
  return user?.role === "admin" ? user : null;
}

module.exports = { currentUser, requireAdmin };
