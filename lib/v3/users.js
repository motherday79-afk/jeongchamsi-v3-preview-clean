const crypto = require("crypto");
const { command } = require("./redis");

const USERS_KEY = "jcv3:users:v1";

function cleanId(v) { return String(v || "").trim().slice(0, 24); }
function cleanText(v, max = 200) { return String(v || "").trim().slice(0, max); }

async function readUsers() {
  const raw = await command(["GET", USERS_KEY]);
  if (!raw) return {};
  try { return JSON.parse(raw) || {}; } catch { return {}; }
}

async function writeUsers(users) {
  await command(["SET", USERS_KEY, JSON.stringify(users || {})]);
}

function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [kind, salt, expected] = String(stored || "").split("$");
  if (kind !== "scrypt" || !salt || !expected) return false;
  const actual = crypto.scryptSync(String(password || ""), salt, 64).toString("hex");
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

async function listUsers() {
  const users = await readUsers();
  return Object.values(users).map(publicUser).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

async function getUser(id) {
  const users = await readUsers();
  return users[cleanId(id)] || null;
}

async function createUser(input = {}) {
  const id = cleanId(input.id);
  const password = String(input.password || "");
  if (!/^[a-zA-Z0-9._-]{4,24}$/.test(id)) return { ok: false, error: "INVALID_ID" };
  if (password.length < 8) return { ok: false, error: "WEAK_PASSWORD" };

  const users = await readUsers();
  if (users[id]) return { ok: false, error: "DUPLICATE_ID" };

  const now = new Date().toISOString();
  const user = {
    id,
    nickname: cleanText(input.nickname || id, 40) || id,
    phone: cleanText(input.phone, 40),
    region: cleanText(input.region, 80),
    preferredParty: cleanText(input.preferredParty, 80),
    email: cleanText(input.email, 120),
    passwordHash: passwordHash(password),
    role: "member",
    status: "active",
    createdAt: now,
    updatedAt: now
  };
  users[id] = user;
  await writeUsers(users);
  return { ok: true, user: publicUser(user) };
}

async function authenticateUser(id, password) {
  const user = await getUser(id);
  if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) return null;
  return publicUser(user);
}

async function updateUserAccess(id, patch = {}) {
  const clean = cleanId(id);
  const users = await readUsers();
  const user = users[clean];
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };

  if (patch.role !== undefined) {
    const role = String(patch.role || "member");
    if (!new Set(["member", "admin"]).has(role)) return { ok: false, error: "INVALID_ROLE" };
    user.role = role;
  }
  if (patch.status !== undefined) {
    const status = String(patch.status || "active");
    if (!new Set(["active", "suspended"]).has(status)) return { ok: false, error: "INVALID_STATUS" };
    user.status = status;
  }
  user.updatedAt = new Date().toISOString();
  users[clean] = user;
  await writeUsers(users);
  return { ok: true, user: publicUser(user) };
}

module.exports = {
  USERS_KEY,
  listUsers,
  getUser,
  createUser,
  authenticateUser,
  updateUserAccess,
  publicUser
};
