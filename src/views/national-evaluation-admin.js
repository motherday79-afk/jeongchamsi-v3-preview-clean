import { getDomain, saveDomain } from "../core/repository.js?v=alpha6.0.36.18-livebar-auth-generation";
import { listAllPoliticians } from "../data/person-provider.js?v=alpha6.0.20-function-detail";

const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const assembly = listAllPoliticians().filter(p => p.type === "assembly");
const byId = new Map(assembly.map(p => [p.id, p]));
function personText(p) { return p ? [p.name, p.party, p.jurisdiction].filter(Boolean).join(" · ") : ""; }
function pickerValue(id = "") { const p = byId.get(String(id || "")); return p ? `${personText(p)} [${p.id}]` : ""; }
function resolvePersonId(value = "") {
  const raw = String(value || "").trim();
  const bracket = raw.match(/\[(assembly-\d{3})\]\s*$/);
  if (bracket && byId.has(bracket[1])) return bracket[1];
  if (/^assembly-\d{3}$/.test(raw) && byId.has(raw)) return raw;
  const exact = assembly.filter(p => p.name === raw || personText(p) === raw);
  return exact.length === 1 ? exact[0].id : "";
}
export function displayNationalEvaluationVotes(data = {}, personId = "") {
  const id = String(personId || data.subjectId || "");
  if (!id) return { positive:0, neutral:0, negative:0 };
  const source = data.demoMode === true ? data.demoResults : data.results;
  return { positive:0, neutral:0, negative:0, ...((source || {})[id] || {}) };
}
export function renderNationalEvaluationAdminEditor(data = {}, { context="page", open=false } = {}) {
  const datalistId = `national-admin-people-${String(context).replace(/[^a-z0-9_-]/gi,"-")}`;
  const votes = displayNationalEvaluationVotes(data, data.subjectId || "");
  const total = Number(votes.positive||0)+Number(votes.neutral||0)+Number(votes.negative||0);
  const options = assembly.map(p => `<option value="${esc(`${personText(p)} [${p.id}]`)}"></option>`).join("");
  return `<details class="national-admin-editor" ${open ? "open" : ""}><summary><span><b>전국평 관리</b><small>평가 대상·표시 수치·진행 상태를 한 번에 관리</small></span><em>관리</em></summary><form data-national-admin-form><div class="national-admin-toolbar"><label>현재 평가 대상<input name="subject" type="text" list="${datalistId}" value="${esc(pickerValue(data.subjectId || ""))}" placeholder="국회의원 이름 검색" autocomplete="off"></label><label class="check"><input type="checkbox" name="enabled" ${data.enabled ? "checked" : ""}> 전국 평가 참여 활성</label></div><datalist id="${datalistId}">${options}</datalist><div class="national-admin-vote-grid"><label>긍정 표수<input name="positive" type="number" min="0" step="1" inputmode="numeric" value="${Math.max(0,Number(votes.positive||0))}"></label><label>보통 표수<input name="neutral" type="number" min="0" step="1" inputmode="numeric" value="${Math.max(0,Number(votes.neutral||0))}"></label><label>부정 표수<input name="negative" type="number" min="0" step="1" inputmode="numeric" value="${Math.max(0,Number(votes.negative||0))}"></label><div class="national-admin-total"><small>표시 합계</small><b>${total.toLocaleString("ko-KR")}명</b></div></div><div class="national-admin-actions"><button class="primary-btn" type="submit">전국평 설정 저장</button><button class="ghost-btn" type="button" data-national-live-mode>실제 참여 집계 사용</button><span class="save-state" data-national-admin-state>${data.demoMode === true ? "관리 표시 수치 사용 중" : "실제 참여 집계 표시 중"}</span></div></form></details>`;
}
export async function saveNationalEvaluationAdminForm(form) {
  const current = await getDomain("nationalEvaluation");
  const subjectId = resolvePersonId(form.querySelector('[name="subject"]')?.value || "");
  if (!subjectId) return { ok:false, error:"평가할 국회의원을 검색 목록에서 선택해 주세요." };
  const clean = name => Math.max(0, Math.round(Number(form.querySelector(`[name="${name}"]`)?.value || 0)));
  const demoResults = { ...(current.demoResults || {}), [subjectId]: { positive:clean("positive"), neutral:clean("neutral"), negative:clean("negative") } };
  const history = Array.isArray(current.history) ? [...current.history] : [];
  if (current.subjectId && current.subjectId !== subjectId && !history.some(x => x.subjectId === current.subjectId)) history.unshift({ subjectId:current.subjectId, closedAt:new Date().toISOString() });
  const next = { ...current, subjectId, enabled:form.querySelector('[name="enabled"]')?.checked === true, demoMode:true, demoResults, history:history.slice(0,100) };
  return saveDomain("nationalEvaluation", next);
}
export async function useLiveNationalEvaluationResults() {
  const current = await getDomain("nationalEvaluation");
  return saveDomain("nationalEvaluation", { ...current, demoMode:false });
}
