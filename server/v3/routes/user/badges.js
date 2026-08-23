const { currentUser } = require('../../../../lib/v3/access');
const { getActivity, setActivity } = require('../../../../lib/v3/activity');
const { loadBadgeStatus } = require('../../../../lib/v3/badge-engine');
const { getReferralStatus } = require('../../../../lib/v3/users');
const { reconcileBadgeRecognition, recordBadgeCelebrations } = require('../../../../lib/v3/badge-celebrations');

module.exports = async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }
  try{
    const user=await currentUser(req);
    if(!user) return res.status(401).json({ok:false,error:'USER_LOGIN_REQUIRED'});
    const activity=await getActivity(user.id);
    const referral=await getReferralStatus(user.id);
    const status=await loadBadgeStatus(user,activity,{referralsRecruited:Number(referral?.recruitedCount||0)});
    const recognized=reconcileBadgeRecognition(activity.badgeRecognition,status.earnedBadges);
    const prior=JSON.stringify(activity.badgeRecognition||{});
    const next=JSON.stringify(recognized.recognition);
    if(prior!==next){
      activity.badgeRecognition=recognized.recognition;
      await setActivity(user.id,activity);
    }
    if(recognized.newBadgeKeys.length){
      try{await recordBadgeCelebrations(user,recognized.newBadgeKeys);}catch{}
    }
    return res.status(200).json({ok:true,status,newlyRecognizedBadges:recognized.newBadgeKeys});
  }catch(error){
    return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'BADGE_STATUS_FAILED'});
  }
};
