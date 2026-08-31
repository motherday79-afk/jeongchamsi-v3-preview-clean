'use strict';

const zlib=require('node:zlib');
const redis=require('../../../lib/v3/redis');
let derivePersonView;
try{({derivePersonView}=require('./now-public-signals'));}
catch{derivePersonView=()=>{throw new Error('NOW_PUBLIC_SIGNALS_REQUIRED');};}
const {derivePoliticalIntelligenceV1,VERSION:ANALYSIS_VERSION}=require('./political-intelligence-v1');
const {getPoliticalIntelligenceEvidence}=require('../data/political-intelligence-evidence');
const {deriveWindowSummary}=require('./history-v2-core');

const STORE_VERSION='JCS_POLITICAL_INTELLIGENCE_SNAPSHOT_V1';
const PREFIX='jcv3:intelligence:v1';
const INDEX_KEY=`${PREFIX}:snapshots`;
const ACCESS_SCOPE='INTERNAL_ADMIN';
const MAX_COMPRESSED_BYTES=800_000;

function cleanSegment(value=''){return String(value||'').trim().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);}
function snapshotKey(draftId){return `${PREFIX}:snapshot:${cleanSegment(draftId)}`;}
function encodeSnapshot(value){const gz=zlib.gzipSync(Buffer.from(JSON.stringify(value)),{level:9});return {encoded:`gz1:${gz.toString('base64')}`,compressedBytes:gz.length};}
function decodeSnapshot(raw){
  if(!raw)return null;const text=String(raw);
  try{if(text.startsWith('gz1:'))return JSON.parse(zlib.gunzipSync(Buffer.from(text.slice(4),'base64')).toString('utf8'));return JSON.parse(text);}catch{return null;}
}
function koreaDateKey(value){const ms=Date.parse(value||'');return Number.isFinite(ms)?new Date(ms+9*3600000).toISOString().slice(0,10):'';}
function historyFromPersonTrend(view={}){
  const observations=(Array.isArray(view?.trend?.points)?view.trend.points:[]).map(point=>({
    publishedAt:point?.publishedAt||null,
    rank:{global:Number.isFinite(Number(point?.globalRank))?Number(point.globalRank):null,category:Number.isFinite(Number(point?.categoryRank))?Number(point.categoryRank):null},
    intelligence:{scores:{...(point?.scores||{})}}
  })).filter(x=>x.publishedAt).sort((a,b)=>(Date.parse(a.publishedAt)||0)-(Date.parse(b.publishedAt)||0));
  const summary=deriveWindowSummary(observations),days=[...new Set(observations.map(x=>koreaDateKey(x.publishedAt)).filter(Boolean))];
  summary.rawSampleSize=observations.length;summary.dailySampleSize=days.length;summary.normalization='RAW_INTRADAY';
  return {observations,daily:days.map(date=>({date})),summary,events:[],rangeDays:30};
}
function personViewMap(personViews=[]){
  const map=new Map();
  for(const entry of Array.isArray(personViews)?personViews:[]){const view=Array.isArray(entry)?entry[1]:entry;const id=String(view?.row?.person?.id||'');if(id)map.set(id,view);}
  return map;
}
function sourceSummary(bundle={}){return {
  version:String(bundle?.version||''),collectedAt:bundle?.collectedAt||null,recordCount:Number(bundle?.recordCount??bundle?.records?.length)||0,matchedPeople:Number(bundle?.matchedPeople)||0,
  sources:(Array.isArray(bundle?.sources)?bundle.sources:[]).map(x=>({sourceId:String(x?.sourceId||''),institution:String(x?.institution||''),url:String(x?.url||''),ok:Boolean(x?.ok),records:Number(x?.records)||0,error:x?.error?String(x.error).slice(0,240):''})).slice(0,12),
  warnings:(Array.isArray(bundle?.warnings)?bundle.warnings:[]).map(x=>({sourceId:String(x?.sourceId||''),error:String(x?.error||'').slice(0,240)})).slice(0,20)
};}

