import { performAction } from "./repository.js";

const GUEST_RECENT_KEY = "jcv3:guest-recent:v1";
let session = { authenticated: false, user: null };
let activity = emptyActivity();
let initialized = false;

function emptyActivity() {
  return { favorites: [], recentPeople: [], likedPosts: [], pollVotes: {}, generationVotes: {}, nationalEvaluationVotes: {}, academyApplications: [], grantedBadges: [], representativeBadge: "", updatedAt: null };
}
function readGuestRecent() {
  try { return JSON.parse(localStorage.getItem(GUEST_RECENT_KEY) || "[]").filter(Boolean).slice(0, 20); }
  catch { return []; }
}
function writeGuestRecent(ids) {
  try { localStorage.setItem(GUEST_RECENT_KEY, JSON.stringify(ids.slice(0, 20))); } catch {}
}
async function apiJSON(url, options = {}) {
  try {
    const response = await fetch(url, { credentials: "same-origin", headers: { "Accept": "application/json", ...(options.headers || {}) }, ...options });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: body.error || `HTTP_${response.status}`, status: response.status };
    return body;
  } catch {
    return { ok: false, error: "NETWORK_ERROR", status: 0 };
  }
}

function authErrorMessage(error, fallback) {
  const map = {
    API_ROUTE_NOT_FOUND: "서버 API 연결 경로를 찾지 못했습니다.",
    STORAGE_MISSING: "회원 저장소가 연결되지 않았습니다. 관리자에게 문의해 주세요.",
    JCV3_STORAGE_NOT_CONFIGURED: "회원 저장소가 연결되지 않았습니다. 관리자에게 문의해 주세요.",
    SESSION_SECRET_MISSING: "로그인 세션 설정이 완료되지 않았습니다.",
    STORAGE_AUTH: "회원 저장소 인증정보가 올바르지 않습니다. 관리자에게 문의해 주세요.",
    STORAGE_NETWORK: "회원 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    STORAGE_REQUEST: "회원 저장소 요청 처리에 실패했습니다. 관리자에게 문의해 주세요.",
    API_HANDLER_FAILED: "서버 인증 기능 실행 중 오류가 발생했습니다.",
    JCV3_SESSION_SECRET_NOT_CONFIGURED: "로그인 세션 설정이 완료되지 않았습니다.",
    NETWORK_ERROR: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    HTTP_404: "서버 API 연결 경로를 찾지 못했습니다.",
    ACCOUNT_SUSPENDED: "이용정지된 계정입니다. 정지기간이나 사유는 관리자에게 문의해 주세요."
  };
  return map[error] || fallback || error || "요청 처리에 실패했습니다.";
}

export async function initializeUserState() {
  try {
    const auth = await apiJSON("/api/v3/user/session");
    if (auth.ok && auth.authenticated && auth.user) {
      session = { authenticated: true, user: auth.user };
      const act = await apiJSON("/api/v3/user/activity");
      activity = act.ok && act.activity ? { ...emptyActivity(), ...act.activity } : emptyActivity();
      const guest = readGuestRecent();
      if (guest.length) {
        const merged = await performAction("recent-merge", { personIds: guest });
        if (merged.ok && merged.activity) activity = { ...emptyActivity(), ...merged.activity };
        writeGuestRecent([]);
      }
    } else {
      session = { authenticated: false, user: null };
      activity = emptyActivity();
    }
    return getUserSession();
  } finally {
    initialized = true;
  }
}

export function isUserStateInitialized() { return initialized; }
export function getUserSession() { return { authenticated: session.authenticated, user: session.user ? { ...session.user } : null }; }
export function getUserActivity() { return JSON.parse(JSON.stringify(activity)); }

export async function loginUser(id, password) {
  const body = await apiJSON("/api/v3/user/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: String(id || "").trim(), password: String(password || "") })
  });
  if (!body.ok) return { ok: false, error: body.error === "INVALID_CREDENTIALS" ? "아이디 또는 비밀번호가 올바르지 않습니다." : authErrorMessage(body.error, "로그인에 실패했습니다.") };
  session = { authenticated: true, user: body.user };
  const act = await apiJSON("/api/v3/user/activity");
  activity = act.ok && act.activity ? { ...emptyActivity(), ...act.activity } : emptyActivity();
  const guest = readGuestRecent();
  if (guest.length) {
    const merged = await performAction("recent-merge", { personIds: guest });
    if (merged.ok && merged.activity) activity = { ...emptyActivity(), ...merged.activity };
    writeGuestRecent([]);
  }
  return { ok: true, user: body.user };
}

