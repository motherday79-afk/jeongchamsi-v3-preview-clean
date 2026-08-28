const { put, del } = require("@vercel/blob");
const ROSTER = require("../data/politician-photo-roster.json");
const { getPoliticianById, fetchPoliticianPhoto, resolvePoliticianPhotoSource } = require("../lib/politician-photo-resolver");
const { discoverOfficialCandidates, fetchWithTimeout, publicHttpsUrl, officialHostAllowed, naverCredentials } = require("../lib/politician-photo-official");
const { discoverDirectCandidates } = require("../lib/politician-photo-direct");
const { getJSON, setJSON } = require("../../../lib/v3/redis");
const { requireAdmin } = require("../../../lib/v3/access");
const { blobToken } = require("../../../lib/v3/blob");
const { sanitize } = require("../../../lib/v3/schema");
const { mergePoliticianPhotoAssets } = require("../lib/politician-photo-assets");

const ALLOWED_WIDTHS = new Set([64,96,128,160,256,384]);
const MAX_ASSET_BYTES = 128 * 1024;
const MAX_REVIEW_SOURCE_BYTES = 5 * 1024 * 1024;
const LIVE_PHOTO_CACHE_CONTROL = "private, no-store, max-age=0";
const REVIEW_KEY = "politicianPhotoReview03668";
const LEGACY_REVIEW_KEY = "politicianPhotoReview03667";
const AUTO_VARIANT_PLANS = [
  { mini:96, card:192, profile:384 },
  { mini:96, card:160, profile:320 },
  { mini:80, card:144, profile:256 }
];
const PHOTO_TARGETS = ROSTER.filter((person) => person?.id && person.id !== "assembly-300");
const TARGET_BY_ID = new Map(PHOTO_TARGETS.map(person => [person.id,person]));

const manualCache = globalThis.__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE_03667__ || { at:0, items:new Map() };
globalThis.__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE_03667__ = manualCache;

function invalidateManualPhotoCache() {
  manualCache.at = 0;
  manualCache.items = new Map();
}

function blobPhotoUrl(url = "") {
  try {
    const host = new URL(String(url || "")).hostname.toLowerCase();
    return host.endsWith(".blob.vercel-storage.com") || host.endsWith(".public.blob.vercel-storage.com");
  } catch { return false; }
}

async function getPhotoAssets() {
  return mergePoliticianPhotoAssets(await getJSON("politicianPhotos").catch(()=>null));
}

