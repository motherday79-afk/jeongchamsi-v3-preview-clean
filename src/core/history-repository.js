async function requestHistory(url) {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) return { ok:false, error:body?.error || `HTTP_${response.status}`, person:null };
    return body;
  } catch (error) {
    return { ok:false, error:error?.code || error?.message || "HISTORY_READ_FAILED", person:null };
  }
}

export async function getAdminHistoryOverview() {
  const result = await requestHistory(`/api/v3/admin/history?r=${Date.now()}`);
  return result?.ok === false
    ? { ...result, snapshotCount:0, roster:[], latestSnapshot:null }
    : result;
}

export async function getAdminHistoryHomeSummary() {
  const result = await requestHistory(`/api/v3/admin/history?summary=home&r=${Date.now()}`);
  return result?.ok === false
    ? { ...result, snapshotCount:0, latestSnapshot:null }
    : result;
}

export async function getAdminHistoryPerson(id, range = "30") {
  const personId = String(id || "").trim();
  if (!personId) return { ok:false, error:"HISTORY_PERSON_REQUIRED", person:null };
  const safeRange = ["7","30","90","365","all"].includes(String(range)) ? String(range) : "30";
  return requestHistory(`/api/v3/admin/history?personId=${encodeURIComponent(personId)}&range=${encodeURIComponent(safeRange)}&r=${Date.now()}`);
}

export async function getAdminHistoryPersonDetail(id, range = "30") {
  const personId = String(id || "").trim();
  if (!personId) return { ok:false, error:"HISTORY_PERSON_REQUIRED", person:null };
  const safeRange = ["7","30","90","365","all"].includes(String(range)) ? String(range) : "30";
  return requestHistory(`/api/v3/admin/history?personId=${encodeURIComponent(personId)}&range=${encodeURIComponent(safeRange)}&view=detail&r=${Date.now()}`);
}


export async function getAdminHistoryCompare(ids = [], range = "30") {
  const personIds = [...new Set((Array.isArray(ids) ? ids : []).map(x => String(x || "").trim()).filter(Boolean))].slice(0,5);
  if (personIds.length < 2) return { ok:false, error:"COMPARE_MIN_2_REQUIRED", people:[] };
  const safeRange = ["7","30","90","365","all"].includes(String(range)) ? String(range) : "30";
  return requestHistory(`/api/v3/admin/history?view=compare&personIds=${encodeURIComponent(personIds.join(","))}&range=${encodeURIComponent(safeRange)}&r=${Date.now()}`);
}
