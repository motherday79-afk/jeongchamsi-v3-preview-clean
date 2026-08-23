const { requireAdmin } = require('../../../../lib/v3/access');
const { listUsers, referralCountMap } = require('../../../../lib/v3/users');
const { getActivities } = require('../../../../lib/v3/activity');
const { getJSON } = require('../../../../lib/v3/redis');
const { defaultDomain } = require('../../../../lib/v3/schema');
const { VALID_BADGE_KEYS, computeBadgeMetrics, evaluateBadgeRules } = require('../../../../lib/v3/badge-engine');
const { getCelebrationConfig, setCelebrationConfig, getRecentBadgeCelebrations } = require('../../../../lib/v3/badge-celebrations');

module.exports = async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(!['GET','PATCH'].includes(req.method)){
    res.setHeader('Allow','GET, PATCH');
    return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }
  try{
    const admin=await requireAdmin(req);
    if(!admin) return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
    if(req.method==='PATCH'){
      const celebration=await setCelebrationConfig(req.body?.enabledBadgeKeys||[]);
      return res.status(200).json({ok:true,celebration});
    }

    const users=await listUsers();
    const ids=users.map(u=>u.id);
    const [activities,community,itsme,columns,news,comments]=await Promise.all([
      getActivities(ids),
      getJSON('community').then(x=>x||defaultDomain('community')),
      getJSON('itsme').then(x=>x||defaultDomain('itsme')),
      getJSON('columns').then(x=>x||defaultDomain('columns')),
      getJSON('news').then(x=>x||defaultDomain('news')),
      getJSON('comments').then(x=>x||defaultDomain('comments'))
    ]);
    const usersObject=Object.fromEntries(users.map(u=>[u.id,u]));
    const referrals=referralCountMap(usersObject);
    const holders=Object.fromEntries([...VALID_BADGE_KEYS].map(k=>[k,0]));
    const records=[];

    for(const user of users){
      const activity=activities[user.id]||{};
      const metrics=computeBadgeMetrics(user.id,activity,{community,itsme,columns,news,comments},{referralsRecruited:Number(referrals[user.referralNumber]||0)});
      // Admins may use every badge, but holder counts should reflect actual conditions/grants.
      const evaluationUser=user.role==='admin'?{...user,role:'member'}:user;
      const evaluated=evaluateBadgeRules(evaluationUser,activity,metrics);
      if(user.role==='admin') evaluated.earned.add('operator');
      for(const key of evaluated.earned) if(Object.hasOwn(holders,key)) holders[key]+=1;
      records.push({
        id:user.id,
        name:user.name||user.nickname||user.id,
        role:user.role||'member',
        referralNumber:Number(user.referralNumber||0),
        recruitedCount:Number(referrals[user.referralNumber]||0),
        earnedCount:evaluated.earned.size,
        blackBadges:[...evaluated.earned].filter(k=>['operator','jeongcham-mayor','michael'].includes(k))
      });
    }

    const [celebration,recentCelebrations]=await Promise.all([getCelebrationConfig(),getRecentBadgeCelebrations(8)]);
    return res.status(200).json({
      ok:true,
      summary:{members:users.length,totalBadges:VALID_BADGE_KEYS.size,blackBadges:3},
      holders,
      records:records.sort((a,b)=>b.earnedCount-a.earnedCount||b.recruitedCount-a.recruitedCount),
      celebration,
      recentCelebrations
    });
  }catch(error){
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'BADGE_CENTER_FAILED'});
  }
};
