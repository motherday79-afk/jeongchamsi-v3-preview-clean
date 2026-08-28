const V2_VERSIONS=Object.freeze({now:'JCS_NOW_V1',pipeline:'JCS_HISTORY_PIPELINE_V2',derived:'JCS_DERIVED_V2'});
const V2_PREFIX='jcv3:history:v2';
const V2_ACCESS='INTERNAL_ADMIN';
const V2_SNAPSHOT_INDEX_KEY=`${V2_PREFIX}:snapshots`;
const V2_EVENT_INDEX_KEY=`${V2_PREFIX}:events`;
const CORE_SCORE_KEYS=Object.freeze(['overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread']);
const ALL_SCORE_KEYS=Object.freeze([
  'overallInterest','highEngagement','massExpansion','activity','issueHeat','mediaSpread',
  'audienceExpansion','mobileResponse','massPenetration','coreRetention',
  'activityAcceleration','activityConcentration','activityPersistence',
  'newsAcceleration','issueFreshness','issuePersistence','mediaDiversity',
  'newsSearchTransition','issueInflux','mediaPublicGap','issueExplosiveness'
]);

function cleanSegment(value=''){return String(value||'').trim().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);}
function cleanText(value='',max=1200){return String(value||'').trim().slice(0,max);}
function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function roundFinite(value,digits=1){const n=finite(value);if(n===null)return null;const p=10**digits;return Math.round(n*p)/p;}
function putNumber(target,key,value,digits=1){const n=roundFinite(value,digits);if(n!==null)target[key]=n;}
function copyTextObject(input={},keys=[],max=220){const out={};for(const key of keys){const value=cleanText(input?.[key],max);if(value)out[key]=value;}return out;}
function copyNumberObject(input={},keys=ALL_SCORE_KEYS){const out={};for(const key of keys)putNumber(out,key,input?.[key]);return out;}

function v2SnapshotKey(draftId){return `${V2_PREFIX}:snapshot:${cleanSegment(draftId)}`;}
function v2ObservationKey(personId,publishId){return `${V2_PREFIX}:observation:${cleanSegment(personId)}:${cleanSegment(publishId)}`;}
function v2ObservationIndexKey(personId){return `${V2_PREFIX}:observations:${cleanSegment(personId)}`;}
function v2EventKey(eventId){return `${V2_PREFIX}:event:${cleanSegment(eventId)}`;}

function compactHeadline(row={}){
  const title=cleanText(row.title,240);if(!title)return null;
  const out={title};
  const link=cleanText(row.link,1200);if(link)out.link=link;
  const source=cleanText(row.source,100);if(source)out.source=source;
  const ts=finite(row.ts);if(ts!==null)out.ts=Math.round(ts);
  return out;
}
function compactRelated(row={}){
  const p=row.person||{};const id=cleanText(p.id,100);if(!id)return null;
  const out={person:{id,name:cleanText(p.name,100),party:cleanText(p.party,100),jurisdiction:cleanText(p.jurisdiction,160)}};
  putNumber(out,'globalRank',row.rank,0);putNumber(out,'nowIndex',row.score);return out;
}

function buildFullObservation(view={},meta={}){
  const row=view.row||{},person=row.person||{},analysis=view.analysis||{},search=row.search||{},news=row.news||{};
  const scores=copyNumberObject(analysis.scores||{});
  const grades=copyTextObject(analysis.grades||{},ALL_SCORE_KEYS,80);
  const calculated={};putNumber(calculated,'nowIndex',row.score);putNumber(calculated,'searchScore',row.searchScore);putNumber(calculated,'newsScore',row.newsScore);
  const rank={};putNumber(rank,'global',row.rank,0);putNumber(rank,'category',view.categoryRank,0);const categoryLabel=cleanText(view.categoryLabel,100);if(categoryLabel)rank.categoryLabel=categoryLabel;
  const external={search:{state:cleanText(search.state,40),ambiguousName:Boolean(search.ambiguousName)},news:{state:cleanText(news.state,40)}};
  putNumber(external.search,'monthlyPcQcCnt',search.monthlyPcQcCnt,0);putNumber(external.search,'monthlyMobileQcCnt',search.monthlyMobileQcCnt,0);putNumber(external.search,'monthlyTotalQcCnt',search.monthlyTotalQcCnt,0);
  for(const key of ['count6','count24','count7d','sources24'])putNumber(external.news,key,news[key],0);
  if(news.latest&&typeof news.latest==='object')external.news.latest=copyTextObject(news.latest,['title','link','source'],1200);
  const headlines=(Array.isArray(news.headlines)?news.headlines:[]).slice(0,12).map(compactHeadline).filter(Boolean);if(headlines.length)external.news.headlines=headlines;
  const signal=copyTextObject(analysis.signal||{},['label','diagnosis'],1200);
  const audience={};putNumber(audience,'position',analysis.audience?.position);Object.assign(audience,copyTextObject(analysis.audience||{},['label'],160));
  const mediaPublic=copyTextObject(analysis.mediaPublic||{},['direction','label','diagnosis'],600);
  const whyNow=cleanText(view.whyNow,1200);
  const related=(Array.isArray(view.related)?view.related:[]).slice(0,8).map(compactRelated).filter(Boolean);
  const sections=['identity','rank','calculated','external'];if(Object.keys(scores).length)sections.push('intelligence');if(signal.label||signal.diagnosis)sections.push('signal');if(headlines.length)sections.push('newsEvidence');if(related.length)sections.push('competitors');
  return {
    schemaVersion:2,immutable:true,source:'FULL_SNAPSHOT',completeness:'FULL',accessScope:V2_ACCESS,versions:{...V2_VERSIONS},
    draftId:cleanText(meta.draftId||view.draftId,180),publishedAt:meta.publishedAt||view.publishedAt||null,
    person:{id:cleanText(person.id,100),name:cleanText(person.name,100),type:cleanText(person.type||person.entityType,60),party:cleanText(person.party,100),jurisdiction:cleanText(person.jurisdiction||person.constituency,160),office:cleanText(person.office,120)},
    rank,calculated,
    intelligence:{scores,grades,audience,signal,mediaPublic,whyNow},
    external,
    related,
    weights:{search:roundFinite(meta.weights?.search),news:roundFinite(meta.weights?.news)},
    providers:Array.isArray(meta.providers)?meta.providers.map(x=>cleanText(x,80)).filter(Boolean).slice(0,8):[],
    coverage:{sections,coreScores:CORE_SCORE_KEYS.filter(key=>Object.hasOwn(scores,key)),allScores:Object.keys(scores)}
  };
}

