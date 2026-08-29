'use strict';

const zlib=require('node:zlib');
const redis=require('../../../lib/v3/redis');
const {derivePersonView}=require('./now-public-signals');
const {derivePoliticalIntelligenceV1}=require('./political-intelligence-v1');
const {derivePoliticalIntelligenceV2,VERSION:ANALYSIS_VERSION,ENGINE_VERSION}=require('./political-intelligence-v2');
const {deriveMarketContextV2}=require('./age-gender-cohort-core');
const {getPoliticalIntelligenceEvidence}=require('../data/political-intelligence-evidence');
const {getAgeGenderBaselineV2,hasTrustedBaselineV2,COHORT_KEYS,BASELINE_VERSION}=require('./age-gender-baseline-v2');
const {readAgeGenderBaselineBundleV2}=require('./age-gender-baseline-v2-store');
const {historyFromPersonTrend}=require('./political-intelligence-store');

const STORE_VERSION='JCS_POLITICAL_INTELLIGENCE_SNAPSHOT_V2';
const PREFIX='jcv3:intelligence:v2';
const INDEX_KEY=`${PREFIX}:snapshots`;
const ACCESS_SCOPE='INTERNAL_ADMIN';
const MAX_COMPRESSED_BYTES=650_000;
const COMPONENT_KEYS=['personalEffect','partyEffect','regionalEffect','competitorEffect','issueEffect','externalAnchorEffect','historyPriorEffect'];
const AGE_LABELS=['18-29','30-39','40-49','50-59','60-69','70+'];

function cleanSegment(value=''){return String(value||'').trim().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);}
function snapshotKey(draftId){return `${PREFIX}:snapshot:${cleanSegment(draftId)}`;}
function encodeSnapshot(value){const gz=zlib.gzipSync(Buffer.from(JSON.stringify(value)),{level:9});return {encoded:`gz2:${gz.toString('base64')}`,compressedBytes:gz.length};}
function decodeSnapshot(raw){if(!raw)return null;const text=String(raw);try{if(text.startsWith('gz2:'))return JSON.parse(zlib.gunzipSync(Buffer.from(text.slice(4),'base64')).toString('utf8'));return JSON.parse(text);}catch{return null;}}
function bitmask(cells={}){let mask=0;for(let i=0;i<COHORT_KEYS.length;i++)if(cells?.[COHORT_KEYS[i]]?.status==='VALID_SIGNAL')mask|=(1<<i);return mask;}
function packAgg(obj={},labels=[]){return labels.map(k=>{const r=obj?.[k]||{};return [r.value??null,r.confidence??null,r.status==='VALID_SIGNAL'?1:0];});}
function unpackAgg(rows=[],labels=[]){return Object.fromEntries(labels.map((k,i)=>{const r=rows?.[i]||[];return [k,{value:r[0]??null,confidence:r[1]??null,status:r[2]===1?'VALID_SIGNAL':'LIMITED_SIGNAL'}];}));}
function packCohorts(cohorts={}){
  const cells=cohorts?.cells||{},mask=bitmask(cells),components={};for(const ck of COMPONENT_KEYS)components[ck]=COHORT_KEYS.map(k=>cells?.[k]?.components?.[ck]??0);
  return {a:cohorts.asOf||null,b:[cohorts?.baseline?.kind||'LIMITED',Number(cohorts?.baseline?.quality)||0,cohorts?.baseline?.sourceState||'',Array.isArray(cohorts?.baseline?.limitedReasons)?cohorts.baseline.limitedReasons.slice(0,8):[]],v:COHORT_KEYS.map(k=>cells?.[k]?.value??null),c:COHORT_KEYS.map(k=>cells?.[k]?.confidence??null),s:mask,l:COHORT_KEYS.map(k=>cells?.[k]?.lastValidatedAt||null),r:COHORT_KEYS.map(k=>cells?.[k]?.reason||null),x:components,e:[Number(cohorts?.validity?.evidenceCount)||0,Number(cohorts?.validity?.independentEventCount)||0,Number(cohorts?.validity?.historyDays)||0,Number(cohorts?.validity?.confidenceThreshold)||55],ag:packAgg(cohorts?.age,AGE_LABELS),gg:packAgg(cohorts?.gender,['MALE','FEMALE']),sm:cohorts?.summary||{},vc:Number(cohorts?.validity?.validCellCount)||0};
}
function unpackCohorts(packed={}){
  const baseline={kind:packed?.b?.[0]||'LIMITED',quality:Number(packed?.b?.[1])||0,sourceState:packed?.b?.[2]||'',limitedReasons:Array.isArray(packed?.b?.[3])?packed.b[3]:[]},e=packed?.e||[],cells={};
  for(let i=0;i<COHORT_KEYS.length;i++){const key=COHORT_KEYS[i],valid=Boolean((Number(packed.s)||0)&(1<<i)),components={};for(const ck of COMPONENT_KEYS)components[ck]=packed?.x?.[ck]?.[i]??0;cells[key]={key,value:valid?(packed?.v?.[i]??null):null,status:valid?'VALID_SIGNAL':'LIMITED_SIGNAL',confidence:valid?(packed?.c?.[i]??null):null,baselineQuality:baseline.quality,evidenceCount:Number(e[0])||0,independentEventCount:Number(e[1])||0,historyDays:Number(e[2])||0,lastValidatedAt:packed?.l?.[i]||null,reason:valid?null:(packed?.r?.[i]||'CONFIDENCE_BELOW_THRESHOLD'),components};}
  const validCellCount=Object.values(cells).filter(x=>x.status==='VALID_SIGNAL').length;
  return {engineVersion:ENGINE_VERSION,asOf:packed.a||null,baseline,cells,age:unpackAgg(packed.ag,AGE_LABELS),gender:unpackAgg(packed.gg,['MALE','FEMALE']),summary:packed.sm||{},validity:{state:validCellCount?'VALID_SIGNAL':'LIMITED_SIGNAL',validCellCount,totalCellCount:12,evidenceCount:Number(e[0])||0,independentEventCount:Number(e[1])||0,historyDays:Number(e[2])||0,confidenceThreshold:Number(e[3])||55}};
}
function personViewMap(personViews=[]){const map=new Map();for(const entry of Array.isArray(personViews)?personViews:[]){const view=Array.isArray(entry)?entry[1]:entry;const id=String(view?.row?.person?.id||'');if(id)map.set(id,view);}return map;}