export async function registerUser(input) {
  const body = await apiJSON("/api/v3/user/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input || {})
  });
  if (!body.ok) {
    const map = { DUPLICATE_ID: "이미 사용 중인 아이디입니다.", INVALID_ID: "아이디는 영문·숫자 기준 4~24자로 입력해 주세요.", WEAK_PASSWORD: "비밀번호는 8자 이상 입력해 주세요.", NAME_REQUIRED: "이름을 입력해 주세요.", REGION_REQUIRED: "도/광역시와 시/군을 선택해 주세요.", INVALID_BIRTH_YEAR: "출생연도를 올바르게 입력해 주세요." };
    return { ok: false, error: map[body.error] || authErrorMessage(body.error, "회원가입에 실패했습니다.") };
  }
  session = { authenticated: true, user: body.user };
  activity = emptyActivity();
  return { ok: true, user: body.user };
}

export async function logoutUser() {
  await apiJSON("/api/v3/user/session", { method: "DELETE" });
  session = { authenticated: false, user: null };
  activity = emptyActivity();
}

export async function toggleFavoritePerson(personId) {
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const result = await performAction("favorite-toggle", { personId });
  if (result.ok && result.activity) activity = { ...emptyActivity(), ...result.activity };
  return result;
}

export function isFavoritePerson(personId) { return (activity.favorites || []).includes(String(personId || "")); }

export async function recordRecentPerson(personId) {
  const id = String(personId || "");
  if (!id) return;
  if (!session.authenticated) {
    const guest = readGuestRecent();
    writeGuestRecent([id, ...guest.filter(x => x !== id)]);
    return;
  }
  activity.recentPeople = [id, ...(activity.recentPeople || []).filter(x => x !== id)].slice(0, 20);
  const result = await performAction("recent-record", { personId: id });
  if (result.ok && result.activity) activity = { ...emptyActivity(), ...result.activity };
}

export function getRecentPeople() { return session.authenticated ? [...(activity.recentPeople || [])] : readGuestRecent(); }

export async function togglePostLike(domain, postId) {
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const result = await performAction("post-like", { domain, postId });
  if (result.ok && result.activity) activity = { ...emptyActivity(), ...result.activity };
  return result;
}
export function isPostLiked(domain, postId) { return (activity.likedPosts || []).includes(`${domain}:${postId}`); }

export async function applyAcademy(slotId) {
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const result = await performAction("academy-apply", { slotId });
  if (result.ok && result.activity) activity = { ...emptyActivity(), ...result.activity };
  return result;
}

export function hasVotedPoll(pollId) { return !!activity.pollVotes?.[String(pollId || "")]; }
export function hasGenerationVote(ageGroup) { return !!activity.generationVotes?.[String(ageGroup || "")]; }
export function generationVoteFor(ageGroup) { return activity.generationVotes?.[String(ageGroup || "")] || ""; }
export function hasNationalEvaluationVote(personId) { return !!activity.nationalEvaluationVotes?.[String(personId || "")]; }

export async function setRepresentativeBadge(badgeKey = "") {
  if (!session.authenticated) return { ok:false, requiresLogin:true };
  const result = await performAction("badge-representative-set", { badgeKey:String(badgeKey || "") });
  if (result.ok && result.activity) activity = { ...emptyActivity(), ...result.activity };
  return result;
}

export async function refreshUserActivity() {
  if (!session.authenticated) return emptyActivity();
  const body = await apiJSON("/api/v3/user/activity");
  if (body.ok && body.activity) activity = { ...emptyActivity(), ...body.activity };
  return getUserActivity();
}

export function getUserSummary() {
  const recent = getRecentPeople();
  return {
    session: getUserSession(),
    favorites: activity.favorites?.length || 0,
    recentPeople: recent.slice(0, 4),
    recentCount: recent.length,
    likedPosts: activity.likedPosts?.length || 0,
    pollVotes: Object.keys(activity.pollVotes || {}).length,
    generationVotes: Object.keys(activity.generationVotes || {}).length,
    nationalEvaluationVotes: Object.keys(activity.nationalEvaluationVotes || {}).length,
    academyApplications: activity.academyApplications?.length || 0,
    grantedBadges: [...(activity.grantedBadges || [])],
    representativeBadge: String(activity.representativeBadge || "")
  };
}

export async function updateMyProfile(input = {}) {
  if (!session.authenticated) return { ok: false, requiresLogin: true };
  const body = await apiJSON("/api/v3/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input || {})
  });
  if (!body.ok) return { ok: false, error: body.error || "PROFILE_UPDATE_FAILED" };
  session = { authenticated: true, user: body.user };
  return { ok: true, user: body.user };
}
