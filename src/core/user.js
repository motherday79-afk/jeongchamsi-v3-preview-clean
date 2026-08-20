const ACCOUNT_KEY = "jcv3:user:accounts:v2";
const SESSION_KEY = "jcv3:user:session:v2";
const ACTIVITY_PREFIX = "jcv3:user:activity:v2:";
const GUEST_RECENT_KEY = "jcv3:guest:recent-people:v1";

export const PREVIEW_USER_ID = "user";
export const PREVIEW_USER_PASSWORD = "jcv3-user!";

function clone(v) { return JSON.parse(JSON.stringify(v)); }
function now() { return new Date().toISOString(); }

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function hashPassword(value) {
  const text = String(value || "");
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
  }
  return `preview:${text}`;
}

function demoProfile() {
  return {
    id: PREVIEW_USER_ID,
    nickname: "정참시 유저",
    phone: "",
    region: "",
    preferredParty: "",
    email: "",
    role: "member",
    status: "active",
    createdAt: "preview"
  };
}

function readAccounts() {
  return readJSON(ACCOUNT_KEY, {});
}

function writeAccounts(accounts) {
  writeJSON(ACCOUNT_KEY, accounts || {});
}

function readSessionRaw() {
  return readJSON(SESSION_KEY, null);
}

function activityKey(userId) {
  return ACTIVITY_PREFIX + String(userId || "guest");
}

function defaultActivity() {
  return {
    favorites: [],
    recentPeople: [],
    likedPosts: [],
    comments: [],
    academyApplications: [],
    pollVotes: {},
    authoredPosts: [],
    updatedAt: ""
  };
}

function mergeGuestRecentIntoUser(userId) {
  const guest = readJSON(GUEST_RECENT_KEY, []);
  if (!guest.length) return;
  const activity = readJSON(activityKey(userId), defaultActivity());
  activity.recentPeople = [...guest, ...(activity.recentPeople || [])].filter((x, i, a) => a.indexOf(x) === i).slice(0, 20);
  activity.updatedAt = now();
  writeJSON(activityKey(userId), activity);
  localStorage.removeItem(GUEST_RECENT_KEY);
}

export function getUserSession() {
  const session = readSessionRaw();
  if (!session?.id) return { authenticated: false, user: null, mode: "browser" };
  if (session.id === PREVIEW_USER_ID && !readAccounts()[session.id]) {
    const profile = { ...demoProfile(), ...(session.profile || {}) };
    return { authenticated: true, user: profile, mode: session.mode || "preview" };
  }

  const accounts = readAccounts();
  const account = accounts[session.id];
  if (!account && session.profile?.id) {
    if (session.profile.status === "suspended") {
      localStorage.removeItem(SESSION_KEY);
      return { authenticated: false, user: null, mode: "browser" };
    }
    return { authenticated: true, user: session.profile, mode: session.mode || "server" };
  }
  if (!account) {
    localStorage.removeItem(SESSION_KEY);
    return { authenticated: false, user: null, mode: "browser" };
  }
  if (account.status === "suspended") {
    localStorage.removeItem(SESSION_KEY);
    return { authenticated: false, user: null, mode: "browser" };
  }

  const { passwordHash, ...profile } = account;
  return { authenticated: true, user: profile, mode: session.mode || "browser" };
}

async function serverLogin(cleanId, cleanPassword) {
  const response = await fetch("/api/v3/user/session", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ id: cleanId, password: cleanPassword })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.authenticated) return { ok: false, status: response.status, body };
  return { ok: true, user: body.user || { id: cleanId, nickname: cleanId, role: "member", status: "active" } };
}

export async function loginUser(id, password) {
  const cleanId = String(id || "").trim();
  const cleanPassword = String(password || "");
  if (!cleanId || !cleanPassword) return { ok: false, error: "아이디와 비밀번호를 입력해 주세요." };

  try {
    const server = await serverLogin(cleanId, cleanPassword);
    if (server.ok) {
      writeJSON(SESSION_KEY, { id: server.user.id || cleanId, profile: server.user, mode: "server", loginAt: now() });
      mergeGuestRecentIntoUser(server.user.id || cleanId);
      return { ok: true, user: server.user, mode: "server" };
    }
    if (server.status === 401) {
      const local = readAccounts()[cleanId];
      if (!local && !(cleanId === PREVIEW_USER_ID && cleanPassword === PREVIEW_USER_PASSWORD)) {
        return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
      }
    }
  } catch {}

  const accounts = readAccounts();
  const account = accounts[cleanId];
  if (account) {
    if (account.status === "suspended") return { ok: false, error: "이용이 정지된 계정입니다." };
    const hash = await hashPassword(cleanPassword);
    if (hash !== account.passwordHash) return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    const { passwordHash, ...profile } = account;
    writeJSON(SESSION_KEY, { id: cleanId, profile, mode: "browser", loginAt: now() });
    mergeGuestRecentIntoUser(cleanId);
    return { ok: true, user: profile, mode: "browser" };
  }

  if (cleanId === PREVIEW_USER_ID && cleanPassword === PREVIEW_USER_PASSWORD) {
    const profile = demoProfile();
    writeJSON(SESSION_KEY, { id: cleanId, profile, mode: "preview", loginAt: now() });
    mergeGuestRecentIntoUser(cleanId);
    return { ok: true, user: profile, mode: "preview" };
  }

  return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
}

