const { mgetJSON } = require("../../lib/v3/redis");
// Participation write API will be enabled after identity/anti-abuse policy is fixed.
// Returning 409 is deliberate: it prevents pretending a production-grade vote was stored.
module.exports = async function handler(req,res){
  if(req.method!=="POST") return res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"});
  return res.status(409).json({ok:false,error:"PARTICIPATION_POLICY_NOT_LOCKED"});
};
