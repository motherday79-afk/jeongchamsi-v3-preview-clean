const { mgetJSON } = require("../../lib/v3/redis");
const { defaultDomain } = require("../../lib/v3/schema");
const DOMAINS=["columns","community","news","polls","academy","generation","nationalEvaluation","itsme"];
module.exports=async function handler(req,res){
  if(req.method!=="GET") return res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"});
  try{
    const values=await mgetJSON(DOMAINS); const data={}; DOMAINS.forEach((d,i)=>data[d]=values[i]||defaultDomain(d));
    res.setHeader("Cache-Control","public, max-age=0, s-maxage=20, stale-while-revalidate=60");
    return res.status(200).json({ok:true,schemaVersion:1,data});
  }catch(error){ return res.status(503).json({ok:false,error:String(error?.code||"JCV3_STORAGE_UNAVAILABLE")}); }
};
