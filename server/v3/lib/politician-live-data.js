const {getPersonById}=require('./politician-live-roster');
const {collectSearchPulse,credentials:searchCredentials}=require('./naver-searchad');
const {collectGoogleNews}=require('./google-news-rss');
const {applyFallbacks}=require('./now-fallback');
function missing(provider,error){return {provider,configured:true,state:'ERROR',error:String(error?.message||error||'unknown error')};}
async function getLiveDataById(id,opts={}){
  const person=getPersonById(id);if(!person)return {ok:false,error:'POLITICIAN_NOT_FOUND',id};
  const [searchResult,newsResult]=await Promise.allSettled([collectSearchPulse(person),collectGoogleNews(person,opts)]);
  const rawSearch=searchResult.status==='fulfilled'?searchResult.value:missing('naver-search-ads',searchResult.reason);
  const rawNews=newsResult.status==='fulfilled'?newsResult.value:missing('google-news-rss',newsResult.reason);
  const fallback=applyFallbacks(person,rawSearch,rawNews,opts.previousView||null,opts.nowMs||Date.now());
  return {ok:true,person:{id:person.id,type:person.type,name:person.name,party:person.party,jurisdiction:person.jurisdiction,office:person.office,ambiguousName:person.ambiguousName},configured:{searchAds:searchCredentials().configured,news:true},providers:[fallback.search?.provider||'search',fallback.news?.provider||'news'],search:fallback.search,news:fallback.news,fetchedAt:new Date().toISOString()};
}
module.exports={getLiveDataById};
