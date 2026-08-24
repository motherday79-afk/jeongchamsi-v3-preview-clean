import { getDomain, saveDomain } from "../core/repository.js";
import { listAssemblyMembers, listAllLocalLeaders, getPersonSlotById } from "../data/person-provider.js";
import {
  normalizeNationalEvaluation,
  votesForEvaluationSlot,
  isAllowedNationalEvaluationSubject,
  makeNationalEvaluationId,
  nationalEvaluationTypeLabel
} from "./national-evaluation-model.js";

const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const COLLECTIONS = Object.freeze({
  assembly: listAssemblyMembers(),
  local: listAllLocalLeaders()
});
const BY_SLOT = Object.freeze({
  assembly: new Map(COLLECTIONS.assembly.map(p => [p.id, p])),
  local: new Map(COLLECTIONS.local.map(p => [p.id, p]))
});

function personText(p) {
  if (!p) return "";
  return [p.name, p.roleLabel, p.party, p.jurisdiction].filter(Boolean).join(" · ");
}
function pickerValue(slotKey, id = "") {
  const p = BY_SLOT[slotKey]?.get(String(id || ""));
  return p ? `${personText(p)} [${p.id}]` : "";
}
function resolvePersonId(slotKey, value = "") {
  const raw = String(value || "").trim();
  const collection = COLLECTIONS[slotKey] || [];
  const map = BY_SLOT[slotKey] || new Map();
  const bracket = raw.match(/\[((?:assembly|metropolitan|basic)-\d{3})\]\s*$/);
  if (bracket && map.has(bracket[1]) && isAllowedNationalEvaluationSubject(slotKey, bracket[1])) return bracket[1];
  if (isAllowedNationalEvaluationSubject(slotKey, raw) && map.has(raw)) return raw;
  const exact = collection.filter(p => p.name === raw || personText(p) === raw);
  return exact.length === 1 ? exact[0].id : "";
}
function cleanCount(v) { return Math.max(0, Math.round(Number(v || 0) || 0)); }
function slotTitle(slotKey) { return slotKey === "assembly" ? "국회의원" : "광역·기초단체장"; }
function slotHint(slotKey) { return slotKey === "assembly" ? "국회의원만 선택" : "광역단체장 또는 기초단체장 선택"; }
function formStateLabel(slot) {
  if (!slot?.subjectId) return "평가 대상 선택 전";
  if (slot?.closedAt) return "평가 종료 · 새 평가 대기";
  return slot?.enabled ? "평가 진행중" : "평가 일시중지";
}
function archiveCurrentSlot(data, slotKey, { closedAt = new Date().toISOString() } = {}) {
  const normalized = normalizeNationalEvaluation(data);
  const slot = normalized.slots[slotKey];
  if (!slot?.subjectId || !slot?.evaluationId) return normalized;
  const already = normalized.history.some(x => String(x?.evaluationId || "") === String(slot.evaluationId));
  if (already) return normalized;
  const votes = votesForEvaluationSlot(normalized, slot);
  normalized.history = [{
    evaluationId: slot.evaluationId,
    slot: slotKey,
    subjectId: slot.subjectId,
    positive: votes.positive,
    neutral: votes.neutral,
    negative: votes.negative,
    startedAt: slot.startedAt || "",
    closedAt
  }, ...normalized.history].slice(0, 200);
  return normalized;
}
function syncLegacyMirror(data) {
  const assembly = data.slots?.assembly || {};
  data.subjectId = assembly.subjectId || null;
  data.enabled = assembly.enabled === true && !assembly.closedAt;
  return data;
}
function editorSlot(data, slotKey, context) {
  const slot = data.slots[slotKey];
  const person = slot?.subjectId ? getPersonSlotById(slot.subjectId) : null;
  const liveVotes = votesForEvaluationSlot(data, slot || {});
  const votes = slot?.closedAt ? { positive:0, neutral:0, negative:0 } : liveVotes;
  const total = votes.positive + votes.neutral + votes.negative;
  const datalistId = `national-admin-${slotKey}-${String(context).replace(/[^a-z0-9_-]/gi,"-")}`;
  const options = (COLLECTIONS[slotKey] || []).map(p => `<option value="${esc(`${personText(p)} [${p.id}]`)}"></option>`).join("");
  const submitLabel = slot?.closedAt ? "새 평가 추가" : slot?.subjectId ? "평가 수정" : "평가 시작";
  const type = person ? nationalEvaluationTypeLabel(person.id) : slotTitle(slotKey);
  return `<section class="national-admin-slot" data-national-admin-slot="${esc(slotKey)}">
    <div class="national-admin-slot-head"><div><span>${slotKey === "assembly" ? "SLOT A" : "SLOT B"}</span><b>${esc(slotTitle(slotKey))}</b><small>${esc(slotHint(slotKey))}</small></div><em class="national-admin-status ${slot?.closedAt ? "closed" : slot?.enabled ? "live" : "paused"}">${esc(formStateLabel(slot))}</em></div>
    ${person ? `<div class="national-admin-current"><span>${esc(type)}</span><b>${esc(person.name)}</b><small>${esc([person.party,person.jurisdiction].filter(Boolean).join(" · "))}</small></div>` : ""}
    <form data-national-admin-form data-national-slot="${esc(slotKey)}">
      <div class="national-admin-toolbar"><label>평가 정치인<input name="subject" type="text" list="${datalistId}" value="${esc(pickerValue(slotKey, slot?.subjectId || ""))}" placeholder="${slotKey === "assembly" ? "국회의원 검색" : "광역·기초단체장 검색"}" autocomplete="off"></label><label class="check"><input type="checkbox" name="enabled" ${slot?.enabled && !slot?.closedAt ? "checked" : ""}> 평가 참여 활성</label></div>
      <datalist id="${datalistId}">${options}</datalist>
      <div class="national-admin-vote-grid"><label>긍정 표수<input name="positive" type="number" min="0" step="1" inputmode="numeric" value="${votes.positive}"></label><label>보통 표수<input name="neutral" type="number" min="0" step="1" inputmode="numeric" value="${votes.neutral}"></label><label>부정 표수<input name="negative" type="number" min="0" step="1" inputmode="numeric" value="${votes.negative}"></label><div class="national-admin-total"><small>표시 합계</small><b>${total.toLocaleString("ko-KR")}명</b></div></div>
      <div class="national-admin-actions"><button class="primary-btn" type="submit">${esc(submitLabel)}</button>${slot?.subjectId && !slot?.closedAt ? `<button class="ghost-btn danger" type="button" data-national-evaluation-close data-slot-key="${esc(slotKey)}">평가 종료</button>` : ""}<span class="save-state" data-national-admin-state>${data.demoMode === true ? "관리 표시 수치 사용 중" : "실제 참여 집계 표시 중"}</span></div>
    </form>
  </section>`;
}

