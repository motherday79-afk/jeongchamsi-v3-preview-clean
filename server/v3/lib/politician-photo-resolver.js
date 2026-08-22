const ROSTER = require("../data/politician-photo-roster.json");

const NEC_SEARCH_URL = "https://info.nec.go.kr/search/searchCandidate.xhtml";
const NEC_HOME = "https://info.nec.go.kr/";
const TIMEOUT_MS = 12000;
const EXPECTED_ELECTION_CODE = Object.freeze({ assembly:"2", metropolitan:"3", basic:"4" });
const ROSTER_BY_ID = new Map(ROSTER.map((person) => [person.id, Object.freeze(person)]));
const sourceCache = globalThis.__JCV3_POLITICIAN_PHOTO_SOURCE_CACHE__ || new Map();
globalThis.__JCV3_POLITICIAN_PHOTO_SOURCE_CACHE__ = sourceCache;

function decodeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'").replace(/&nbsp;/g, " ");
}
function stripTags(value) {
  return decodeHtml(String(value || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function normalize(value) {
  return String(value || "").toLowerCase().replace(/특별자치도|특별자치시|광역시|특별시|통합특별시|시|군|구|읍|면|동|선거|국회의원|시장|도지사/g, "").replace(/[\s·ㆍ,._\-()'"/]/g, "");
}
function attr(attrs, name) {
  const m = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i"));
  return m ? decodeHtml(m[2]) : "";
}
function locationTokens(jurisdiction = "") {
  const raw=String(jurisdiction || "").replace(/[·,]/g," ");
  const chunks=raw.split(/\s+/).filter(Boolean);
  const tokens=new Set();
  for (const chunk of chunks) {
    const n=normalize(chunk);
    if (n.length >= 2) tokens.add(n);
    const stripped=n.replace(/[갑을병정무]$/,"" );
    if (stripped.length >= 2) tokens.add(stripped);
  }
  const full=normalize(raw);
  if (full.length >= 2) tokens.add(full);
  return [...tokens];
}
function absoluteNecUrl(src = "") {
  let value=decodeHtml(String(src || "").trim());
  if (!value) return "";
  if (value.startsWith("//")) value=`https:${value}`;
  else if (value.startsWith("/")) value=new URL(value, NEC_HOME).href;
  else if (!/^https?:\/\//i.test(value)) value=new URL(value, NEC_HOME).href;
  value=value.replace(/^http:\/\/info\.nec\.go\.kr/i,"https://info.nec.go.kr");
  return value;
}
function extractPhotoUrl(cardHtml = "") {
  const urls=[];
  for (const m of String(cardHtml || "").matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1/gi)) urls.push(m[2]);
  for (const m of String(cardHtml || "").matchAll(/url\(\s*(["']?)([^)'"\s]+)\1\s*\)/gi)) urls.push(m[2]);
  const ranked=urls
    .map(absoluteNecUrl)
    .filter(Boolean)
    .map((url) => ({ url, score:(/\/photo_/i.test(url)?100:0)+(/\/Hb\d+/i.test(url)?60:0)+(/thumbnail\./i.test(url)?20:0)+(/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url)?10:0) }))
    .sort((a,b)=>b.score-a.score);
  return ranked[0]?.score >= 80 ? ranked[0].url : "";
}
function splitResultCards(html = "") {
  const source=String(html || "");
  const starts=[];
  const re=/<div\b([^>]*)class=(["'])[^"']*\bresult\b[^"']*\2([^>]*)>/gi;
  let m;
  while ((m=re.exec(source))) starts.push({ index:m.index, attrs:`${m[1] || ""} ${m[3] || ""}`, tag:m[0] });
  return starts.map((start,i)=>({ ...start, html:source.slice(start.index, starts[i+1]?.index ?? source.length) }));
}
function cardName(cardHtml = "") {
  const nameBlock=String(cardHtml).match(/<p\b[^>]*class=(["'])[^"']*\bname\b[^"']*\1[^>]*>([\s\S]*?)<\/p>/i)?.[2] || "";
  return stripTags(nameBlock.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)?.[1] || nameBlock).replace(/\([^)]*\)/g, "").trim();
}
function scoreCard(card, person) {
  const html=card.html || "";
  const text=stripTags(html);
  const expectedCode=EXPECTED_ELECTION_CODE[person.type] || "";
  let score=0;
  const name=cardName(html);
  if (normalize(name) !== normalize(person.name)) return -10000;
  score += 500;
  const codes=[...html.matchAll(/data-election-code\s*=\s*(["'])([^"']+)\1/gi)].map(m=>m[2]);
  if (codes.includes(expectedCode)) score += 220;
  else if (codes.length) score -= 120;
  const ntext=normalize(text);
  const party=normalize(person.party);
  if (party && party !== "무소속" && ntext.includes(party)) score += 60;
  const tokens=locationTokens(person.jurisdiction);
  score += Math.min(160, tokens.filter(token => token && ntext.includes(token)).length * 40);
  if (/당선/.test(text)) score += 35;
  const dates=[...text.matchAll(/\[(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})\]/g)].map(m=>Number(`${m[1]}${String(m[2]).padStart(2,"0")}${String(m[3]).padStart(2,"0")}`));
  if (dates.length) score += Math.min(30, Math.max(...dates) >= 20240000 ? 30 : 10);
  if (extractPhotoUrl(html)) score += 80;
  return score;
}
function resolveNecCandidatePhotoFromHtml(html, person) {
  const cards=splitResultCards(html);
  const ranked=cards.map(card=>({card,score:scoreCard(card,person),photo:extractPhotoUrl(card.html)})).filter(x=>x.photo && x.score > 400).sort((a,b)=>b.score-a.score);
  if (!ranked.length) return null;
  return { sourceUrl:ranked[0].photo, score:ranked[0].score, source:"NEC", matchedName:cardName(ranked[0].card.html) };
}
function upgradedOriginalUrl(url = "") {
  const source=String(url || "");
  if (!/thumbnail\./i.test(source)) return source;
  return source.replace(/\/thumbnail\.([^/]+)$/i,"/$1");
}
async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try { return await fetch(url,{...options,signal:controller.signal}); }
  finally { clearTimeout(timer); }
}
async function resolveNecPhoto(person) {
  const body=new URLSearchParams({ searchKeyword:person.name, pageIndex:"1", firstIndex:"0", recordCountPerPage:"100" }).toString();
  const response=await fetchWithTimeout(NEC_SEARCH_URL,{
    method:"POST",
    headers:{
      "content-type":"application/x-www-form-urlencoded;charset=UTF-8",
      "user-agent":"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/151 Safari/537.36 JCV3PhotoResolver/1.0",
      "referer":NEC_SEARCH_URL,
      "accept":"text/html,application/xhtml+xml"
    },
    body
  });
  if (!response.ok) throw new Error(`NEC_SEARCH_${response.status}`);
  const html=await response.text();
  return resolveNecCandidatePhotoFromHtml(html,person);
}
async function resolvePoliticianPhotoSource(person) {
  const cached=sourceCache.get(person.id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let value=null;
  try { value=await resolveNecPhoto(person); }
  catch (error) { console.warn("[JCV3_PHOTO_NEC_RESOLVE]",person.id,error?.message || error); }
  sourceCache.set(person.id,{ value, expiresAt:Date.now() + (value ? 6*60*60*1000 : 15*60*1000) });
  return value;
}
async function fetchPoliticianPhoto(person, width = 160) {
  const resolved=await resolvePoliticianPhotoSource(person);
  if (!resolved?.sourceUrl) return null;
  const thumbnail=resolved.sourceUrl;
  const preferred=Number(width) >= 256 ? upgradedOriginalUrl(thumbnail) : thumbnail;
  const candidates=[preferred,thumbnail].filter((x,i,a)=>x && a.indexOf(x)===i);
  for (const sourceUrl of candidates) {
    try {
      const response=await fetchWithTimeout(sourceUrl,{
        headers:{
          "user-agent":"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/151 Safari/537.36 JCV3PhotoResolver/1.0",
          "referer":NEC_HOME,
          "accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
        }
      },10000);
      const type=String(response.headers.get("content-type") || "").toLowerCase();
      if (!response.ok || (!type.startsWith("image/") && !/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(sourceUrl))) continue;
      const buffer=Buffer.from(await response.arrayBuffer());
      if (buffer.length < 256) continue;
      return { buffer, contentType:type.startsWith("image/") ? type.split(";")[0] : "image/jpeg", sourceUrl, matched:resolved };
    } catch (error) {
      console.warn("[JCV3_PHOTO_FETCH]",person.id,error?.message || error);
    }
  }
  return null;
}
function getPoliticianById(id) { return ROSTER_BY_ID.get(String(id || "")) || null; }

module.exports={
  NEC_SEARCH_URL,
  getPoliticianById,
  extractPhotoUrl,
  splitResultCards,
  scoreCard,
  resolveNecCandidatePhotoFromHtml,
  upgradedOriginalUrl,
  resolvePoliticianPhotoSource,
  fetchPoliticianPhoto
};
