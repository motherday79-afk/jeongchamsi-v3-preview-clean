const {allPeople}=require('../lib/politician-live-roster');
const {credentials:searchCredentials}=require('../lib/naver-searchad');
const {getLiveDataById}=require('../lib/politician-live-data');

module.exports=async function politicianLiveDataRoute(req,res){
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  if(String(req.query?.status||'')==='1'){
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json({ok:true,rosterTotal:allPeople().length,configured:{searchAds:searchCredentials().configured,news:true},providers:{search:'naver-search-ads',news:'google-news-rss'},requiredEnv:{searchAds:['NAVER_AD_ACCESS_LICENSE','NAVER_AD_SECRET_KEY','NAVER_AD_CUSTOMER_ID'],news:[]}});
  }
  const id=String(req.query?.id||'').trim();if(!id)return res.status(400).json({ok:false,error:'POLITICIAN_ID_REQUIRED'});
  const data=await getLiveDataById(id);if(!data.ok)return res.status(404).json(data);
  res.setHeader('Cache-Control','public, max-age=300, s-maxage=21600, stale-while-revalidate=3600');
  return res.status(200).json(data);
};