export function displayNationalEvaluationVotes(data = {}, personId = "") {
  const normalized = normalizeNationalEvaluation(data);
  const slot = Object.values(normalized.slots).find(x => String(x?.subjectId || "") === String(personId || ""));
  return slot ? votesForEvaluationSlot(normalized, slot) : { positive:0, neutral:0, negative:0 };
}

export function renderNationalEvaluationAdminEditor(input = {}, { context="page", open=false } = {}) {
  const data = normalizeNationalEvaluation(input);
  return `<details class="national-admin-editor national-admin-editor-v2" ${open ? "open" : ""}><summary><span><b>정참시민 전국 평가제 관리</b><small>국회의원 1명 + 광역·기초단체장 1명 · 두 평가를 독립 운영</small></span><em>관리</em></summary><div class="national-admin-two-slots">${editorSlot(data,"assembly",context)}${editorSlot(data,"local",context)}</div><div class="national-admin-live-row"><button class="ghost-btn" type="button" data-national-live-mode>실제 참여 집계 사용</button><small>정치인 변경·시작·수정·종료는 이 페이지에서 바로 반영됩니다</small></div></details>`;
}

export async function saveNationalEvaluationAdminForm(form) {
  const slotKey = String(form?.dataset?.nationalSlot || "");
  if (!['assembly','local'].includes(slotKey)) return { ok:false, error:"잘못된 평가 슬롯입니다" };
  const subjectId = resolvePersonId(slotKey, form.querySelector('[name="subject"]')?.value || "");
  if (!subjectId) return { ok:false, error:slotKey === "assembly" ? "평가할 국회의원을 검색 목록에서 선택해 주세요" : "평가할 광역·기초단체장을 검색 목록에서 선택해 주세요" };

  let data = normalizeNationalEvaluation(await getDomain("nationalEvaluation"));
  const currentSlot = data.slots[slotKey];
  const now = new Date().toISOString();
  const subjectChanged = !!currentSlot?.subjectId && currentSlot.subjectId !== subjectId;
  const newCycle = !currentSlot?.evaluationId || !!currentSlot?.closedAt || subjectChanged;
  if (subjectChanged && currentSlot?.subjectId && !currentSlot?.closedAt) data = archiveCurrentSlot(data, slotKey, { closedAt:now });

  const evaluationId = newCycle ? makeNationalEvaluationId(slotKey, Date.now(), subjectId) : currentSlot.evaluationId;
  const nextSlot = {
    slot: slotKey,
    evaluationId,
    subjectId,
    enabled: form.querySelector('[name="enabled"]')?.checked === true,
    startedAt: newCycle ? now : (currentSlot.startedAt || now),
    updatedAt: now,
    closedAt: ""
  };
  data.slots = { ...data.slots, [slotKey]: nextSlot };
  data.demoMode = true;
  const submittedVotes = subjectChanged ? { positive:0, neutral:0, negative:0 } : {
    positive: cleanCount(form.querySelector('[name="positive"]')?.value),
    neutral: cleanCount(form.querySelector('[name="neutral"]')?.value),
    negative: cleanCount(form.querySelector('[name="negative"]')?.value)
  };
  data.demoResults = { ...(data.demoResults || {}), [evaluationId]: submittedVotes };
  syncLegacyMirror(data);
  return saveDomain("nationalEvaluation", data);
}

export async function closeNationalEvaluationSlot(slotKey = "") {
  if (!['assembly','local'].includes(slotKey)) return { ok:false, error:"잘못된 평가 슬롯입니다" };
  let data = normalizeNationalEvaluation(await getDomain("nationalEvaluation"));
  const slot = data.slots[slotKey];
  if (!slot?.subjectId || !slot?.evaluationId) return { ok:false, error:"종료할 평가가 없습니다" };
  if (slot.closedAt) return { ok:true, data };
  const now = new Date().toISOString();
  data = archiveCurrentSlot(data, slotKey, { closedAt:now });
  data.slots = { ...data.slots, [slotKey]: { ...slot, enabled:false, updatedAt:now, closedAt:now } };
  syncLegacyMirror(data);
  return saveDomain("nationalEvaluation", data);
}

export async function useLiveNationalEvaluationResults() {
  const current = normalizeNationalEvaluation(await getDomain("nationalEvaluation"));
  return saveDomain("nationalEvaluation", { ...current, demoMode:false });
}
