const { getPoliticianById, fetchPoliticianPhoto } = require("../lib/politician-photo-resolver");
const { getJSON } = require("../../../lib/v3/redis");

const ALLOWED_WIDTHS = new Set([64,96,128,160,256,384]);

const manualCache = globalThis.__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE__ || { at:0, items:new Map() };
globalThis.__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE__ = manualCache;

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
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.endsWith(".blob.vercel-storage.com") && !host.endsWith(".public.blob.vercel-storage.com")) return null;
  } catch { return null; }
  return { url, updatedAt:String(item.updatedAt || "") };
}


module.exports = async function politicianPhotoRoute(req,res) {
  if (req.method !== "GET") return res.status(405).json({ ok:false,error:"METHOD_NOT_ALLOWED" });
  const id=String(req.query?.id || "").trim();
  const requested=Number(req.query?.w || 160);
  const width=ALLOWED_WIDTHS.has(requested) ? requested : 160;
  const person=getPoliticianById(id);
  if (!person || id === "assembly-300") return res.status(404).json({ ok:false,error:"POLITICIAN_NOT_FOUND" });

  const manual=await manualPhoto(id,width);
  if (manual?.url) {
    res.setHeader("Cache-Control","public, max-age=30, s-maxage=60, stale-while-revalidate=300");
    res.setHeader("X-JCV3-Photo-Provider","ADMIN_UPLOAD");
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
