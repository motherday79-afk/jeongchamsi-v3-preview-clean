const {getPersonById}=require('./politician-live-roster');
const {collectSearchPulse,credentials:searchCredentials}=require('./naver-searchad');
const {collectNaverNews,credentials:newsCredentials,availability:newsAvailability}=require('./naver-news');

function missing(provider,error){return {provider,configured:true,state:'ERROR',error:String(error?.message||error||'unknown error')};}
async function getLiveDataById(id,opts={}){
  const person=getPersonById(id);if(!person)return {ok:false,error:'POLITICIAN_NOT_FOUND',id};
  const [searchResult,newsResult]=await Promise.allSettled([collectSearchPulse(person),collectNaverNews(person,opts)]);
  const search=searchResult.status==='fulfilled'?searchResult.value:missing('naver-search-ads-keywordstool',searchResult.reason);
  const news=newsResult.status==='fulfilled'?newsResult.value:missing('naver-news-search-api',newsResult.reason);
  const ns=newsAvailability(); return {ok:true,person:{id:person.id,type:person.type,name:person.name,party:person.party,jurisdiction:person.jurisdiction,office:person.office,ambiguousName:person.ambiguousName},configured:{searchAds:searchCredentials().configured,news:ns.available,newsNaver:newsCredentials().configured},providers:['naver-search-ads',news.provider||ns.provider],search,news,fetchedAt:new Date().toISOString()};
}
module.exports={getLiveDataById};
