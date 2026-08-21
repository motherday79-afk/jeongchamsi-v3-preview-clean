const crypto = require("crypto");
const { command } = require("./redis");

const USERS_KEY = "jcv3:users:v2";

function cleanId(v) { return String(v || "").trim().slice(0, 24); }
function cleanText(v, max = 200) { return String(v || "").trim().slice(0, max); }
function validBirthYear(v) { const y = Number(v || 0); const now = new Date().getFullYear(); return Number.isInteger(y) && y >= 1900 && y <= now; }
function regionText(input = {}) { return [cleanText(input.regionProvince, 40), cleanText(input.regionCity, 40), cleanText(input.regionDistrict, 40)].filter(Boolean).join(" "); }

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
  return (await readUsers())[cleanId(id)] || null;
}

async function hasActiveAdmin() {
  const users = await readUsers();
  return Object.values(users).some(u => u.role === "admin" && u.status === "active");
}

async function createUser(input = {}, forcedRole = "member") {
  const id = cleanId(input.id);
  const password = String(input.password || "");
  if (!/^[a-zA-Z0-9._-]{4,24}$/.test(id)) return { ok: false, error: "INVALID_ID" };
  if (password.length < 8) return { ok: false, error: "WEAK_PASSWORD" };
  if (forcedRole !== "admin") {
    if (!cleanText(input.name, 40)) return { ok: false, error: "NAME_REQUIRED" };
    if (!cleanText(input.regionProvince, 40) || !cleanText(input.regionCity, 40)) return { ok: false, error: "REGION_REQUIRED" };
    if (!validBirthYear(input.birthYear)) return { ok: false, error: "INVALID_BIRTH_YEAR" };
  }

  const users = await readUsers();
  if (users[id]) return { ok: false, error: "DUPLICATE_ID" };

  const now = new Date().toISOString();
  const user = {
    id,
    name: cleanText(input.name, 40),
    nickname: cleanText(input.nickname || id, 40) || id,
    phone: cleanText(input.phone, 40),
    regionProvince: cleanText(input.regionProvince, 40),
    regionCity: cleanText(input.regionCity, 40),
    regionDistrict: cleanText(input.regionDistrict, 40),
    region: regionText(input) || cleanText(input.region, 80),
    preferredParty: cleanText(input.preferredParty, 80),
    email: cleanText(input.email, 120),
    birthYear: validBirthYear(input.birthYear) ? cleanText(input.birthYear, 4) : "",
    passwordHash: passwordHash(password),
    role: forcedRole === "admin" ? "admin" : "member",
    status: "active",
    createdAt: now,
    updatedAt: now
  };
  users[id] = user;
  await writeUsers(users);
  return { ok: true, user: publicUser(user) };
}

async function createFirstAdmin(input = {}) {
  if (await hasActiveAdmin()) return { ok: false, error: "ADMIN_ALREADY_EXISTS" };
  return createUser(input, "admin");
}

async function authenticateUser(id, password) {
  const user = await getUser(id);
  if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) return null;
  return publicUser(user);
}

async function updateOwnProfile(id, patch = {}) {
  const clean = cleanId(id);
  const users = await readUsers();
  const user = users[clean];
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };

  if (!cleanText(patch.name || user.name, 40)) return { ok: false, error: "NAME_REQUIRED" };
  if (!cleanText(patch.regionProvince || user.regionProvince, 40) || !cleanText(patch.regionCity || user.regionCity, 40)) return { ok: false, error: "REGION_REQUIRED" };
  if (!validBirthYear(patch.birthYear || user.birthYear)) return { ok: false, error: "INVALID_BIRTH_YEAR" };
  user.name = cleanText(patch.name || user.name, 40);
  user.nickname = cleanText(patch.nickname || user.nickname || clean, 40) || clean;
  user.phone = cleanText(patch.phone, 40);
  user.regionProvince = cleanText(patch.regionProvince || user.regionProvince, 40);
  user.regionCity = cleanText(patch.regionCity || user.regionCity, 40);
  user.regionDistrict = cleanText(patch.regionDistrict, 40);
  user.region = regionText(user);
  user.preferredParty = cleanText(patch.preferredParty, 80);
  user.email = cleanText(patch.email, 120);
  user.birthYear = cleanText(patch.birthYear || user.birthYear, 4);
  user.updatedAt = new Date().toISOString();
  users[clean] = user;
  await writeUsers(users);
  return { ok: true, user: publicUser(user) };
}

async function updateUserAccess(id, patch = {}) {
  const clean = cleanId(id);
  const users = await readUsers();
  const user = users[clean];
  if (!user) return { ok: false, error: "USER_NOT_FOUND" };

  const nextRole = patch.role === undefined ? user.role : (String(patch.role) === "admin" ? "admin" : "member");
  const nextStatus = patch.status === undefined ? user.status : (String(patch.status) === "suspended" ? "suspended" : "active");

  const activeAdmins = Object.values(users).filter(u => u.role === "admin" && u.status === "active");
  if (user.role === "admin" && user.status === "active" && (nextRole !== "admin" || nextStatus !== "active") && activeAdmins.length <= 1) {
    return { ok: false, error: "LAST_ADMIN_PROTECTED" };
  }

  user.role = nextRole;
  user.status = nextStatus;
  user.updatedAt = new Date().toISOString();
  users[clean] = user;
  await writeUsers(users);
  return { ok: true, user: publicUser(user) };
}

module.exports = {
  USERS_KEY,
  listUsers,
  getUser,
  hasActiveAdmin,
  createUser,
  createFirstAdmin,
  authenticateUser,
  updateOwnProfile,
  updateUserAccess,
  publicUser
};
