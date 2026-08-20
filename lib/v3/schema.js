const DOMAINS = new Set(["columns","community","news","polls","academy","generation","nationalEvaluation","itsme"]);
function defaultDomain(domain){
  if (["columns","community","news","polls"].includes(domain)) return { items: [] };
  if (domain === "academy") return { courses: [], slots: [] };
  if (domain === "generation") return { enabled:false, title:"세대가 뽑은 대통령", candidates:[] };
  if (domain === "nationalEvaluation") return { enabled:false, subjectId:null, title:"국회의원 전국 평가제" };
  if (domain === "itsme") return { cards:[] };
  return { items:[] };
}
function validDomain(domain){ return DOMAINS.has(domain); }
function sanitize(domain,data){
  const raw = JSON.stringify(data || defaultDomain(domain));
  if (Buffer.byteLength(raw,"utf8") > 512*1024) { const e=new Error("PAYLOAD_TOO_LARGE"); e.code="PAYLOAD_TOO_LARGE"; throw e; }
  return JSON.parse(raw);
}
module.exports = { validDomain, defaultDomain, sanitize };