export async function registerUser(input) {
  const id = String(input.id || "").trim();
  const password = String(input.password || "");
  const passwordConfirm = String(input.passwordConfirm || "");
  const phone = String(input.phone || "").trim();
  const region = String(input.region || "").trim();
  const preferredParty = String(input.preferredParty || "").trim();
  const email = String(input.email || "").trim();
  const nickname = String(input.nickname || id).trim() || id;

  if (!/^[a-zA-Z0-9._-]{4,24}$/.test(id)) return { ok: false, error: "아이디는 영문·숫자 기준 4~24자로 입력해 주세요." };
  if (password.length < 8) return { ok: false, error: "비밀번호는 8자 이상 입력해 주세요." };
  if (password !== passwordConfirm) return { ok: false, error: "비밀번호 확인이 일치하지 않습니다." };
  if (!phone) return { ok: false, error: "전화번호를 입력해 주세요." };
  if (!region) return { ok: false, error: "지역을 입력해 주세요." };
  if (!preferredParty) return { ok: false, error: "선호정당을 선택해 주세요." };

  try {
    const response = await fetch("/api/v3/user/register", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ id, password, nickname, phone, region, preferredParty, email })
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.user) {
      writeJSON(SESSION_KEY, { id: body.user.id, profile: body.user, mode: "server", loginAt: now() });
      mergeGuestRecentIntoUser(body.user.id);
      return { ok: true, user: body.user, mode: "server" };
    }
    if (response.status === 409) return { ok: false, error: "이미 사용 중인 아이디입니다." };
    if (response.status >= 400 && response.status < 500 && body.error !== "JCV3_STORAGE_NOT_CONFIGURED") {
      return { ok: false, error: "회원가입 정보를 다시 확인해 주세요." };
    }
  } catch {}

  const accounts = readAccounts();
  if (id === PREVIEW_USER_ID || accounts[id]) return { ok: false, error: "이미 사용 중인 아이디입니다." };

  const account = {
    id,
    nickname,
    phone,
    region,
    preferredParty,
    email,
    passwordHash: await hashPassword(password),
    role: "member",
    status: "active",
    createdAt: now(),
    updatedAt: now()
  };
  accounts[id] = account;
  writeAccounts(accounts);
  const { passwordHash, ...profile } = account;
  writeJSON(SESSION_KEY, { id, profile, mode: "browser", loginAt: now() });
  mergeGuestRecentIntoUser(id);
  return { ok: true, user: profile, mode: "browser" };
}

export async function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  try {
    await fetch("/api/v3/user/session", { method: "DELETE", credentials: "same-origin" });
  } catch {}
}

export function getUserActivity() {
  const session = getUserSession();
  if (!session.authenticated) return defaultActivity();
  return readJSON(activityKey(session.user.id), defaultActivity());
}

function saveActivity(activity) {
  const session = getUserSession();
  if (!session.authenticated) return false;
  activity.updatedAt = now();
  writeJSON(activityKey(session.user.id), activity);
  return true;
}

export function toggleFavoritePerson(personId) {
  const session = getUserSession();
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const activity = getUserActivity();
  const id = String(personId || "");
  const exists = activity.favorites.includes(id);
  activity.favorites = exists ? activity.favorites.filter(x => x !== id) : [id, ...activity.favorites].slice(0, 100);
  saveActivity(activity);
  return { ok: true, active: !exists };
}

export function isFavoritePerson(personId) {
  return getUserActivity().favorites.includes(String(personId || ""));
}

