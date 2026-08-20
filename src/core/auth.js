const PREVIEW_SESSION_KEY = "jcv3:preview-admin-session";
const PREVIEW_ID = "admin";
const PREVIEW_PASSWORD = "jcv3-2026!";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1600);
  try {
    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

export async function getAdminSession() {
  const local = sessionStorage.getItem(PREVIEW_SESSION_KEY);
  try {
    const { response, body } = await request("/api/v3/admin/session");
    if (response.ok && body.authenticated) return { authenticated: true, user: body.user || { id: PREVIEW_ID }, mode: "server" };
    if (response.ok && !body.authenticated && local !== "1") return { authenticated: false, user: null, mode: "server" };
  } catch {}

  return { authenticated: local === "1", user: local === "1" ? { id: PREVIEW_ID } : null, mode: "preview" };
}

export async function loginAdmin(id, password) {
  try {
    const { response, body } = await request("/api/v3/admin/session", {
      method: "POST",
      body: JSON.stringify({ id, password })
    });
    if (response.ok && body.authenticated) {
      sessionStorage.removeItem(PREVIEW_SESSION_KEY);
      return { ok: true, mode: "server" };
    }
    if (response.status === 401) return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
  } catch {}

  if (String(id) === PREVIEW_ID && String(password) === PREVIEW_PASSWORD) {
    sessionStorage.setItem(PREVIEW_SESSION_KEY, "1");
    return { ok: true, mode: "preview" };
  }
  return { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." };
}

export async function logoutAdmin() {
  sessionStorage.removeItem(PREVIEW_SESSION_KEY);
  try {
    await request("/api/v3/admin/session", { method: "DELETE" });
  } catch {}
}

export const PREVIEW_ADMIN_ID = PREVIEW_ID;
export const PREVIEW_ADMIN_PASSWORD = PREVIEW_PASSWORD;
