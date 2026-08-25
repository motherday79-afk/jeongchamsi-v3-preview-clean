const ROSTER = require("../data/politician-photo-roster.json");

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const COMMONS_HOME = "https://commons.wikimedia.org/";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIPEDIA_KO_API = "https://ko.wikipedia.org/w/api.php";
const TIMEOUT_MS = 10000;
const USER_AGENT = "JCV3-Wikimedia-Politician-Photo/0.36.64 (https://commons.wikimedia.org/)";

const ROSTER_BY_ID = new Map(ROSTER.map((person) => [person.id, Object.freeze(person)]));
const sourceCache = globalThis.__JCV3_WIKIMEDIA_POLITICIAN_PHOTO_SOURCE_CACHE_03664__ || new Map();
globalThis.__JCV3_WIKIMEDIA_POLITICIAN_PHOTO_SOURCE_CACHE_03664__ = sourceCache;

/* Existing ten visible photos are retained only as verified Wikimedia Commons seeds.
 * They now travel through the exact same /api/v3/politician-photo route as everybody else.
 */
const VERIFIED_COMMONS_SEEDS = Object.freeze({
  "assembly-001": { filename:"Kim_Min-seok_20250807.jpg", page:"https://commons.wikimedia.org/wiki/File:Kim_Min-seok_20250807.jpg" },
  "assembly-002": { filename:"Jung_Chung-rae's_Portrait_(2026.6).png", page:"https://commons.wikimedia.org/wiki/File:Jung_Chung-rae%27s_Portrait_(2026.6).png" },
  "assembly-003": { filename:"Jang_Dong-hyeok's_Portrait_(2026.5).png", page:"https://commons.wikimedia.org/wiki/File:Jang_Dong-hyeok%27s_Portrait_(2026.5).png" },
  "assembly-004": { filename:"Song_Young-gil.jpg", page:"https://commons.wikimedia.org/wiki/File:Song_Young-gil.jpg" },
  "assembly-005": { filename:"Han_Dong-hoon's_Portrait_(2025).png", page:"https://commons.wikimedia.org/wiki/File:Han_Dong-hoon%27s_Portrait_(2025).png" },
  "assembly-006": { filename:"Na_Kyung-won_2019.jpg", page:"https://commons.wikimedia.org/wiki/File:Na_Kyung-won_2019.jpg" },
  "assembly-007": { filename:"Park_Ju-Min_벙커1_특강_니가_가라_여의도_01.png", page:"https://commons.wikimedia.org/wiki/File:Park_Ju-Min_%EB%B2%99%EC%BB%A41_%ED%8A%B9%EA%B0%95_%EB%8B%88%EA%B0%80_%EA%B0%80%EB%9D%BC_%EC%97%AC%EC%9D%98%EB%8F%84_01.png" },
  "assembly-008": { filename:"Ahn_Cheol-Soo's_Portrait_(2025).png", page:"https://commons.wikimedia.org/wiki/File:Ahn_Cheol-Soo%27s_Portrait_(2025).png" },
  "assembly-009": { filename:"전현희5*7.jpg", page:"https://commons.wikimedia.org/wiki/File:%EC%A0%84%ED%98%84%ED%9D%AC5%2A7.jpg" },
  "assembly-010": { filename:"Army_(ROKA)_General_Kim_Byung-joo_육군대장_김병주_(USFK_photo_170811-A-PI620-204_Combined_Forces_Command_change_of_responsibility).jpg", page:"https://commons.wikimedia.org/wiki/File:Army_(ROKA)_General_Kim_Byung-joo_%EC%9C%A1%EA%B5%B0%EB%8C%80%EC%9E%A5_%EA%B9%80%EB%B3%91%EC%A3%BC_(USFK_photo_170811-A-PI620-204_Combined_Forces_Command_change_of_responsibility).jpg" }
});

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&[^;]+;/g, " ")
    .replace(/특별자치도|특별자치시|광역시|특별시|통합특별시|대한민국|국회의원|구청장|시장|군수|도지사|정치인/g, "")
    .replace(/[\s·ㆍ,._\-()'"/\\:*?<>|\[\]{}]/g, "");
}
function htmlText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/gi, "'")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}
function compactRegionTokens(jurisdiction = "") {
  const raw=String(jurisdiction || "").replace(/[·,]/g," ");
  const out=new Set();
  for (const chunk of raw.split(/\s+/).filter(Boolean)) {
    const clean=normalize(chunk).replace(/[갑을병정무]$/," ").trim();
    if (clean.length >= 2) out.add(clean);
    const base=clean.replace(/(?:시|군|구|도)$/," ").trim();
    if (base.length >= 2) out.add(base);
  }
  return [...out];
}
function officeWords(person) {
  if (person.type === "assembly") return ["국회의원","의원","national assembly","politician"];
  if (person.type === "metropolitan") return ["시장","도지사","광역","governor","mayor","politician"];
  return ["구청장","시장","군수","mayor","county","district","politician"];
}
function identityOfficeWords(person = {}) {
  if (person.type === "assembly") return ["국회의원","national assembly member","member of the national assembly","national assembly"];
  if (person.type === "metropolitan") return ["특별시장","광역시장","시장","도지사","특별자치도지사","mayor","governor"];
  const jurisdiction=String(person.jurisdiction || "");
  if (/군(?:\s|$)/.test(jurisdiction) || /군$/.test(jurisdiction)) return ["군수","county mayor","county head"];
  if (/구(?:\s|$)/.test(jurisdiction) || /구$/.test(jurisdiction)) return ["구청장","district mayor","district head"];
  return ["시장","mayor"];
}
function commonsFilePage(filename = "") {
  const clean=String(filename || "").replace(/^File:/i, "").trim();
  return clean ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(clean.replace(/ /g,"_"))}` : "";
}
function commonsRedirectUrl(filename = "") {
  const clean=String(filename || "").replace(/^File:/i, "").trim();
  return clean ? `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(clean.replace(/ /g,"_"))}` : "";
}
function isCommonsPage(url = "") {
  try { return new URL(url).hostname === "commons.wikimedia.org"; }
  catch { return false; }
}
function isWikimediaImageUrl(url = "") {
  try {
    const host=new URL(url).hostname;
    return host === "upload.wikimedia.org" || host === "commons.wikimedia.org";
  } catch { return false; }
}
function acceptedMime(mime = "", filename = "") {
  const m=String(mime || "").toLowerCase();
  if (m && !["image/jpeg","image/png","image/webp"].includes(m)) return false;
  return /\.(?:jpe?g|png|webp)$/i.test(String(filename || "").split("?")[0]);
}
function rejectTitle(title = "") {
  return /(?:signature|사인|서명|logo|로고|emblem|symbol|map|diagram|poster|banner|webm|ogg|svg)$/i.test(String(title || "")) || /(?:signature|사인|서명|logo|로고)/i.test(String(title || ""));
}
async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try {
    return await fetch(url,{...options,signal:controller.signal,headers:{"user-agent":USER_AGENT,"accept-language":"ko,en;q=0.8",...(options.headers || {})}});
  } finally { clearTimeout(timer); }
}
async function jsonGet(base, params, timeoutMs = TIMEOUT_MS) {
  const url=new URL(base);
  for (const [key,value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key,String(value));
  }
  const response=await fetchWithTimeout(url.href,{headers:{accept:"application/json"}},timeoutMs);
  if (!response.ok) throw new Error(`HTTP_${response.status}_${url.hostname}`);
  return response.json();
}
function personContextText(person) {
  return [person.name,person.party,person.jurisdiction,...officeWords(person)].filter(Boolean).join(" ");
}
function identityEvidence(person, value = "") {
  const text=htmlText(value);
  const ntext=normalize(text);
  const nameHit=exactNameHit(text,person?.name);
  const party=normalize(person?.party);
  const partyHit=Boolean(party && party !== "무소속" && ntext.includes(party));
  const regionTokens=compactRegionTokens(person?.jurisdiction);
  const regionHits=regionTokens.filter((token)=>token && ntext.includes(token));
  const officeHit=identityOfficeWords(person || {}).some((word)=>String(text).toLowerCase().includes(String(word).toLowerCase()));
  const partyRequired=Boolean(party && party !== "무소속");
  const strong=Boolean(nameHit && officeHit && regionHits.length > 0 && (!partyRequired || partyHit));
  return { strong,nameHit,partyHit,regionHits,officeHit };
}
function evidenceLabels(evidence = {}) {
  const out=[];
  if (evidence.nameHit) out.push("이름 일치");
  if (evidence.partyHit) out.push("정당 일치");
  if (evidence.regionHits?.length) out.push(`지역 일치: ${evidence.regionHits.join(", ")}`);
  if (evidence.officeHit) out.push("직위 문맥 일치");
  return out;
}
async function wikipediaIntro(title = "") {
  if (!title) return "";
  try {
    const data=await jsonGet(WIKIPEDIA_KO_API,{action:"query",format:"json",formatversion:"2",redirects:"1",titles:title,prop:"extracts",exintro:"1",explaintext:"1"});
    return String(data?.query?.pages?.find?.((page)=>!page?.missing)?.extract || "");
  } catch { return ""; }
}
function exactNameHit(text, name) {
  const raw=htmlText(text);
  if (!raw || !name) return false;
  return raw.includes(name) || normalize(raw).includes(normalize(name));
}
function candidateText(page) {
  const info=page?.imageinfo?.[0] || {};
  const meta=info.extmetadata || {};
  const vals=[page?.title,meta.ImageDescription?.value,meta.ObjectName?.value,meta.Categories?.value,meta.Credit?.value,meta.Artist?.value];
  return htmlText(vals.filter(Boolean).join(" "));
}
function scoreCommonsPage(page, person, queryRank = 0) {
  const info=page?.imageinfo?.[0] || {};
  const filename=String(page?.title || "").replace(/^File:/i,"");
  if (!acceptedMime(info.mime,filename) || rejectTitle(filename)) return -10000;
  if (!isWikimediaImageUrl(info.url || "") || !isCommonsPage(info.descriptionurl || commonsFilePage(filename))) return -10000;
  const text=candidateText(page);
  const ntext=normalize(text);
  let score=100 - queryRank*8;
  if (exactNameHit(text,person.name)) score += 420;
  else score -= 180;
  const evidence=identityEvidence(person,text);
  if (!evidence.strong) return -10000;
  if (evidence.partyHit) score += 75;
  score += evidence.regionHits.length * 32;
  if (evidence.officeHit) score += 55;
  const w=Number(info.width || 0), h=Number(info.height || 0);
  if (w >= 220 && h >= 220) score += 30;
  if (w && h) {
    const ratio=w/h;
    if (ratio >= 0.52 && ratio <= 1.25) score += 35;
    else if (ratio > 1.75) score -= 25;
  }
  return score;
}
async function commonsSearch(person) {
  const queries=[
    `"${person.name}" ${officeWords(person)[0]} ${person.party || ""} ${String(person.jurisdiction || "").split(/\s+/).slice(0,2).join(" ")}`.trim(),
    `"${person.name}" 정치인`
  ];
  const seen=new Set();
  const ranked=[];
  for (let qi=0; qi<queries.length; qi += 1) {
    let data;
    try {
      data=await jsonGet(COMMONS_API,{
        action:"query",format:"json",formatversion:"2",generator:"search",gsrnamespace:"6",gsrsearch:queries[qi],gsrlimit:"8",
        prop:"imageinfo",iiprop:"url|mime|size|extmetadata"
      });
    } catch (error) {
      console.warn("[JCV3_COMMONS_SEARCH]",person.id,queries[qi],error?.message || error);
      continue;
    }
    for (const page of data?.query?.pages || []) {
      const key=String(page?.title || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const score=scoreCommonsPage(page,person,qi);
      if (score > 360) ranked.push({page,score,query:queries[qi]});
    }
    if (ranked.some((x)=>x.score >= 560)) break;
  }
  ranked.sort((a,b)=>b.score-a.score);
  const top=ranked[0];
  if (!top) return null;
  const info=top.page.imageinfo?.[0] || {};
  const filename=String(top.page.title || "").replace(/^File:/i,"");
  return {
    source:"WIKIMEDIA_COMMONS_SEARCH",
    filename,
    sourceUrl:info.url,
    sourcePage:info.descriptionurl || commonsFilePage(filename),
    matchedName:person.name,
    score:top.score,
    verification:[`Commons 검색: ${top.query}`,`신원 문맥 점수 ${top.score}`,...evidenceLabels(identityEvidence(person,candidateText(top.page)))]
  };
}
function rankWikidataSearchRow(row, person) {
  if (!row || normalize(row.label) !== normalize(person.name)) return -10000;
  const text=[row.label,row.description,row.match?.text,row.aliases?.join?.(" ")].filter(Boolean).join(" ");
  let score=400;
  if (/(politician|정치인|국회의원|의원|시장|도지사|구청장|군수|mayor|governor)/i.test(text)) score += 180;
  for (const token of compactRegionTokens(person.jurisdiction)) if (normalize(text).includes(token)) score += 35;
  if (person.party && normalize(text).includes(normalize(person.party))) score += 45;
  return score;
}
async function wikidataEntityImage(person) {
  let search;
  try {
    search=await jsonGet(WIKIDATA_API,{action:"wbsearchentities",format:"json",language:"ko",uselang:"ko",type:"item",limit:"10",search:person.name});
  } catch (error) {
    console.warn("[JCV3_WIKIDATA_SEARCH]",person.id,error?.message || error);
    return null;
  }
  const ranked=(search?.search || []).map((row)=>({row,score:rankWikidataSearchRow(row,person)})).filter((x)=>x.score >= 520).sort((a,b)=>b.score-a.score).slice(0,4);
  if (!ranked.length) return null;
  const ids=ranked.map((x)=>x.row.id).join("|");
  let entityData;
  try {
    entityData=await jsonGet(WIKIDATA_API,{action:"wbgetentities",format:"json",ids,props:"claims|sitelinks",languages:"ko"});
  } catch { return null; }
  for (const entry of ranked) {
    const entity=entityData?.entities?.[entry.row.id];
    const filename=entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!filename || !acceptedMime("",filename) || rejectTitle(filename)) continue;
    const koTitle=entity?.sitelinks?.kowiki?.title || "";
    if (!koTitle || !normalize(koTitle).includes(normalize(person.name))) continue;
    const intro=await wikipediaIntro(koTitle);
    const evidence=identityEvidence(person,[koTitle,entry.row.description,intro].filter(Boolean).join(" "));
    if (!evidence.strong) continue;
    return {
      source:"WIKIMEDIA_COMMONS_WIKIDATA_P18",
      filename,
      sourceUrl:commonsRedirectUrl(filename),
      sourcePage:commonsFilePage(filename),
      matchedName:person.name,
      score:entry.score + 80,
      verification:[`Wikidata ${entry.row.id}: ${entry.row.description || "정치인 항목"}`,`한국어 위키백과: ${koTitle}`,...evidenceLabels(evidence)]
    };
  }
  return null;
}
async function wikipediaEntityImage(person) {
  const titles=[`${person.name} (정치인)`,`${person.name} (대한민국의 정치인)`,person.name];
  let data;
  try {
    data=await jsonGet(WIKIPEDIA_KO_API,{action:"query",format:"json",formatversion:"2",redirects:"1",titles:titles.join("|"),prop:"pageprops|extracts",exintro:"1",explaintext:"1"});
  } catch { return null; }
  const pages=(data?.query?.pages || []).filter((page)=>!page?.missing && page?.pageprops?.wikibase_item && normalize(page.title).includes(normalize(person.name)));
  if (!pages.length) return null;
  const ids=[...new Set(pages.map((page)=>page.pageprops.wikibase_item))].join("|");
  let entityData;
  try { entityData=await jsonGet(WIKIDATA_API,{action:"wbgetentities",format:"json",ids,props:"claims|descriptions",languages:"ko"}); }
  catch { return null; }
  for (const page of pages) {
    const qid=page.pageprops.wikibase_item;
    const entity=entityData?.entities?.[qid];
    const description=entity?.descriptions?.ko?.value || "";
    const evidence=identityEvidence(person,[page.title,description,page.extract].filter(Boolean).join(" "));
    if (!evidence.strong) continue;
    const filename=entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!filename || !acceptedMime("",filename) || rejectTitle(filename)) continue;
    return {
      source:"WIKIMEDIA_COMMONS_WIKIPEDIA_P18",
      filename,
      sourceUrl:commonsRedirectUrl(filename),
      sourcePage:commonsFilePage(filename),
      matchedName:person.name,
      score:700,
      verification:[`한국어 위키백과: ${page.title}`,description ? `Wikidata ${qid}: ${description}` : `Wikidata ${qid} P18 → Wikimedia Commons`,...evidenceLabels(evidence)]
    };
  }
  return null;
}
function seedResult(person) {
  const seed=VERIFIED_COMMONS_SEEDS[person.id];
  if (!seed) return null;
  return {
    source:"WIKIMEDIA_COMMONS_VERIFIED_SEED",
    filename:seed.filename,
    sourceUrl:commonsRedirectUrl(seed.filename),
    sourcePage:seed.page || commonsFilePage(seed.filename),
    matchedName:person.name,
    score:1000,
    verification:["0.36.33에서 이미 화면 검증된 Wikimedia Commons 사진","0.36.34 공통 Commons 경로로 통합"]
  };
}
async function resolvePoliticianPhotoSource(person) {
  const cached=sourceCache.get(person.id);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value=seedResult(person);
  if (!value) value=await wikidataEntityImage(person);
  if (!value) value=await wikipediaEntityImage(person);
  if (!value) value=await commonsSearch(person);

  sourceCache.set(person.id,{value,expiresAt:Date.now() + (value ? 24*60*60*1000 : 30*60*1000)});
  return value;
}
async function fetchPoliticianPhoto(person, width = 160) {
  const resolved=await resolvePoliticianPhotoSource(person);
  if (!resolved?.sourceUrl || !isWikimediaImageUrl(resolved.sourceUrl)) return null;
  const targetWidth=Math.max(64,Math.min(768,Number(width) || 160));
  const deliveryUrl=resolved.filename
    ? `${commonsRedirectUrl(resolved.filename)}?width=${targetWidth}`
    : resolved.sourceUrl;
  try {
    const response=await fetchWithTimeout(deliveryUrl,{headers:{accept:"image/avif,image/webp,image/apng,image/*,*/*;q=0.8",referer:resolved.sourcePage || COMMONS_HOME}},12000);
    const finalUrl=response.url || resolved.sourceUrl;
    const type=String(response.headers.get("content-type") || "").toLowerCase().split(";")[0];
    if (!response.ok || !type.startsWith("image/") || !isWikimediaImageUrl(finalUrl)) return null;
    const buffer=Buffer.from(await response.arrayBuffer());
    if (buffer.length < 512) return null;
    return {buffer,contentType:type,sourceUrl:finalUrl,matched:resolved};
  } catch (error) {
    console.warn("[JCV3_COMMONS_FETCH]",person.id,error?.message || error);
    return null;
  }
}
function getPoliticianById(id) { return ROSTER_BY_ID.get(String(id || "")) || null; }

module.exports={
  COMMONS_API,
  WIKIDATA_API,
  WIKIPEDIA_KO_API,
  VERIFIED_COMMONS_SEEDS,
  getPoliticianById,
  normalize,
  compactRegionTokens,
  identityEvidence,
  commonsFilePage,
  commonsRedirectUrl,
  acceptedMime,
  rejectTitle,
  scoreCommonsPage,
  rankWikidataSearchRow,
  resolvePoliticianPhotoSource,
  fetchPoliticianPhoto
};
