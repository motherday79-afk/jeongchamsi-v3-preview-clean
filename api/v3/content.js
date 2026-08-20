const { getJSON, setJSON } = require("../../lib/v3/redis");
const { validDomain, defaultDomain, sanitize } = require("../../lib/v3/schema");

function adminAllowed(req){
  const expected = String(process.env.JCV3_ADMIN_TOKEN || "");
  if (!expected) return false;
  return String(req.headers["x-jcv3-admin"] || "") === expected;
}

module.exports = async function handler(req,res){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method === "GET"){
    const domain=String(req.query?.domain||"");
    if(!validDomain(domain)) return res.status(400).json({ok:false,error:"INVALID_DOMAIN"});
    try{
      const data=await getJSON(domain);
      res.setHeader("Cache-Control","public, max-age=0, s-maxage=20, stale-while-revalidate=60");
      return res.status(200).json({ok:true,schemaVersion:1,domain,data:data||defaultDomain(domain)});
    }catch(error){
      if(error?.code==="STORAGE_MISSING") return res.status(503).json({ok:false,error:"JCV3_STORAGE_NOT_CONFIGURED",data:defaultDomain(domain)});
      return res.status(503).json({ok:false,error:"JCV3_STORAGE_UNAVAILABLE"});
    }
  }
  if(req.method === "POST"){
    if(!adminAllowed(req)) return res.status(401).json({ok:false,error:"ADMIN_TOKEN_REQUIRED"});
    const domain=String(req.body?.domain||"");
    if(!validDomain(domain)) return res.status(400).json({ok:false,error:"INVALID_DOMAIN"});
    try{
      const data=sanitize(domain,req.body?.data);
      await setJSON(domain,data);
      return res.status(200).json({ok:true,domain,savedAt:new Date().toISOString()});
    }catch(error){
      return res.status(error?.code==="PAYLOAD_TOO_LARGE"?413:503).json({ok:false,error:String(error?.code||"SAVE_FAILED")});
    }
  }
  res.setHeader("Allow","GET, POST"); return res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"});
};