function createPoliticalIntelligenceStore(overrides={}){
  const deps={command:redis.command,derivePersonView,derivePoliticalIntelligenceV1,getPoliticalIntelligenceEvidence,...overrides};

  async function recordPoliticalIntelligenceSnapshotV1({current={},legacyHistory={items:[]},personViews=[],evidenceBundle={records:[]}}={}){
    const draftId=String(current?.draftId||'').trim(),publishedAt=current?.publishedAt||null;
    if(!draftId||!publishedAt||!Array.isArray(current?.ranked)||!current.ranked.length)return {ok:false,error:'JCS_INTELLIGENCE_SNAPSHOT_INPUT_REQUIRED'};
    const key=snapshotKey(draftId),existing=await deps.command(['GET',key]);
    if(existing){const decoded=decodeSnapshot(existing);return {ok:true,created:false,draftId,analysisAt:decoded?.publishedAt||null,snapshotKind:decoded?.snapshotKind||'PUBLISHED',rosterTotal:Number(decoded?.rosterTotal)||current.ranked.length,compressedBytes:Buffer.byteLength(String(existing)),evidenceRecords:Number(decoded?.evidenceCollection?.recordCount)||0,matchedPeople:Number(decoded?.evidenceCollection?.matchedPeople)||0};}
    const views=personViewMap(personViews),people={};
    for(const row of current.ranked){
      const id=String(row?.person?.id||'').trim();if(!id)continue;
      const view=views.get(id)||deps.derivePersonView(current,legacyHistory||{items:[]},id,Date.parse(publishedAt));if(!view?.row)continue;
      const history=historyFromPersonTrend(view);
      const evidence=deps.getPoliticalIntelligenceEvidence(id,{asOf:publishedAt,dynamicBundle:evidenceBundle,person:view.row.person||row.person||null});
      const result=deps.derivePoliticalIntelligenceV1({view,history,evidence,asOf:publishedAt});if(result)people[id]=result;
    }
    const snapshot={schemaVersion:1,immutable:true,accessScope:ACCESS_SCOPE,storeVersion:STORE_VERSION,analysisVersion:ANALYSIS_VERSION,draftId,publishedAt,snapshotKind:String(current?.snapshotKind||'PUBLISHED'),rosterTotal:Object.keys(people).length,evidenceCollection:sourceSummary(evidenceBundle),people};
    const packed=encodeSnapshot(snapshot);if(packed.compressedBytes>MAX_COMPRESSED_BYTES){const error=new Error('JCS_INTELLIGENCE_SNAPSHOT_TOO_LARGE');error.code='STORAGE_REQUEST';throw error;}
    const created=Boolean(await deps.command(['SET',key,packed.encoded,'NX']));
    if(created)await deps.command(['ZADD',INDEX_KEY,String(Date.parse(publishedAt)||Date.now()),draftId]);
    return {ok:true,created,draftId,analysisAt:publishedAt,snapshotKind:snapshot.snapshotKind,rosterTotal:snapshot.rosterTotal,compressedBytes:packed.compressedBytes,evidenceRecords:snapshot.evidenceCollection.recordCount,matchedPeople:snapshot.evidenceCollection.matchedPeople};
  }

  async function readPoliticalIntelligenceSnapshotV1(draftId){const id=String(draftId||'').trim();if(!id)return null;return decodeSnapshot(await deps.command(['GET',snapshotKey(id)]));}
  async function readPoliticalIntelligenceSnapshotPersonV1(draftId,personId){const snap=await readPoliticalIntelligenceSnapshotV1(draftId);return snap?.people?.[String(personId||'')]||null;}
  async function readLatestPoliticalIntelligenceSnapshotPersonV1(personId){const ids=await deps.command(['ZREVRANGE',INDEX_KEY,0,0]);const draftId=Array.isArray(ids)?ids[0]||'':'';return draftId?readPoliticalIntelligenceSnapshotPersonV1(draftId,personId):null;}

  return {recordPoliticalIntelligenceSnapshotV1,readPoliticalIntelligenceSnapshotV1,readPoliticalIntelligenceSnapshotPersonV1,readLatestPoliticalIntelligenceSnapshotPersonV1,_deps:deps};
}

const defaults=createPoliticalIntelligenceStore();
module.exports={STORE_VERSION,PREFIX,INDEX_KEY,ACCESS_SCOPE,MAX_COMPRESSED_BYTES,snapshotKey,encodeSnapshot,decodeSnapshot,historyFromPersonTrend,createPoliticalIntelligenceStore,...defaults};
