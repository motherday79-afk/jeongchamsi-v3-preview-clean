import { badgeGemSvg, badgeByKey } from "../data/badge-catalog.js";

const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));

export function authorIdentity(name = "정참시", ownerId = "", profiles = {}, { className = "" } = {}) {
  const profile = profiles?.[String(ownerId || "")] || null;
  const badge = badgeByKey(profile?.representativeBadge || "");
  const role = profile?.role === "partner" ? `<span class="author-role author-role-partner">PARTNER</span>` : profile?.role === "admin" ? `<span class="author-role author-role-admin">ADMIN</span>` : "";
  return `<span class="author-identity ${esc(className)}"><span class="author-nickname">${esc(name || profile?.nickname || "정참시")}</span>${badge ? `<span class="author-representative-badge" title="대표 배지 · ${esc(badge.name)}" aria-label="대표 배지 ${esc(badge.name)}">${badgeGemSvg(badge.key, "badge-gem-author")}</span>` : ""}${role}</span>`;
}

export function authorOwnerIds(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).map(x => String(x?.ownerId || "")).filter(Boolean))];
}