function buildLegacyPartialObservation(input={}){
  const scores=copyNumberObject(input.scores||{});
  const calculated={};putNumber(calculated,'nowIndex',input.score);putNumber(calculated,'searchScore',input.searchScore);putNumber(calculated,'newsScore',input.newsScore);
  const rank={};putNumber(rank,'global',input.globalRank,0);putNumber(rank,'category',input.categoryRank,0);
  const external={};
  if(input.external?.search){const search={};putNumber(search,'monthlyTotalQcCnt',input.external.search.monthlyTotalQcCnt,0);if(Object.keys(search).length)external.search=search;}
  if(input.external?.news){const news={};putNumber(news,'count24',input.external.news.count24,0);if(Object.keys(news).length)external.news=news;}
  const sections=['rank'];if(Object.keys(scores).length)sections.push('intelligence');if(Object.keys(calculated).length)sections.push('calculated');if(Object.keys(external).length)sections.push('external');
  return {
    schemaVersion:2,immutable:true,source:'LEGACY_PARTIAL',completeness:'PARTIAL',accessScope:V2_ACCESS,versions:{...V2_VERSIONS},
    draftId:cleanText(input.draftId,180),publishedAt:input.publishedAt||null,person:{id:cleanText(input.personId,100)},rank,calculated,
    intelligence:{scores},external,related:[],coverage:{sections,coreScores:CORE_SCORE_KEYS.filter(key=>Object.hasOwn(scores,key)),allScores:Object.keys(scores)}
  };
}

function firstLastAvailable(observations,getter){
  let first=null,last=null;
  for(const row of observations){const value=finite(getter(row));if(value===null)continue;if(first===null)first=value;last=value;}
  return {first,last};
}
function deltaFrom(observations,getter){const {first,last}=firstLastAvailable(observations,getter);return first===null||last===null?null:roundFinite(last-first);}
function latestAvailable(observations,getter){for(let i=observations.length-1;i>=0;i--){const value=finite(getter(observations[i]));if(value!==null)return value;}return null;}
function availableSeries(observations,getter){const values=[];for(const row of observations){const value=finite(getter(row));if(value!==null)values.push(value);}return values;}
function volatilityFrom(observations,getter){
  const values=availableSeries(observations,getter);if(values.length<2)return null;
  const deltas=[];for(let i=1;i<values.length;i++)deltas.push(values[i]-values[i-1]);
  const mean=deltas.reduce((sum,value)=>sum+value,0)/deltas.length;
  const variance=deltas.reduce((sum,value)=>sum+((value-mean)**2),0)/deltas.length;
  return roundFinite(Math.sqrt(variance));
}
function deriveWindowSummary(observations=[]){
  const rows=(Array.isArray(observations)?observations:[]).filter(Boolean).slice().sort((a,b)=>(Date.parse(a.publishedAt)||0)-(Date.parse(b.publishedAt)||0));
  const coreDeltas={},momentum={},volatility={};for(const key of CORE_SCORE_KEYS){const getter=row=>row?.intelligence?.scores?.[key];coreDeltas[key]=deltaFrom(rows,getter);momentum[key]=coreDeltas[key];volatility[key]=volatilityFrom(rows,getter);}
  const rankDelta={global:null,category:null};
  const globalPair=firstLastAvailable(rows,row=>row?.rank?.global);if(globalPair.first!==null&&globalPair.last!==null)rankDelta.global=Math.round((globalPair.first-globalPair.last)*10)/10;
  const categoryPair=firstLastAvailable(rows,row=>row?.rank?.category);if(categoryPair.first!==null&&categoryPair.last!==null)rankDelta.category=Math.round((categoryPair.first-categoryPair.last)*10)/10;
  const latestScores={};for(const key of CORE_SCORE_KEYS)latestScores[key]=latestAvailable(rows,row=>row?.intelligence?.scores?.[key]);
  return {version:V2_VERSIONS.derived,sampleSize:rows.length,coreDeltas,momentum,volatility,rankDelta,latest:{publishedAt:rows.at(-1)?.publishedAt||null,globalRank:latestAvailable(rows,row=>row?.rank?.global),categoryRank:latestAvailable(rows,row=>row?.rank?.category),scores:latestScores}};
}

module.exports={V2_VERSIONS,V2_PREFIX,V2_ACCESS,V2_SNAPSHOT_INDEX_KEY,V2_EVENT_INDEX_KEY,CORE_SCORE_KEYS,ALL_SCORE_KEYS,v2SnapshotKey,v2ObservationKey,v2ObservationIndexKey,v2EventKey,buildFullObservation,buildLegacyPartialObservation,deriveWindowSummary,roundFinite};
