export const NATIONAL_EVALUATION_SLOT_KEYS = Object.freeze(["assembly", "local"]);

const EMPTY_VOTES = Object.freeze({ positive: 0, neutral: 0, negative: 0 });
const asText = v => String(v || "").trim();
const asCount = v => Math.max(0, Math.round(Number(v || 0) || 0));

export function isAllowedNationalEvaluationSubject(slotKey = "", subjectId = "") {
  const id = asText(subjectId);
  if (slotKey === "assembly") return /^assembly-\d{3}$/.test(id);
  if (slotKey === "local") return /^(?:metropolitan|basic)-\d{3}$/.test(id);
  return false;
}

export function makeNationalEvaluationId(slotKey = "assembly", now = Date.now(), subjectId = "") {
  const slot = slotKey === "local" ? "local" : "assembly";
  const stamp = Math.max(0, Number(now) || Date.now()).toString(36);
  const subject = asText(subjectId).replace(/[^a-z0-9-]/gi, "").slice(-24) || "subject";
  return `ne-${slot}-${stamp}-${subject}`;
}

export function legacyNationalEvaluationId(slotKey = "assembly", subjectId = "") {
  const id = asText(subjectId);
  return id ? `legacy-${slotKey}-${id}` : "";
}

function normalizeSlot(slotKey, raw = {}, legacy = {}) {
  let subjectId = asText(raw?.subjectId);
  if (!isAllowedNationalEvaluationSubject(slotKey, subjectId)) subjectId = "";
  if (!subjectId && isAllowedNationalEvaluationSubject(slotKey, legacy.subjectId)) subjectId = asText(legacy.subjectId);
  const evaluationId = subjectId
    ? asText(raw?.evaluationId) || legacyNationalEvaluationId(slotKey, subjectId)
    : "";
  const enabled = subjectId
    ? (typeof raw?.enabled === "boolean" ? raw.enabled : legacy.enabled === true)
    : false;
  return {
    slot: slotKey,
    evaluationId,
    subjectId: subjectId || null,
    enabled,
    startedAt: asText(raw?.startedAt || legacy.startedAt),
    updatedAt: asText(raw?.updatedAt || legacy.updatedAt),
    closedAt: asText(raw?.closedAt || legacy.closedAt)
  };
}

export function normalizeNationalEvaluation(input = {}) {
  const data = input && typeof input === "object" ? input : {};
  const slots = data.slots && typeof data.slots === "object" ? data.slots : {};
  const legacyAssemblyId = isAllowedNationalEvaluationSubject("assembly", data.subjectId) ? asText(data.subjectId) : "";
  const assembly = normalizeSlot("assembly", slots.assembly || {}, {
    subjectId: legacyAssemblyId,
    enabled: legacyAssemblyId ? data.enabled === true : false
  });
  const local = normalizeSlot("local", slots.local || {}, {});
  return {
    ...data,
    enabled: assembly.enabled,
    subjectId: assembly.subjectId,
    slots: { assembly, local },
    results: data.results && typeof data.results === "object" ? data.results : {},
    history: Array.isArray(data.history) ? data.history : [],
    demoMode: data.demoMode === true,
    demoResults: data.demoResults && typeof data.demoResults === "object" ? data.demoResults : {}
  };
}

export function cleanNationalEvaluationVotes(votes = {}) {
  return {
    positive: asCount(votes?.positive),
    neutral: asCount(votes?.neutral),
    negative: asCount(votes?.negative)
  };
}

export function votesForEvaluationSlot(data = {}, slot = {}, { demo = null } = {}) {
  const normalized = normalizeNationalEvaluation(data);
  const useDemo = demo == null ? normalized.demoMode === true : demo === true;
  const liveSource = normalized.results;
  const demoSource = normalized.demoResults;
  const evaluationId = asText(slot?.evaluationId);
  const subjectId = asText(slot?.subjectId);
  const lookup = source => (evaluationId && source?.[evaluationId]) || (subjectId && source?.[subjectId]) || null;
  const raw = (useDemo ? lookup(demoSource) : null) || lookup(liveSource) || EMPTY_VOTES;
  return cleanNationalEvaluationVotes(raw);
}

export function nationalEvaluationTypeLabel(subjectId = "") {
  const id = asText(subjectId);
  if (/^assembly-\d{3}$/.test(id)) return "국회의원";
  if (/^metropolitan-\d{3}$/.test(id)) return "광역단체장";
  if (/^basic-\d{3}$/.test(id)) return "기초단체장";
  return "정치인";
}

export function isLegacyNationalEvaluationSlot(slot = {}) {
  return asText(slot?.evaluationId).startsWith("legacy-");
}
