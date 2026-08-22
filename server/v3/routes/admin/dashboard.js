const {requireAdmin}=require('../../../../lib/v3/access');
const {mgetJSON}=require('../../../../lib/v3/redis');
const {countUsers}=require('../../../../lib/v3/users');

const DOMAINS=['columns','community','itsme','news','polls','academy'];
module.exports=async function adminDashboard(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const admin=await requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
  try{
    const [values,members]=await Promise.all([mgetJSON(DOMAINS),countUsers()]);
    const [columns,community,itsme,news,polls,academy]=values;
    return res.status(200).json({ok:true,counts:{
      members:Number(members)||0,
      columns:(columns?.items||[]).length,
      community:(community?.items||[]).length,
      itsme:(itsme?.items||[]).length,
      news:(news?.items||[]).length,
      polls:(polls?.items||[]).length,
      academy:(academy?.slots||[]).length
    }});
  }catch(error){
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'ADMIN_DASHBOARD_FAILED'});
  }
};
