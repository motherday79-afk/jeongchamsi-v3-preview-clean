const { command } = require("../../../lib/v3/redis");
const { currentUser, requireAdmin } = require("../../../lib/v3/access");
const { updateUserAccess, getUser } = require("../../../lib/v3/users");
const { getActivity, setActivity } = require("../../../lib/v3/activity");

const KEY="jcv3:partner-applications:v1";
function clean(v,max=3000){return String(v||"").trim().slice(0,max);}
async function read(){const raw=await command(["GET",KEY]);if(!raw)return[];try{return JSON.parse(raw)||[];}catch{return[];}}
async function write(items){await command(["SET",KEY,JSON.stringify(items.slice(0,1000))]);}
function ownItem(x){return {id:x.id,status:x.status,message:x.message,contact:x.contact,createdAt:x.createdAt,updatedAt:x.updatedAt,reviewNote:x.reviewNote||""};}

module.exports=async function handler(req,res){
  res.setHeader("Content-Type","application/json; charset=utf-8"); res.setHeader("Cache-Control","no-store");
  try{
    const user=await currentUser(req); if(!user)return res.status(401).json({ok:false,error:"USER_LOGIN_REQUIRED"});
    if(req.method==="GET"){
      const items=(await read()).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));
      if(user.role==="admin")return res.status(200).json({ok:true,items});
      return res.status(200).json({ok:true,items:items.filter(x=>x.ownerId===user.id).map(ownItem)});
    }
    if(req.method==="POST"){
      const message=clean(req.body?.message,3000); const contact=clean(req.body?.contact,200);
      if(message.length<10)return res.status(400).json({ok:false,error:"APPLICATION_TOO_SHORT"});
      const items=await read();
      const active=items.find(x=>x.ownerId===user.id && ["requested","reviewing"].includes(x.status));
      if(active)return res.status(409).json({ok:false,error:"APPLICATION_PENDING"});
      const now=new Date().toISOString();
      const item={id:`partner-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`,ownerId:user.id,applicantName:user.name||"",nickname:user.nickname||user.id,email:user.email||"",phone:user.phone||"",region:user.region||"",message,contact,status:"requested",reviewNote:"",createdAt:now,updatedAt:now};
      items.unshift(item); await write(items); return res.status(200).json({ok:true,item:ownItem(item)});
    }
    if(req.method==="PATCH"){
      if(user.role!=="admin")return res.status(403).json({ok:false,error:"ADMIN_REQUIRED"});
      const id=clean(req.body?.id,120); const status=clean(req.body?.status,20); const reviewNote=clean(req.body?.reviewNote,500);
      if(!["requested","reviewing","approved","rejected"].includes(status))return res.status(400).json({ok:false,error:"INVALID_STATUS"});
      const items=await read(); const item=items.find(x=>x.id===id); if(!item)return res.status(404).json({ok:false,error:"APPLICATION_NOT_FOUND"});
      item.status=status; item.reviewNote=reviewNote; item.updatedAt=new Date().toISOString();
      if(status==="approved"){
        const target=await getUser(item.ownerId);
        if(target && target.role!=="admin") await updateUserAccess(item.ownerId,{role:"partner",status:"active"});
        let activity=await getActivity(item.ownerId); if(!activity.grantedBadges.includes("jungchamsi-partner"))activity.grantedBadges.push("jungchamsi-partner"); await setActivity(item.ownerId,activity);
      }
      await write(items); return res.status(200).json({ok:true,item});
    }
    res.setHeader("Allow","GET, POST, PATCH");return res.status(405).json({ok:false,error:"METHOD_NOT_ALLOWED"});
  }catch(error){return res.status(error?.code==="STORAGE_MISSING"?503:500).json({ok:false,error:error?.code||"PARTNER_APPLICATION_FAILED"});}
};
