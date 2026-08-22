const { getPoliticianById, fetchPoliticianPhoto } = require("../lib/politician-photo-resolver");

const ALLOWED_WIDTHS = new Set([64,96,128,160,256,384]);

module.exports = async function politicianPhotoRoute(req,res) {
  if (req.method !== "GET") return res.status(405).json({ ok:false,error:"METHOD_NOT_ALLOWED" });
  const id=String(req.query?.id || "").trim();
  const requested=Number(req.query?.w || 160);
  const width=ALLOWED_WIDTHS.has(requested) ? requested : 160;
  const person=getPoliticianById(id);
  if (!person || id === "assembly-300") return res.status(404).json({ ok:false,error:"POLITICIAN_NOT_FOUND" });

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
