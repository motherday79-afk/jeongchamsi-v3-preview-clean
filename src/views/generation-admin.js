import { getDomain, saveDomain } from "../core/repository.js";
import { listAllPoliticians, getPersonSlotById } from "../data/person-provider.js";

const AGES = Object.freeze(["10대", "20대", "30대", "40대", "50대", "60대+"]);
const esc = (v = "") => String(v).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const people = listAllPoliticians();
const byId = new Map(people.map(p => [p.id, p]));

function personText(person) {
  if (!person) return "";
  return [person.name, person.party, person.jurisdiction].filter(Boolean).join(" · ");
}
function pickerValue(id = "") {
  const p = byId.get(String(id || ""));
  return p ? `${personText(p)} [${p.id}]` : String(id || "");
}
function displaySource(data, age) {
  if (data?.demoMode === true) return data?.demoResults?.[age] || {};
  const demo = data?.demoResults?.[age] || {};
  return Object.keys(demo).length ? demo : (data?.results?.[age] || {});
}
function resultRows(data, age) {
  const source = displaySource(data, age);
  const rows = Object.entries(source).filter(([,n]) => Number(n || 0) >= 0).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0));
  return rows.length ? rows : [["", 0]];
}
function rowMarkup(id = "", count = 0) {
  return `<div class="generation-admin-row" data-generation-admin-row data-person-id="${esc(id)}"><input class="generation-admin-person" type="text" list="__DATALIST__" value="${esc(pickerValue(id))}" placeholder="정치인 이름 검색" aria-label="정치인"><input class="generation-admin-votes" type="number" min="0" step="1" inputmode="numeric" value="${Math.max(0, Number(count || 0))}" aria-label="표시 표수"><button class="generation-admin-remove" type="button" data-generation-remove-row aria-label="행 삭제">×</button></div>`;
}

export function renderGenerationAdminEditor(data = {}, { context = "page", open = false } = {}) {
  const datalistId = `generation-admin-people-${String(context).replace(/[^a-z0-9_-]/gi,"-")}`;
  const ages = AGES.map(age => {
    const rows = resultRows(data, age).map(([id,count]) => rowMarkup(id,count).replaceAll("__DATALIST__", datalistId)).join("");
    const total = Object.values(displaySource(data, age)).reduce((s,n)=>s+Math.max(0,Number(n||0)),0);
    return `<section class="generation-admin-age" data-generation-age="${esc(age)}"><div class="generation-admin-age-head"><b>${esc(age)}</b><span>현재 합계 ${total.toLocaleString("ko-KR")}표</span></div><div class="generation-admin-rows">${rows}</div><button class="generation-admin-add" type="button" data-generation-add-row>+ 후보 추가</button></section>`;
  }).join("");
  const options = people.map(p => `<option value="${esc(`${personText(p)} [${p.id}]`)}"></option>`).join("");
  return `<details class="generation-admin-editor ${open ? "is-open" : ""}" ${open ? "open" : ""}><summary><span><b>세대뽑 관리</b><small>세대별 표시 숫자를 한 화면에서 수정</small></span><em>관리</em></summary><form data-generation-admin-form><div class="generation-admin-toolbar"><label class="check"><input type="checkbox" name="enabled" ${data.enabled === false ? "" : "checked"}> 사용자 모의투표 참여 활성</label><div><span>숫자를 저장하면 시연용 표시 수치로 바로 적용됩니다</span><button class="ghost-btn" type="button" data-generation-live-mode>실제 참여 집계 사용</button></div></div><div class="generation-admin-grid">${ages}</div><datalist id="${datalistId}">${options}</datalist><div class="generation-admin-actions"><button class="primary-btn" type="submit">세대별 숫자 일괄 저장</button><span class="save-state" data-generation-admin-state>${data.demoMode === true ? "시연 표시 수치 사용 중" : "실제 참여 집계 표시 중"}</span></div></form></details>`;
}

function resolvePersonId(value = "", previousId = "") {
  const raw = String(value || "").trim();
  const bracket = raw.match(/\[((?:assembly|metropolitan|basic)-\d{3})\]\s*$/);
  if (bracket && byId.has(bracket[1])) return bracket[1];
  if (/^(assembly|metropolitan|basic)-\d{3}$/.test(raw) && byId.has(raw)) return raw;
  const exact = people.filter(p => p.name === raw || personText(p) === raw);
  if (exact.length === 1) return exact[0].id;
  if (previousId && byId.has(previousId) && raw === pickerValue(previousId)) return previousId;
  return "";
}

export async function saveGenerationAdminForm(form) {
  const current = await getDomain("generation");
  const demoResults = {};
  for (const section of form.querySelectorAll("[data-generation-age]")) {
    const age = section.dataset.generationAge || "";
    const votes = {};
    for (const row of section.querySelectorAll("[data-generation-admin-row]")) {
      const input = row.querySelector(".generation-admin-person");
      const countInput = row.querySelector(".generation-admin-votes");
      const id = resolvePersonId(input?.value, row.dataset.personId || "");
      const count = Math.max(0, Math.round(Number(countInput?.value || 0)));
      if (!id) {
        if (String(input?.value || "").trim()) return { ok:false, error:`${age} 정치인을 목록에서 선택해 주세요` };
        continue;
      }
      if (count > 0) votes[id] = count;
    }
    demoResults[age] = votes;
  }
  const next = { ...current, enabled: form.querySelector('[name="enabled"]')?.checked !== false, demoMode: true, demoResults };
  return saveDomain("generation", next);
}

export async function useLiveGenerationResults() {
  const current = await getDomain("generation");
  return saveDomain("generation", { ...current, demoMode:false });
}

export function newGenerationAdminRowHtml(datalistId = "") {
  return rowMarkup("",0).replaceAll("__DATALIST__", String(datalistId || ""));
}