export function recordRecentPerson(personId) {
  const id = String(personId || "");
  if (!id) return;
  const session = getUserSession();
  if (!session.authenticated) {
    const guest = readJSON(GUEST_RECENT_KEY, []);
    writeJSON(GUEST_RECENT_KEY, [id, ...guest.filter(x => x !== id)].slice(0, 20));
    return;
  }
  const activity = getUserActivity();
  activity.recentPeople = [id, ...activity.recentPeople.filter(x => x !== id)].slice(0, 20);
  saveActivity(activity);
}

export function getRecentPeople() {
  const session = getUserSession();
  return session.authenticated ? getUserActivity().recentPeople : readJSON(GUEST_RECENT_KEY, []);
}

export function togglePostLike(domain, postId) {
  const session = getUserSession();
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const activity = getUserActivity();
  const key = `${domain}:${postId}`;
  const exists = activity.likedPosts.includes(key);
  activity.likedPosts = exists ? activity.likedPosts.filter(x => x !== key) : [key, ...activity.likedPosts].slice(0, 300);
  saveActivity(activity);
  return { ok: true, active: !exists };
}

export function isPostLiked(domain, postId) {
  return getUserActivity().likedPosts.includes(`${domain}:${postId}`);
}

export function addComment(domain, postId, text) {
  const session = getUserSession();
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const clean = String(text || "").trim();
  if (!clean) return { ok: false, error: "댓글을 입력해 주세요." };
  const activity = getUserActivity();
  const comment = {
    id: `comment-${Date.now().toString(36)}`,
    domain,
    postId: String(postId),
    text: clean.slice(0, 1000),
    author: session.user.nickname || session.user.id,
    ownerId: session.user.id,
    createdAt: now()
  };
  activity.comments = [comment, ...activity.comments].slice(0, 500);
  saveActivity(activity);
  return { ok: true, comment };
}

export function commentsFor(domain, postId) {
  return getUserActivity().comments.filter(x => x.domain === domain && String(x.postId) === String(postId));
}

export function applyAcademy(slotId) {
  const session = getUserSession();
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const activity = getUserActivity();
  const id = String(slotId || "");
  if (!activity.academyApplications.includes(id)) activity.academyApplications = [id, ...activity.academyApplications].slice(0, 100);
  saveActivity(activity);
  return { ok: true };
}

export function hasVotedPoll(pollId) {
  return !!getUserActivity().pollVotes?.[String(pollId || "")];
}

export function recordPollVote(pollId, optionId) {
  const session = getUserSession();
  if (!session.authenticated) return false;
  const activity = getUserActivity();
  activity.pollVotes = activity.pollVotes || {};
  activity.pollVotes[String(pollId)] = String(optionId);
  saveActivity(activity);
  return true;
}

export function recordAuthoredPost(domain, postId) {
  const session = getUserSession();
  if (!session.authenticated) return;
  const activity = getUserActivity();
  const key = `${domain}:${postId}`;
  activity.authoredPosts = [key, ...(activity.authoredPosts || []).filter(x => x !== key)].slice(0, 300);
  saveActivity(activity);
}

export function removeAuthoredPost(domain, postId) {
  const session = getUserSession();
  if (!session.authenticated) return;
  const activity = getUserActivity();
  const key = `${domain}:${postId}`;
  activity.authoredPosts = (activity.authoredPosts || []).filter(x => x !== key);
  saveActivity(activity);
}

export function getUserSummary() {
  const session = getUserSession();
  const activity = getUserActivity();
  const recent = getRecentPeople();
  return {
    session,
    favorites: activity.favorites.length,
    recentPeople: recent.slice(0, 4),
    recentCount: recent.length,
    likedPosts: activity.likedPosts.length,
    comments: activity.comments.length,
    academyApplications: activity.academyApplications.length,
    pollVotes: Object.keys(activity.pollVotes || {}).length,
    authoredPosts: (activity.authoredPosts || []).length
  };
}

export function listLocalAccountsForAdmin() {
  const accounts = readAccounts();
  return Object.values(accounts).map(({ passwordHash, ...profile }) => profile).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

export function updateLocalAccountAccess(id, patch = {}) {
  const accounts = readAccounts();
  const account = accounts[String(id || "")];
  if (!account) return { ok: false, error: "USER_NOT_FOUND" };
  if (patch.role !== undefined) account.role = patch.role === "admin" ? "admin" : "member";
  if (patch.status !== undefined) account.status = patch.status === "suspended" ? "suspended" : "active";
  account.updatedAt = now();
  accounts[account.id] = account;
  writeAccounts(accounts);
  const session = readSessionRaw();
  if (session?.id === account.id && session.profile) {
    const { passwordHash, ...profile } = account;
    writeJSON(SESSION_KEY, { ...session, profile });
  }
  return { ok: true };
}
