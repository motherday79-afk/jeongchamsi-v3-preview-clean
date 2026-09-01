const { requireAdmin } = require('../../../../lib/v3/access');
const { listUsers } = require('../../../../lib/v3/users');
const { mgetJSON } = require('../../../../lib/v3/redis');

const DOMAINS=['columns','community','itsme','news','polls','academy'];
module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  try{
    const admin=await requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
    if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});}
    const [values,users]=await Promise.all([mgetJSON(DOMAINS),listUsers()]);
    const count=(value,key='items')=>Array.isArray(value?.[key])?value[key].length:0;
    const by=Object.fromEntries(DOMAINS.map((d,i)=>[d,values[i]||{}]));
    return res.status(200).json({ok:true,counts:{members:users.length,columns:count(by.columns),community:count(by.community),itsme:count(by.itsme),news:count(by.news),polls:count(by.polls),academy:count(by.academy,'slots')}});
  }catch(error){return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'ADMIN_DASHBOARD_FAILED'});}
};
