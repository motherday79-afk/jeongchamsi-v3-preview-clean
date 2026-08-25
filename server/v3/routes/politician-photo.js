const { put, del } = require("@vercel/blob");
const ROSTER = require("../data/politician-photo-roster.json");
const { getPoliticianById, fetchPoliticianPhoto, resolvePoliticianPhotoSource } = require("../lib/politician-photo-resolver");
const { getJSON, setJSON } = require("../../../lib/v3/redis");
const { requireAdmin } = require("../../../lib/v3/access");
const { blobToken } = require("../../../lib/v3/blob");
const { sanitize } = require("../../../lib/v3/schema");

const ALLOWED_WIDTHS = new Set([64,96,128,160,256,384]);
const MAX_ASSET_BYTES = 128 * 1024;
const AUTO_VARIANT_PLANS = [
  { mini:96, card:192, profile:384 },
  { mini:96, card:160, profile:320 },
  { mini:80, card:144, profile:256 }
];
const PHOTO_TARGETS = ROSTER.filter((person) => person?.id && person.id !== "assembly-300");

const manualCache = globalThis.__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE_03664__ || { at:0, items:new Map() };
globalThis.__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE_03664__ = manualCache;

function blobPhotoUrl(url = "") {
  try {
    const host = new URL(String(url || "")).hostname.toLowerCase();
    return host.endsWith(".blob.vercel-storage.com") || host.endsWith(".public.blob.vercel-storage.com");
  } catch { return false; }
}

async function manualPhoto(id, width) {
  if (Date.now() - manualCache.at > 10000) {
    try {
      const data = await getJSON("politicianPhotos");
      manualCache.items = new Map((data?.items || []).map(item => [String(item.id || ""), item]));
      manualCache.at = Date.now();
    } catch { manualCache.at = Date.now(); }
  }
  const item = manualCache.items.get(String(id || ""));
  if (!item?.variants) return null;
  const key = width <= 96 ? "mini" : width <= 256 ? "card" : "profile";
  const url = item.variants[key] || item.variants.profile || item.variants.card || item.variants.mini || "";
  if (!url || !blobPhotoUrl(url)) return null;
  return { url, updatedAt:String(item.updatedAt || ""), sourceType:String(item.sourceType || "manual") };
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
        access:"public",
        contentType:photo.contentType || "image/jpeg",
        addRandomSuffix:true,
        token
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
  const latest=await getJSON("politicianPhotos") || {items:[]};
  const latestItems=Array.isArray(latest.items) ? latest.items : [];
  if (latestItems.some((item)=>String(item.id) === person.id)) {
    await del(uploaded.uploaded,{token}).catch(()=>{});
    return { saved:false,reason:"EXISTING_ASSET" };
  }
  const now=new Date().toISOString();
  const record={
    id:person.id,
    variants:uploaded.variants,
    bytes:uploaded.bytes,
    original:{width:0,height:0,size:0},
    focus:"50% 28%",
    sourceType:"auto-wikimedia",
    verified:true,
    sourcePage:String(source?.sourcePage || ""),
    sourceUrl:String(source?.sourceUrl || ""),
    matchScore:Number(source?.score || 0),
    verification:Array.isArray(source?.verification) ? source.verification : [],
    assetizedAt:now,
    updatedAt:now
  };
  const next=sanitize("politicianPhotos",{items:[record,...latestItems]});
  const persisted=next.items.find((item)=>item.id === person.id);
  if (!persisted) {
    await del(uploaded.uploaded,{token}).catch(()=>{});
    return { saved:false,reason:"SCHEMA_REJECTED" };
  }
  await setJSON("politicianPhotos",next);
  manualCache.at=0;
  return { saved:true,record:persisted };
}

async function harvestBatch(req,res) {
  const admin=await requireAdmin(req);
  if (!admin) return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
  const token=blobToken();
  if (!token) return res.status(503).json({ok:false,error:"BLOB_STORAGE_NOT_CONFIGURED"});
  const cursor=Math.max(0,Math.min(PHOTO_TARGETS.length,Math.floor(Number(req.body?.cursor || 0))));
  const limit=Math.max(1,Math.min(5,Math.floor(Number(req.body?.limit || 5))));
  const batch=PHOTO_TARGETS.slice(cursor,cursor + limit);
  const initial=await getJSON("politicianPhotos") || {items:[]};
  const existing=new Map((initial.items || []).map((item)=>[String(item.id || ""),item]));
  const results=[];

  for (const person of batch) {
    if (existing.has(person.id)) {
      results.push({id:person.id,name:person.name,status:"existing"});
      continue;
    }
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

module.exports = async function politicianPhotoRoute(req,res) {
  if (req.method === "POST") {
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    if (String(req.body?.action || "") !== "harvest-batch") return res.status(400).json({ok:false,error:"UNKNOWN_ACTION"});
    return harvestBatch(req,res);
  }
  if (req.method !== "GET") {
    res.setHeader("Allow","GET, POST");
    return res.status(405).json({ ok:false,error:"METHOD_NOT_ALLOWED" });
  }
  const id=String(req.query?.id || "").trim();
  const requested=Number(req.query?.w || 160);
  const width=ALLOWED_WIDTHS.has(requested) ? requested : 160;
  const person=getPoliticianById(id);
  if (!person || id === "assembly-300") return res.status(404).json({ ok:false,error:"POLITICIAN_NOT_FOUND" });

  const manual=await manualPhoto(id,width);
  if (manual?.url) {
    res.setHeader("Cache-Control","public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    res.setHeader("X-JCV3-Photo-Provider",manual.sourceType === "auto-wikimedia" ? "JCV3_BLOB_WIKIMEDIA" : "ADMIN_UPLOAD");
    if (manual.updatedAt) res.setHeader("X-JCV3-Photo-Version",encodeURIComponent(manual.updatedAt));
    res.statusCode=307;
    res.setHeader("Location",manual.url);
    return res.end();
  }

  const photo=await fetchPoliticianPhoto(person,width);
  if (!photo) {
    res.setHeader("Cache-Control","public, max-age=120, s-maxage=1800, stale-while-revalidate=3600");
    res.setHeader("X-JCV3-Photo-Provider","WIKIMEDIA_COMMONS_ONLY");
    return res.status(404).json({ ok:false,error:"WIKIMEDIA_COMMONS_PHOTO_NOT_RESOLVED",id,name:person.name });
  }

  res.setHeader("Content-Type",photo.contentType || "image/jpeg");
  res.setHeader("Cache-Control","public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-JCV3-Photo-Provider",photo.matched?.source || "WIKIMEDIA_COMMONS_ONLY");
  res.setHeader("X-JCV3-Photo-Source-Page",encodeURIComponent(photo.matched?.sourcePage || "https://commons.wikimedia.org/"));
  return res.status(200).send(photo.buffer);
};