function createPoliticalIntelligenceV2Store(overrides={}){
  const deps={command:redis.command,derivePersonView,derivePoliticalIntelligenceV1,derivePoliticalIntelligenceV2,getPoliticalIntelligenceEvidence,getAgeGenderBaselineV2,hasTrustedBaselineV2,readAgeGenderBaselineBundleV2,deriveMarketContextV2,...overrides};const legacyBaselineOverrides=Object.prototype.hasOwnProperty.call(overrides,'hasTrustedBaselineV2')||Object.prototype.hasOwnProperty.call(overrides,'getAgeGenderBaselineV2');let latestCacheDraftId='',latestCacheSnapshot=null;
  async function readPoliticalIntelligenceSnapshotV2(draftId){const id=String(draftId||'').trim();if(!id)return null;return decodeSnapshot(await deps.command(['GET',snapshotKey(id)]));}
  async function readPoliticalIntelligenceSnapshotPersonV2(draftId,personId){const snap=await readPoliticalIntelligenceSnapshotV2(draftId);const packed=snap?.people?.[String(personId||'')];return packed?{version:ANALYSIS_VERSION,engineVersion:ENGINE_VERSION,storeVersion:STORE_VERSION,draftId:snap.draftId,publishedAt:snap.publishedAt,cohorts:unpackCohorts(packed)}:null;}
  async function latestSnapshot(){const ids=await deps.command(['ZREVRANGE',INDEX_KEY,0,0]),draftId=Array.isArray(ids)?ids[0]||'':'';if(!draftId)return null;if(draftId!==latestCacheDraftId||!latestCacheSnapshot){latestCacheSnapshot=await readPoliticalIntelligenceSnapshotV2(draftId);latestCacheDraftId=draftId;}return latestCacheSnapshot;}
  async function readLatestPoliticalIntelligenceSnapshotPersonV2(personId){const snap=await latestSnapshot();const packed=snap?.people?.[String(personId||'')];return packed?{version:ANALYSIS_VERSION,engineVersion:ENGINE_VERSION,storeVersion:STORE_VERSION,draftId:snap.draftId,publishedAt:snap.publishedAt,cohorts:unpackCohorts(packed)}:null;}
  async function recordPoliticalIntelligenceSnapshotV2({current={},legacyHistory={items:[]},personViews=[],evidenceBundle={records:[]}}={}){
    let baselineBundle=null,baselineForPerson=null,trusted=false;
    if(legacyBaselineOverrides){trusted=Boolean(deps.hasTrustedBaselineV2());baselineForPerson=id=>deps.getAgeGenderBaselineV2(id);}
    else{baselineBundle=await deps.readAgeGenderBaselineBundleV2();trusted=Boolean(baselineBundle?.manifest?.trustedBaselineReady);baselineForPerson=id=>baselineBundle?.people?.[String(id||'')]||null;}
    if(!trusted)return {ok:false,skipped:true,error:'BASELINE_INGESTION_REQUIRED',baselineVersion:baselineBundle?.baselineVersion||BASELINE_VERSION,baselineManifest:baselineBundle?.manifest||null};
    const draftId=String(current?.draftId||'').trim(),publishedAt=current?.publishedAt||null;if(!draftId||!publishedAt||!Array.isArray(current?.ranked)||!current.ranked.length)return {ok:false,error:'JCS_INTELLIGENCE_V2_SNAPSHOT_INPUT_REQUIRED'};
    const existing=await deps.command(['GET',snapshotKey(draftId)]);if(existing){const d=decodeSnapshot(existing);return {ok:true,created:false,draftId,analysisAt:d?.publishedAt||publishedAt,rosterTotal:Number(d?.rosterTotal)||0,compressedBytes:Buffer.byteLength(String(existing)),baselineVersion:d?.baselineVersion||BASELINE_VERSION};}
    const previous=await latestSnapshot(),views=personViewMap(personViews),allViews=[...views.values()],people={};
    for(const row of current.ranked){const id=String(row?.person?.id||row?.id||'').trim();if(!id)continue;const view=views.get(id)||deps.derivePersonView(current,legacyHistory||{items:[]},id,Date.parse(publishedAt));if(!view?.row)continue;const history=historyFromPersonTrend(view),evidence=deps.getPoliticalIntelligenceEvidence(id,{asOf:publishedAt,dynamicBundle:evidenceBundle,person:view.row.person||row.person||null}),baseline=baselineForPerson(id);if(!baseline)continue;const v1=deps.derivePoliticalIntelligenceV1({view,history,evidence,asOf:publishedAt});const prevPacked=previous?.people?.[id],previousV2=prevPacked?{cohorts:unpackCohorts(prevPacked)}:null;const marketContext=deps.deriveMarketContextV2({view,allViews});const v2=deps.derivePoliticalIntelligenceV2({v1,view,history,evidence,baseline,previousV2,marketContext,asOf:publishedAt});people[id]=packCohorts(v2.cohorts);}
    const snapshot={schemaVersion:2,immutable:true,accessScope:ACCESS_SCOPE,storeVersion:STORE_VERSION,analysisVersion:ANALYSIS_VERSION,engineVersion:ENGINE_VERSION,baselineVersion:BASELINE_VERSION,draftId,publishedAt,snapshotKind:String(current?.snapshotKind||'PUBLISHED'),rosterTotal:Object.keys(people).length,people};const packed=encodeSnapshot(snapshot);if(packed.compressedBytes>MAX_COMPRESSED_BYTES){const error=new Error('JCS_INTELLIGENCE_V2_SNAPSHOT_TOO_LARGE');error.code='STORAGE_REQUEST';throw error;}const created=Boolean(await deps.command(['SET',snapshotKey(draftId),packed.encoded,'NX']));if(created)await deps.command(['ZADD',INDEX_KEY,String(Date.parse(publishedAt)||Date.now()),draftId]);if(created){latestCacheDraftId=draftId;latestCacheSnapshot=snapshot;}return {ok:true,created,draftId,analysisAt:publishedAt,rosterTotal:snapshot.rosterTotal,compressedBytes:packed.compressedBytes,baselineVersion:BASELINE_VERSION};
  }
  return {recordPoliticalIntelligenceSnapshotV2,readPoliticalIntelligenceSnapshotV2,readPoliticalIntelligenceSnapshotPersonV2,readLatestPoliticalIntelligenceSnapshotPersonV2,_deps:deps};
}
const defaults=createPoliticalIntelligenceV2Store();
module.exports={STORE_VERSION,PREFIX,INDEX_KEY,ACCESS_SCOPE,MAX_COMPRESSED_BYTES,COMPONENT_KEYS,snapshotKey,encodeSnapshot,decodeSnapshot,packCohorts,unpackCohorts,createPoliticalIntelligenceV2Store,...defaults};
