const { command } = require("../../../lib/v3/redis");
const { currentUser, requireAdmin } = require("../../../lib/v3/access");

const KEY = "jcv3:politician-requests:v1";
function clean(v, max=80){ return String(v || "").trim().replace(/\s+/g," ").slice(0,max); }
async function read(){ const raw=await command(["GET",KEY]); if(!raw) return []; try{return JSON.parse(raw)||[];}catch{return [];} }
async function write(items){ await command(["SET",KEY,JSON.stringify(items.slice(0,1000))]); }
function publicItem(x){ return { id:x.id, name:x.name, status:x.status, requestCount:Number(x.requestCount||1), createdAt:x.createdAt, updatedAt:x.updatedAt }; }

module.exports = async function handler(req,res){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  try {
    if(req.method === "GET"){
      const items=(await read()).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
      const admin=await requireAdmin(req);
      return res.status(200).json({ok:true,items:admin?items:items.map(publicItem)});
    }
    if(req.method === "POST"){
      const user=await currentUser(req); if(!user) return res.status(401).json({ok:false,error:"USER_LOGIN_REQUIRED"});
      const name=clean(req.body?.name,60); if(name.length<2) return res.status(400).json({ok:false,error:"NAME_REQUIRED"});
      const items=await read(); const norm=name.toLowerCase().replace(/\s+/g,"");
      let item=items.find(x=>String(x.normalized||"")===norm && x.status!=="completed");
      const now=new Date().toISOString();
      if(item){
        item.requesterIds=Array.from(new Set([...(item.requesterIds||[]),user.id])).slice(0,500);
        item.requestCount=item.requesterIds.length || Number(item.requestCount||1);
        item.updatedAt=now;
      }else{
        item={id:`preq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,name,normalized:norm,status:"requested",requesterIds:[user.id],requestCount:1,createdAt:now,updatedAt:now};
        items.unshift(item);
      }
      await write(items); return res.status(200).json({ok:true,item:publicItem(item)});
    }
    if(req.method === "PATCH"){
      const admin=await requireAdmin(req); if(!admin) return res.status(401).json({ok:false,error:"ADMIN_LOGIN_REQUIRED"});
      const id=clean(req.body?.id,120); const status=clean(req.body?.status,20);
      if(!["requested","reviewing","completed"].includes(status)) return res.status(400).json({ok:false,error:"INVALID_STATUS"});
      const items=await read(); const item=items.find(x=>x.id===id); if(!item) return res.status(404).json({ok:false,error:"REQUEST_NOT_FOUND"});
      item.status=status; item.updatedAt=new Date().toISOString(); await write(items); return res.status(200).json({ok:true,item});
    }
    res.setHeader("Allow","GET, POST, PATCH"); return res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"});
  }catch(error){ return res.status(error?.code==="STORAGE_MISSING"?503:500).json({ok:false,error:error?.code||"POLITICIAN_REQUEST_FAILED"}); }
};