async function manualPhoto(id, width) {
  if (Date.now() - manualCache.at > 10000) {
    try {
      const data = await getPhotoAssets();
      manualCache.items = new Map((data?.items || []).map(item => [String(item.id || ""), item]));
      manualCache.at = Date.now();
    } catch { manualCache.at = Date.now(); }
  }
  const item = manualCache.items.get(String(id || ""));
  if (item?.variants) {
    const key = width <= 96 ? "mini" : width <= 256 ? "card" : "profile";
    const url = String(item.variants[key] || item.variants.profile || item.variants.card || item.variants.mini || "").trim();
    const sourceType = String(item.sourceType || "manual");
    const packaged = sourceType === "seed-local" || sourceType === "seed-external";
    if (url && (blobPhotoUrl(url) || (packaged && (url.startsWith("/assets/") || /^https:\/\//.test(url))))) {
      return { url, updatedAt:String(item.updatedAt || ""), sourceType };
    }
  }
  return null;
}

function contentExt(contentType = "") {
  const type=String(contentType || "").toLowerCase();
  return type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
}

async function fetchAutoVariants(person) {
  for (const plan of AUTO_VARIANT_PLANS) {
    const entries=[];
    let matched=null;
    let failed=false;
    for (const [key,width] of Object.entries(plan)) {
      const photo=await fetchPoliticianPhoto(person,width);
      if (!photo?.buffer?.length) { failed=true; break; }
      if (!matched) matched=photo.matched;
      if (matched?.sourcePage && photo.matched?.sourcePage && matched.sourcePage !== photo.matched.sourcePage) { failed=true; break; }
      entries.push([key,{...photo,width}]);
    }
    if (failed || entries.length !== 3) continue;
    const total=entries.reduce((sum,[,photo])=>sum + photo.buffer.length,0);
    if (total <= MAX_ASSET_BYTES) return { entries,total,matched,plan };
  }
  return null;
}

async function putAutoVariants(person, fetched, token) {
  const uploaded=[];
  const variants={};
  const bytes={};
  const stamp=Date.now().toString(36);
  try {
    for (const [key,photo] of fetched.entries) {
      const ext=contentExt(photo.contentType);
      const blob=await put(`jcv3/politician/auto/${person.id}/${stamp}-${key}.${ext}`,photo.buffer,{
        access:"public", contentType:photo.contentType || "image/jpeg", addRandomSuffix:true, token
      });
      uploaded.push(blob.url);
      variants[key]=blob.url;
      bytes[key]=photo.buffer.length;
    }
    bytes.total=bytes.mini + bytes.card + bytes.profile;
    return { variants,bytes,uploaded };
  } catch (error) {
    if (uploaded.length) await del(uploaded,{token}).catch(()=>{});
    throw error;
  }
}

async function saveAutoRecord(person, source, uploaded, token) {
  const latest=await getPhotoAssets();
  const latestItems=Array.isArray(latest.items) ? latest.items : [];
  if (latestItems.some((item)=>String(item.id) === person.id)) {
    await del(uploaded.uploaded,{token}).catch(()=>{});
    return { saved:false,reason:"EXISTING_ASSET" };
  }
  const now=new Date().toISOString();
  const record={
    id:person.id, variants:uploaded.variants, bytes:uploaded.bytes, original:{width:0,height:0,size:0}, focus:"50% 28%",
    sourceType:"auto-wikimedia", verified:true, sourcePage:String(source?.sourcePage || ""), sourceUrl:String(source?.sourceUrl || ""),
    matchScore:Number(source?.score || 0), verification:Array.isArray(source?.verification) ? source.verification : [], assetizedAt:now, updatedAt:now
  };
  const next=sanitize("politicianPhotos",{items:[record,...latestItems]});
  const persisted=next.items.find((item)=>item.id === person.id);
  if (!persisted) {
    await del(uploaded.uploaded,{token}).catch(()=>{});
    return { saved:false,reason:"SCHEMA_REJECTED" };
  }
  await setJSON("politicianPhotos",next);
  invalidateManualPhotoCache();
  return { saved:true,record:persisted };
}

function cleanReviewCandidate(candidate = {}) {
  const url=String(candidate.url || "").slice(0,1400);
  const sourcePage=String(candidate.sourcePage || "").slice(0,1400);
  if (!publicHttpsUrl(url) || !publicHttpsUrl(sourcePage) || !officialHostAllowed(sourcePage)) return null;
  return {
    url, sourcePage, provider:String(candidate.provider || "official-web").slice(0,80), score:Math.max(0,Math.round(Number(candidate.score || 0))),
    sourceKind:String(candidate.sourceKind || "official-profile-page").slice(0,60),
    confidence:["strong","visual-review"].includes(String(candidate.confidence || "")) ? String(candidate.confidence) : "strong",
    licenseHint:String(candidate.licenseHint || "").slice(0,260),
    verification:(Array.isArray(candidate.verification) ? candidate.verification : []).slice(0,8).map(x=>String(x || "").slice(0,260)).filter(Boolean)
  };
}

async function reviewState() {
  let raw=await getJSON(REVIEW_KEY).catch(()=>null);
  if (!raw?.items?.length) {
    const legacy=await getJSON(LEGACY_REVIEW_KEY).catch(()=>null);
    if (legacy?.items?.length) raw=legacy;
  }
  return { version:"03668", updatedAt:String(raw?.updatedAt || ""), items:Array.isArray(raw?.items) ? raw.items.slice(0,542) : [] };
}
async function saveReviewMap(map) {
  const data={version:"03668",updatedAt:new Date().toISOString(),items:[...map.values()].slice(0,542)};
  await setJSON(REVIEW_KEY,data);
  return data;
}
function reviewRecord(person,status,extra={}) {
  return {
    id:person.id,name:person.name,type:person.type,party:person.party || "",jurisdiction:person.jurisdiction || "",
    status,reason:String(extra.reason || status),candidates:(extra.candidates || []).map(cleanReviewCandidate).filter(Boolean).slice(0,3),
    lastFailure:String(extra.lastFailure || "").slice(0,60),failureDetail:String(extra.failureDetail || "").slice(0,240),
    detail:String(extra.detail || "").slice(0,240),updatedAt:new Date().toISOString()
  };
}

async function harvestBatch(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const token=blobToken();
  if (!token) return res.status(503).json({ok:false,error:"BLOB_STORAGE_NOT_CONFIGURED"});
  const cursor=Math.max(0,Math.min(PHOTO_TARGETS.length,Math.floor(Number(req.body?.cursor || 0))));
  const limit=Math.max(1,Math.min(5,Math.floor(Number(req.body?.limit || 5))));
  const batch=PHOTO_TARGETS.slice(cursor,cursor + limit);
  const initial=await getPhotoAssets();
  const existing=new Map((initial.items || []).map((item)=>[String(item.id || ""),item]));
  const results=[];

  for (const person of batch) {
    if (existing.has(person.id)) { results.push({id:person.id,name:person.name,status:"existing"}); continue; }
    try {
      const source=await resolvePoliticianPhotoSource(person);
      if (!source) { results.push({id:person.id,name:person.name,status:"unresolved"}); continue; }
      const fetched=await fetchAutoVariants(person);
      if (!fetched) { results.push({id:person.id,name:person.name,status:"too-large-or-fetch-failed"}); continue; }
      const uploaded=await putAutoVariants(person,fetched,token);
      const saved=await saveAutoRecord(person,source,uploaded,token);
      if (!saved.saved) { results.push({id:person.id,name:person.name,status:"existing"}); continue; }
      existing.set(person.id,saved.record);
      results.push({id:person.id,name:person.name,status:"assetized",bytes:saved.record.bytes?.total || 0,source:source.source || "WIKIMEDIA"});
    } catch (error) {
      console.warn("[JCV3_PHOTO_ASSETIZE]",person.id,error?.message || error);
      results.push({id:person.id,name:person.name,status:"failed",error:String(error?.message || "AUTO_ASSETIZE_FAILED")});
    }
  }
  const nextCursor=Math.min(PHOTO_TARGETS.length,cursor + batch.length);
  const summary=results.reduce((acc,item)=>{acc[item.status]=(acc[item.status] || 0)+1; return acc;},{});
  return res.status(200).json({ok:true,cursor,nextCursor,total:PHOTO_TARGETS.length,done:nextCursor >= PHOTO_TARGETS.length,summary,results});
}

async function discoverBatch(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const token=blobToken();
  if (!token) return res.status(503).json({ok:false,error:"BLOB_STORAGE_NOT_CONFIGURED"});
  const cursor=Math.max(0,Math.min(PHOTO_TARGETS.length,Math.floor(Number(req.body?.cursor || 0))));
  const limit=Math.max(1,Math.min(3,Math.floor(Number(req.body?.limit || 1))));
  const batch=PHOTO_TARGETS.slice(cursor,cursor + limit);
  const assets=await getPhotoAssets();
  const existing=new Map((assets.items || []).map(item=>[String(item.id || ""),item]));
  const review=await reviewState();
  const reviewMap=new Map(review.items.map(item=>[String(item.id || ""),item]));
  const results=[];

  for (const person of batch) {
    if (existing.has(person.id)) {
      reviewMap.set(person.id,reviewRecord(person,"existing"));
      results.push({id:person.id,name:person.name,status:"existing"});
      continue;
    }
    try {
      const source=await resolvePoliticianPhotoSource(person);
      if (source) {
        const fetched=await fetchAutoVariants(person);
        if (fetched) {
          const uploaded=await putAutoVariants(person,fetched,token);
          const saved=await saveAutoRecord(person,source,uploaded,token);
          if (saved.saved) {
            existing.set(person.id,saved.record);
            reviewMap.set(person.id,reviewRecord(person,"assetized",{reason:"wikimedia-verified"}));
            results.push({id:person.id,name:person.name,status:"assetized",source:"wikimedia"});
            continue;
          }
        }
      }
      const official=await discoverOfficialCandidates(person);
      const status=official?.candidates?.length ? "candidate-review" : String(official?.reason || "no-candidate");
      const record=reviewRecord(person,status,{reason:status,candidates:official?.candidates || [],detail:official?.detail || ""});
      reviewMap.set(person.id,record);
      results.push({id:person.id,name:person.name,status,candidateCount:record.candidates.length});
    } catch (error) {
      const record=reviewRecord(person,"source-fetch-failed",{detail:error?.message || "STAGE2_DISCOVERY_FAILED"});
      reviewMap.set(person.id,record);
      results.push({id:person.id,name:person.name,status:"source-fetch-failed"});
    }
  }
  await saveReviewMap(reviewMap);
  const nextCursor=Math.min(PHOTO_TARGETS.length,cursor + batch.length);
  const summary=results.reduce((acc,item)=>{acc[item.status]=(acc[item.status] || 0)+1; return acc;},{});
  return res.status(200).json({ok:true,cursor,nextCursor,total:PHOTO_TARGETS.length,done:nextCursor>=PHOTO_TARGETS.length,summary,results});
}

async function directDiscoverBatch(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const cursor=Math.max(0,Math.min(PHOTO_TARGETS.length,Math.floor(Number(req.body?.cursor || 0))));
  const limit=Math.max(1,Math.min(2,Math.floor(Number(req.body?.limit || 1))));
  const batch=PHOTO_TARGETS.slice(cursor,cursor + limit);
  const assets=await getPhotoAssets();
  const existing=new Map((assets.items || []).map(item=>[String(item.id || ""),item]));
  const review=await reviewState();
  const reviewMap=new Map(review.items.map(item=>[String(item.id || ""),item]));
  const results=[];

  for (const person of batch) {
    if (existing.has(person.id)) {
      reviewMap.set(person.id,reviewRecord(person,"existing",{reason:"existing-asset"}));
      results.push({id:person.id,name:person.name,status:"existing"});
      continue;
    }
    try {
      const direct=await discoverDirectCandidates(person);
      const status=direct?.candidates?.length ? "candidate-review" : String(direct?.reason || "direct-no-candidate");
      const record=reviewRecord(person,status,{
        reason:status,candidates:direct?.candidates || [],detail:direct?.detail || ""
      });
      record.stage="direct-source-03668";
      record.pagesChecked=Math.max(0,Math.round(Number(direct?.pagesChecked || 0)));
      record.sourceFailures=Math.max(0,Math.round(Number(direct?.sourceFailures || 0)));
      record.identityRejected=Math.max(0,Math.round(Number(direct?.identityRejected || 0)));
      reviewMap.set(person.id,record);
      results.push({
        id:person.id,name:person.name,status,candidateCount:record.candidates.length,
        strong:record.candidates.filter(x=>x.confidence==="strong").length,
        visualReview:record.candidates.filter(x=>x.confidence==="visual-review").length,
        pagesChecked:record.pagesChecked
      });
    } catch (error) {
      const record=reviewRecord(person,"source-fetch-failed",{detail:error?.message || "STAGE3_DIRECT_DISCOVERY_FAILED"});
      record.stage="direct-source-03668";
      reviewMap.set(person.id,record);
      results.push({id:person.id,name:person.name,status:"source-fetch-failed"});
    }
  }
  await saveReviewMap(reviewMap);
  const nextCursor=Math.min(PHOTO_TARGETS.length,cursor + batch.length);
  const summary=results.reduce((acc,item)=>{acc[item.status]=(acc[item.status] || 0)+1; return acc;},{});
  return res.status(200).json({ok:true,cursor,nextCursor,total:PHOTO_TARGETS.length,done:nextCursor>=PHOTO_TARGETS.length,summary,results,naverConfigured:naverCredentials().configured});
}

async function reviewStatus(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const [assets,review]=await Promise.all([getPhotoAssets(),reviewState()]);
  const assetIds=new Set((assets?.items || []).map(x=>String(x.id || "")));
  const active=review.items.filter(item=>!assetIds.has(String(item.id || "")));
  const count=status=>active.filter(item=>item.status===status || item.lastFailure===status).length;
  const candidates=active.filter(item=>item.status==="candidate-review" && item.candidates?.length);
  const allCandidates=candidates.flatMap(item=>item.candidates || []);
  const stage3Processed=active.filter(item=>item.stage==="direct-source-03668").length;
  const summary={
    total:PHOTO_TARGETS.length,assetized:assetIds.size,candidateImages:allCandidates.length,reviewRequired:candidates.length,
    strongCandidates:allCandidates.filter(item=>item.confidence==="strong").length,
    visualReviewCandidates:allCandidates.filter(item=>item.confidence==="visual-review").length,
    noCandidate:count("no-candidate"),directNoCandidate:count("direct-no-candidate"),identityRejected:count("identity-rejected"),sourceFetchFailed:count("source-fetch-failed"),
    sourceNotConfigured:count("source-not-configured"),
    imageFetchFailed:count("image-fetch-failed"),imageTooLarge:count("image-too-large"),blobFailed:count("blob-failed"),
    naverConfigured:naverCredentials().configured,
    stage3Processed
  };
  summary.stage3Unchecked=Math.max(0,summary.total-summary.assetized-summary.stage3Processed);
  summary.unchecked=Math.max(0,summary.total-summary.assetized-active.length);
  return res.status(200).json({ok:true,summary,items:candidates.slice(0,120),updatedAt:review.updatedAt});
}

function validUploadedSet(uploaded={}) {
  const variants=uploaded?.variants || {};
  const bytes=uploaded?.bytes || {};
  const urls=[variants.mini,variants.card,variants.profile];
  if (urls.some(url=>!blobPhotoUrl(url))) return false;
  const total=Math.round(Number(bytes.total || Number(bytes.mini||0)+Number(bytes.card||0)+Number(bytes.profile||0)));
  return total > 0 && total <= MAX_ASSET_BYTES;
}

async function manualUpsert(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const id=String(req.body?.id || "").trim();
  const person=TARGET_BY_ID.get(id);
  if (!person) return res.status(404).json({ok:false,error:"POLITICIAN_NOT_FOUND"});
  const uploaded=req.body?.uploaded || {};
  if (!validUploadedSet(uploaded)) return res.status(400).json({ok:false,error:"INVALID_OPTIMIZED_UPLOAD"});

  const stored=await getJSON("politicianPhotos").catch(()=>null);
  const storedItems=Array.isArray(stored?.items) ? stored.items : [];
  const previous=storedItems.find(item=>String(item?.id || "")===id) || null;
  const now=new Date().toISOString();
  const record={
    id,
    variants:uploaded.variants,
    bytes:uploaded.bytes,
    original:uploaded.original || {width:0,height:0,size:0},
    focus:String(uploaded.focus || previous?.focus || "50% 28%"),
    sourceType:"manual",
    verified:true,
    sourcePage:"",
    sourceUrl:"",
    matchScore:100,
    verification:["관리자 상세페이지 직접 등록"],
    assetizedAt:String(previous?.assetizedAt || now),
    updatedAt:now
  };
  const next=sanitize("politicianPhotos",{items:[record,...storedItems.filter(item=>String(item?.id || "")!==id)]});
  const persisted=next.items.find(item=>String(item?.id || "")===id);
  if (!persisted) return res.status(400).json({ok:false,error:"SCHEMA_REJECTED"});
  await setJSON("politicianPhotos",next);
  invalidateManualPhotoCache();
  return res.status(200).json({ok:true,record:persisted,person:{id:person.id,type:person.type,name:person.name}});
}

async function reportCandidateFailure(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const id=String(req.body?.id || "").trim();
  const failure=String(req.body?.failure || "").trim();
  const allowed=new Set(["image-fetch-failed","image-too-large","blob-failed"]);
  const person=TARGET_BY_ID.get(id);
  if (!person) return res.status(404).json({ok:false,error:"POLITICIAN_NOT_FOUND"});
  if (!allowed.has(failure)) return res.status(400).json({ok:false,error:"INVALID_FAILURE_CODE"});
  const [assetData,review]=await Promise.all([getPhotoAssets(),reviewState()]);
  const assets=assetData || {items:[]};
  if ((assets.items || []).some(item=>String(item.id)===id)) return res.status(409).json({ok:false,error:"EXISTING_ASSET"});
  const reviewMap=new Map(review.items.map(item=>[String(item.id || ""),item]));
  const current=reviewMap.get(id);
  if (!current?.candidates?.length) return res.status(400).json({ok:false,error:"CANDIDATE_NOT_FOUND"});
  reviewMap.set(id,{...current,lastFailure:failure,failureDetail:String(req.body?.detail || "").slice(0,240),updatedAt:new Date().toISOString()});
  await saveReviewMap(reviewMap);
  return res.status(200).json({ok:true,id,failure});
}

async function approveCandidate(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const token=blobToken();
  if (!token) return res.status(503).json({ok:false,error:"BLOB_STORAGE_NOT_CONFIGURED"});
  const id=String(req.body?.id || "").trim();
  const index=Math.max(0,Math.min(2,Math.floor(Number(req.body?.candidateIndex || 0))));
  const person=TARGET_BY_ID.get(id);
  if (!person) return res.status(404).json({ok:false,error:"POLITICIAN_NOT_FOUND"});
  const uploaded=req.body?.uploaded || {};
  if (!validUploadedSet(uploaded)) return res.status(400).json({ok:false,error:"INVALID_OPTIMIZED_UPLOAD"});
  const newUrls=[uploaded.variants.mini,uploaded.variants.card,uploaded.variants.profile];
  const [assetData,review]=await Promise.all([getPhotoAssets(),reviewState()]);
  const assets=assetData || {items:[]};
  if ((assets.items || []).some(item=>String(item.id)===id)) {
    await del(newUrls,{token}).catch(()=>{});
    return res.status(409).json({ok:false,error:"EXISTING_ASSET"});
  }
  const reviewMap=new Map(review.items.map(item=>[String(item.id || ""),item]));
  const state=reviewMap.get(id);
  const candidate=state?.status==="candidate-review" ? state?.candidates?.[index] : null;
  if (!candidate) {
    await del(newUrls,{token}).catch(()=>{});
    return res.status(400).json({ok:false,error:"CANDIDATE_NOT_FOUND"});
  }
  const now=new Date().toISOString();
  const record={
    id,...uploaded,focus:"50% 28%",sourceType:"auto-official-review",verified:true,sourcePage:candidate.sourcePage,sourceUrl:candidate.url,
    matchScore:Number(candidate.score || 0),verification:[...(candidate.verification || []),candidate.licenseHint || "공식기관 후보 관리자 검수"].filter(Boolean),assetizedAt:now,updatedAt:now
  };
  const next=sanitize("politicianPhotos",{items:[record,...(assets.items || [])]});
  const persisted=next.items.find(item=>item.id===id);
  if (!persisted) {
    await del(newUrls,{token}).catch(()=>{});
    return res.status(400).json({ok:false,error:"SCHEMA_REJECTED"});
  }
  await setJSON("politicianPhotos",next);
  reviewMap.set(id,reviewRecord(person,"assetized",{reason:"official-review-approved"}));
  await saveReviewMap(reviewMap);
  invalidateManualPhotoCache();
  return res.status(200).json({ok:true,record:persisted});
}

async function coverageStatus(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const type=String(req.body?.type || "assembly");
  if (!["assembly","metropolitan","basic"].includes(type)) return res.status(400).json({ok:false,error:"INVALID_POLITICIAN_TYPE"});
  const people=PHOTO_TARGETS.filter(person=>person.type===type);
  const assets=await getPhotoAssets();
  const assetIds=new Set((assets.items || []).map(item=>String(item.id || "")));
  const asset=people.filter(person=>assetIds.has(person.id));
  const unresolved=people.filter(person=>!assetIds.has(person.id));
  const checked=await Promise.all(unresolved.map(async person=>{
    try {
      const source=await resolvePoliticianPhotoSource(person);
      return {person,source};
    } catch { return {person,source:null}; }
  }));
  const assetRows=asset.map(person=>({id:person.id,name:person.name,party:person.party,jurisdiction:person.jurisdiction}));
  const fallback=checked.filter(row=>row.source).map(row=>({id:row.person.id,name:row.person.name,party:row.person.party,jurisdiction:row.person.jurisdiction,source:String(row.source?.source || "WIKIMEDIA_COMMONS_ONLY")}));
  const missing=checked.filter(row=>!row.source).map(row=>({id:row.person.id,name:row.person.name,party:row.person.party,jurisdiction:row.person.jurisdiction}));
  return res.status(200).json({ok:true,type,total:people.length,assetCount:asset.length,fallbackCount:fallback.length,missingCount:missing.length,asset:assetRows,fallback,missing});
}

async function candidateImage(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const id=String(req.query?.reviewImage || "").trim();
  const index=Math.max(0,Math.min(2,Math.floor(Number(req.query?.candidate || 0))));
  const review=await reviewState();
  const state=review.items.find(item=>String(item.id)===id);
  const candidate=state?.status==="candidate-review" ? state?.candidates?.[index] : null;
  if (!candidate?.url || !publicHttpsUrl(candidate.url)) return res.status(404).json({ok:false,error:"CANDIDATE_NOT_FOUND"});
  try {
    const headers={accept:"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"};
    if(candidate.sourcePage && candidate.sourcePage!==candidate.url) headers.referer=candidate.sourcePage;
    const r=await fetchWithTimeout(candidate.url,{headers},12000);
    const type=String(r.headers.get("content-type") || "").toLowerCase().split(";")[0];
    const declared=Number(r.headers.get("content-length") || 0);
    if (!r.ok || !type.startsWith("image/") || !publicHttpsUrl(r.url || candidate.url)) return res.status(502).json({ok:false,error:"IMAGE_FETCH_FAILED"});
    if (declared > MAX_REVIEW_SOURCE_BYTES) return res.status(413).json({ok:false,error:"IMAGE_TOO_LARGE"});
    const buffer=Buffer.from(await r.arrayBuffer());
    if (buffer.length < 512) return res.status(502).json({ok:false,error:"IMAGE_FETCH_FAILED"});
    if (buffer.length > MAX_REVIEW_SOURCE_BYTES) return res.status(413).json({ok:false,error:"IMAGE_TOO_LARGE"});
    res.setHeader("Content-Type",type);
    res.setHeader("Cache-Control","no-store");
    res.setHeader("X-JCV3-Photo-Review-Source",encodeURIComponent(candidate.sourcePage || ""));
    return res.status(200).send(buffer);
  } catch { return res.status(502).json({ok:false,error:"IMAGE_FETCH_FAILED"}); }
}

module.exports = async function politicianPhotoRoute(req,res) {
  if (req.method === "POST") {
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    const action=String(req.body?.action || "");
    if (action === "harvest-batch") return harvestBatch(req,res);
    if (action === "discover-batch") return discoverBatch(req,res);
    if (action === "direct-discover-batch") return directDiscoverBatch(req,res);
    if (action === "review-status") return reviewStatus(req,res);
    if (action === "coverage-status") return coverageStatus(req,res);
    if (action === "manual-upsert") return manualUpsert(req,res);
    if (action === "report-candidate-failure") return reportCandidateFailure(req,res);
    if (action === "approve-candidate") return approveCandidate(req,res);
    return res.status(400).json({ok:false,error:"UNKNOWN_ACTION"});
  }
  if (req.method !== "GET") {
    res.setHeader("Allow","GET, POST");
    return res.status(405).json({ ok:false,error:"METHOD_NOT_ALLOWED" });
  }
  if (req.query?.reviewImage) return candidateImage(req,res);
  const id=String(req.query?.id || "").trim();
  const requested=Number(req.query?.w || 160);
  const width=ALLOWED_WIDTHS.has(requested) ? requested : 160;
  const person=getPoliticianById(id);
  if (!person || id === "assembly-300") return res.status(404).json({ ok:false,error:"POLITICIAN_NOT_FOUND" });

  const manual=await manualPhoto(id,width);
  if (manual?.url) {
    res.setHeader("Cache-Control",LIVE_PHOTO_CACHE_CONTROL);
    const provider=manual.sourceType === "auto-wikimedia"
      ? "JCV3_BLOB_WIKIMEDIA"
      : manual.sourceType === "auto-official-review"
        ? "JCV3_BLOB_OFFICIAL_REVIEW"
        : manual.sourceType === "seed-local"
          ? "JCV3_LOCAL_SEED"
          : manual.sourceType === "seed-external"
            ? "JCV3_PACKAGED_SEED"
            : "ADMIN_UPLOAD";
    res.setHeader("X-JCV3-Photo-Provider",provider);
    if (manual.updatedAt) res.setHeader("X-JCV3-Photo-Version",encodeURIComponent(manual.updatedAt));
    res.statusCode=307;
    res.setHeader("Location",manual.url);
    return res.end();
  }

  const photo=await fetchPoliticianPhoto(person,width);
  if (!photo) {
    res.setHeader("Cache-Control",LIVE_PHOTO_CACHE_CONTROL);
    res.setHeader("X-JCV3-Photo-Provider","WIKIMEDIA_COMMONS_ONLY");
    return res.status(404).json({ ok:false,error:"WIKIMEDIA_COMMONS_PHOTO_NOT_RESOLVED",id,name:person.name });
  }

  res.setHeader("Content-Type",photo.contentType || "image/jpeg");
  res.setHeader("Cache-Control",LIVE_PHOTO_CACHE_CONTROL);
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-JCV3-Photo-Provider",photo.matched?.source || "WIKIMEDIA_COMMONS_ONLY");
  res.setHeader("X-JCV3-Photo-Source-Page",encodeURIComponent(photo.matched?.sourcePage || "https://commons.wikimedia.org/"));
  return res.status(200).send(photo.buffer);
};
