const ACCOUNT_KEY = "jcv3:user:accounts:v1";
const SESSION_KEY = "jcv3:user:session:v1";
const ACTIVITY_PREFIX = "jcv3:user:activity:v1:";

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
    createdAt: "preview"
  };
}

function readAccounts() {
  return readJSON(ACCOUNT_KEY, {});
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
    updatedAt: ""
  };
}

export function getUserSession() {
  const session = readSessionRaw();
  if (!session?.id) return { authenticated: false, user: null, mode: "browser" };
  if (session.id === PREVIEW_USER_ID) return { authenticated: true, user: demoProfile(), mode: session.mode || "preview" };

  const accounts = readAccounts();
  const account = accounts[session.id];
  if (!account && session.profile?.id) {
    return { authenticated: true, user: session.profile, mode: session.mode || "server" };
  }
  if (!account) {
    localStorage.removeItem(SESSION_KEY);
    return { authenticated: false, user: null, mode: "browser" };
  }

  const { passwordHash, ...profile } = account;
  return { authenticated: true, user: profile, mode: session.mode || "browser" };
}

export async function loginUser(id, password) {
  const cleanId = String(id || "").trim();
  const cleanPassword = String(password || "");
  if (!cleanId || !cleanPassword) return { ok: false, error: "아이디와 비밀번호를 입력해 주세요." };

  const accounts = readAccounts();
  const account = accounts[cleanId];
  if (account) {
    const hash = await hashPassword(cleanPassword);
    if (hash !== account.passwordHash) return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
    writeJSON(SESSION_KEY, { id: cleanId, mode: "browser", loginAt: now() });
    return { ok: true, user: clone(account), mode: "browser" };
  }

  try {
    const response = await fetch("/api/v3/user/session", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ id: cleanId, password: cleanPassword })
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.authenticated) {
      const profile = body.user || { id: cleanId, nickname: cleanId };
      writeJSON(SESSION_KEY, { id: profile.id || cleanId, profile, mode: "server", loginAt: now() });
      return { ok: true, user: profile, mode: "server" };
    }
  } catch {}

  if (cleanId === PREVIEW_USER_ID && cleanPassword === PREVIEW_USER_PASSWORD) {
    writeJSON(SESSION_KEY, { id: cleanId, profile: demoProfile(), mode: "preview", loginAt: now() });
    return { ok: true, user: demoProfile(), mode: "preview" };
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
    createdAt: now()
  };
  accounts[id] = account;
  writeJSON(ACCOUNT_KEY, accounts);
  writeJSON(SESSION_KEY, { id, mode: "browser", loginAt: now() });
  return { ok: true, user: { ...account, passwordHash: undefined }, mode: "browser" };
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
  const session = getUserSession();
  if (!session.authenticated) return;
  const activity = getUserActivity();
  const id = String(personId || "");
  activity.recentPeople = [id, ...activity.recentPeople.filter(x => x !== id)].slice(0, 20);
  saveActivity(activity);
}

export function togglePostLike(domain, postId) {
  const session = getUserSession();
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const activity = getUserActivity();
  const key = `${domain}:${postId}`;
  const exists = activity.likedPosts.includes(key);
  activity.likedPosts = exists ? activity.likedPosts.filter(x => x !== key) : [key, ...activity.likedPosts].slice(0, 200);
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
    createdAt: now()
  };
  activity.comments = [comment, ...activity.comments].slice(0, 300);
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

export function getUserSummary() {
  const session = getUserSession();
  const activity = getUserActivity();
  return {
    session,
    favorites: activity.favorites.length,
    recentPeople: activity.recentPeople.slice(0, 4),
    likedPosts: activity.likedPosts.length,
    comments: activity.comments.length,
    academyApplications: activity.academyApplications.length
  };
}
