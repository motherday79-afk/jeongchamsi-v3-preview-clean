const VERSIONS=Object.freeze({now:'JCS_NOW_V1',pipeline:'JCS_HISTORY_PIPELINE_V1',derived:'JCS_DERIVED_V1'});
const ACCESS=Object.freeze({PUBLIC:'PUBLIC',INTERNAL_ADMIN:'INTERNAL_ADMIN',FUTURE_B2B:'FUTURE_B2B'});
const CURRENT_ACCESS=ACCESS.INTERNAL_ADMIN;
const PREFIX='jcv3:history:v1';

function cleanSegment(value=''){return String(value||'').trim().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);}
function round(value,digits=1){const n=Number(value);if(!Number.isFinite(n))return 0;const p=10**digits;return Math.round(n*p)/p;}
function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}
function snapshotKey(draftId){return `${PREFIX}:snapshot:${cleanSegment(draftId)}`;}
function observationKey(personId,publishId){return `${PREFIX}:observation:${cleanSegment(personId)}:${cleanSegment(publishId)}`;}
function observationIndexKey(personId){return `${PREFIX}:observations:${cleanSegment(personId)}`;}
const SNAPSHOT_INDEX_KEY=`${PREFIX}:snapshots`;
const EVENT_INDEX_KEY=`${PREFIX}:events`;

function snapshotPersonRow(row={}){
  const p=row.person||{};
  return {
    person:{id:String(p.id||''),name:String(p.name||''),type:String(p.type||p.entityType||''),party:String(p.party||''),jurisdiction:String(p.jurisdiction||p.constituency||''),office:String(p.office||'')},
    rank:{global:num(row.rank)},
    calculated:{score:round(row.score),searchScore:round(row.searchScore),newsScore:round(row.newsScore)},
    external:{
      search:{state:String(row.search?.state||''),monthlyPcQcCnt:num(row.search?.monthlyPcQcCnt),monthlyMobileQcCnt:num(row.search?.monthlyMobileQcCnt),monthlyTotalQcCnt:num(row.search?.monthlyTotalQcCnt),ambiguousName:Boolean(row.search?.ambiguousName)},
      news:{state:String(row.news?.state||''),count6:num(row.news?.count6),count24:num(row.news?.count24),count7d:num(row.news?.count7d),sources24:num(row.news?.sources24)}
    },
    providers:Array.isArray(row.providers)?row.providers.map(String).slice(0,8):[]
  };
}

function buildSnapshot(current={}){
  const ranked=Array.isArray(current.ranked)?current.ranked:[];
  return {
    schemaVersion:1,immutable:true,versions:{...VERSIONS},accessScope:CURRENT_ACCESS,
    draftId:String(current.draftId||''),publishedAt:current.publishedAt||null,
    weights:{search:num(current.weights?.search),news:num(current.weights?.news)},
    providers:Array.isArray(current.providers)?current.providers.map(String).slice(0,8):[],
    rosterTotal:ranked.length,people:ranked.map(snapshotPersonRow)
  };
}

const ACTION_ALLOWLIST=new Set(['favorite-toggle','recent-record','post-like','poll-vote','generation-vote','national-evaluation-vote','academy-apply','user-post-save']);
function safeId(value=''){return String(value||'').trim().slice(0,160);}
function sanitizeActionSignal(kind,payload={}){
  const action=String(kind||'');if(!ACTION_ALLOWLIST.has(action))return null;
  const out={kind:action};
  for(const key of ['personId','domain','postId','pollId','optionId','ageGroup','evaluationId','rating','slotId']){
    const value=safeId(payload?.[key]);if(value)out[key]=value;
  }
  return out;
}

function legacyTopRow(personId,item={}){
  return (Array.isArray(item.top30)?item.top30:[]).find(row=>String(row?.person?.id||'')===String(personId))||null;
}
function mergeLegacyObservations(personId,trendPoints=[],historyItems=[]){
  const map=new Map();
  const upsert=(key,patch)=>{if(!key)return;map.set(key,{...(map.get(key)||{}),...patch});};
  for(const point of Array.isArray(trendPoints)?trendPoints:[]){
    const key=String(point?.draftId||point?.publishedAt||'');if(!key)continue;
    upsert(key,{personId:String(personId),draftId:String(point?.draftId||''),publishedAt:point?.publishedAt||null,globalRank:num(point?.globalRank),categoryRank:num(point?.categoryRank),scores:point?.scores&&typeof point.scores==='object'?{...point.scores}:{}});
  }
  for(const item of Array.isArray(historyItems)?historyItems:[]){
    const row=legacyTopRow(personId,item);if(!row)continue;
    const key=String(item?.draftId||item?.publishedAt||'');if(!key)continue;
    const existing=map.get(key)||{};
    upsert(key,{personId:String(personId),draftId:String(item?.draftId||''),publishedAt:item?.publishedAt||null,globalRank:existing.globalRank||num(row.rank),categoryRank:existing.categoryRank||0,scores:existing.scores||{},score:round(row.score),searchScore:round(row.searchScore),newsScore:round(row.newsScore),external:{search:{monthlyTotalQcCnt:num(row.search?.monthlyTotalQcCnt)},news:{count24:num(row.news?.count24)}}});
  }
  return [...map.values()].sort((a,b)=>(Date.parse(a.publishedAt)||0)-(Date.parse(b.publishedAt)||0)||String(a.draftId).localeCompare(String(b.draftId)));
}
function observationScore(observation={}){const direct=Number(observation.score);if(Number.isFinite(direct))return direct;const fallback=Number(observation.scores?.overallInterest);return Number.isFinite(fallback)?fallback:0;}
function deriveHistoryMetrics(observations=[]){
  const values=(Array.isArray(observations)?observations:[]).map(observationScore);
  if(!values.length)return {version:VERSIONS.derived,sampleSize:0,momentum:0,volatility:0};
  const deltas=values.slice(1).map((v,i)=>v-values[i]);
  const mean=deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:0;
  const variance=deltas.length?deltas.reduce((sum,v)=>sum+(v-mean)**2,0)/deltas.length:0;
  return {version:VERSIONS.derived,sampleSize:values.length,momentum:round(values.at(-1)-values[0]),volatility:round(Math.sqrt(variance))};
}

module.exports={VERSIONS,ACCESS,CURRENT_ACCESS,PREFIX,SNAPSHOT_INDEX_KEY,EVENT_INDEX_KEY,snapshotKey,observationKey,observationIndexKey,snapshotPersonRow,buildSnapshot,sanitizeActionSignal,mergeLegacyObservations,observationScore,deriveHistoryMetrics,round};
