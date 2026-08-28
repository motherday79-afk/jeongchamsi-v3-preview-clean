const {command,pipeline,getJSON,mgetJSON,mgetRawJSON}=require('../../../lib/v3/redis');
const {allPeople}=require('./politician-live-roster');
const {VERSIONS,ACCESS,CURRENT_ACCESS,SNAPSHOT_INDEX_KEY,EVENT_INDEX_KEY,snapshotKey,observationKey,observationIndexKey,buildSnapshot,sanitizeActionSignal,mergeLegacyObservations,deriveHistoryMetrics}=require('./history-core');

const BACKFILL_PAGE_SIZE=25;
function isoMs(value){const t=Date.parse(value||'');return Number.isFinite(t)?t:Date.now();}
function publishIdentity(observation={}){return String(observation.draftId||`legacy-${isoMs(observation.publishedAt)}`);}
function snapshotObservation(person={},snapshot={}){return {personId:person.person?.id||'',draftId:snapshot.draftId,publishedAt:snapshot.publishedAt,globalRank:Number(person.rank?.global)||0,score:Number(person.calculated?.score)||0,searchScore:Number(person.calculated?.searchScore)||0,newsScore:Number(person.calculated?.newsScore)||0,external:person.external||{},versions:{...snapshot.versions},source:'FORMAL_SNAPSHOT'};}
async function runPipelineChunks(commands,size=200){for(let i=0;i<commands.length;i+=size)await pipeline(commands.slice(i,i+size));}

async function recordPublishedSnapshot(current={}){
  const snapshot=buildSnapshot(current);if(!snapshot.draftId||!snapshot.publishedAt)return {ok:false,error:'HISTORY_SNAPSHOT_ID_REQUIRED'};
  const stored=await command(['SET',snapshotKey(snapshot.draftId),JSON.stringify(snapshot),'NX']);
  if(!stored)return {ok:true,created:false,draftId:snapshot.draftId};
  const ts=isoMs(snapshot.publishedAt),commands=[['ZADD',SNAPSHOT_INDEX_KEY,ts,snapshot.draftId]];
  for(const person of snapshot.people){
    const id=String(person.person?.id||'');if(!id)continue;const observation=snapshotObservation(person,snapshot);
    commands.push(['SET',observationKey(id,snapshot.draftId),JSON.stringify(observation),'NX']);
    commands.push(['ZADD',observationIndexKey(id),ts,snapshot.draftId]);
  }
  await runPipelineChunks(commands);
  return {ok:true,created:true,draftId:snapshot.draftId,rosterTotal:snapshot.rosterTotal};
}

async function backfillLegacyPage({cursor=0,pageSize=BACKFILL_PAGE_SIZE}={}){
  cursor=Math.max(0,Number(cursor)||0);pageSize=Math.max(1,Math.min(BACKFILL_PAGE_SIZE,Number(pageSize)||BACKFILL_PAGE_SIZE));
  const roster=allPeople(),people=roster.slice(cursor,cursor + pageSize);
  const [personViews,legacyHistory]=await Promise.all([mgetJSON(people.map(person=>`nowDataPersonPublic:${person.id}`)),getJSON('nowDataHistory')]);
  const historyItems=Array.isArray(legacyHistory?.items)?legacyHistory.items:[];
  const candidates=[];
  people.forEach((person,index)=>{const points=Array.isArray(personViews[index]?.trend?.points)?personViews[index].trend.points:[];for(const observation of mergeLegacyObservations(person.id,points,historyItems))candidates.push(observation);});
  const draftIds=[...new Set(candidates.map(x=>String(x.draftId||'')).filter(Boolean))];
  const snapshotKeys=draftIds.map(snapshotKey);
  const formalSnapshots=await mgetRawJSON(snapshotKeys);
  const formalSnapshotIds=new Set(draftIds.filter((id,index)=>Boolean(formalSnapshots[index])));
  const pending=candidates.filter(x=>!x.draftId || !formalSnapshotIds.has(String(x.draftId)));
  const commands=[];
  for(const observation of pending){
    const id=String(observation.personId||'');const publishId=publishIdentity(observation);if(!id||!publishId)continue;const ts=isoMs(observation.publishedAt);
    const stored={...observation,versions:{now:VERSIONS.now,pipeline:VERSIONS.pipeline,derived:VERSIONS.derived},accessScope:CURRENT_ACCESS,source:'LEGACY_BACKFILL'};
    commands.push(["SET",observationKey(id,publishId),JSON.stringify(stored),"NX"]);
    commands.push(['ZADD',observationIndexKey(id),ts,publishId]);
  }
  if(commands.length)await pipeline(commands);
  const nextCursor=Math.min(roster.length,cursor+people.length),done=nextCursor>=roster.length;
  return {ok:true,cursor,nextCursor,done,total:roster.length,pageSize:BACKFILL_PAGE_SIZE,processed:people.length,candidates:candidates.length,skippedFormal:candidates.length-pending.length,written:Math.floor(commands.length/2)};
}

function actionField(signal){return Object.entries(signal).map(([k,v])=>`${k}=${String(v).replace(/[|=]/g,'_')}`).join('|');}
async function recordActionSignal(kind,payload={}){
  const signal=sanitizeActionSignal(kind,payload);if(!signal)return {ok:false,ignored:true};
  const day=new Date().toISOString().slice(0,10),key=`jcv3:history:v1:actions:${day}`;
  await command(['HINCRBY',key,actionField(signal),1]);
  return {ok:true,day};
}

async function appendPoliticalEvent(input={}){
  const occurredAt=input.occurredAt&&Number.isFinite(Date.parse(input.occurredAt))?new Date(input.occurredAt).toISOString():new Date().toISOString();
  const eventId=String(input.eventId||`event-${Date.now().toString(36)}`).replace(/[^A-Za-z0-9._-]/g,'_').slice(0,120);
  const event={eventId,occurredAt,title:String(input.title||'').trim().slice(0,180),category:String(input.category||'').trim().slice(0,60),personIds:Array.isArray(input.personIds)?input.personIds.map(String).filter(Boolean).slice(0,30):[],sourceUrl:String(input.sourceUrl||'').trim().slice(0,1200),note:String(input.note||'').trim().slice(0,1000),versions:{...VERSIONS},accessScope:CURRENT_ACCESS,immutable:true};
  if(!event.title)return {ok:false,error:'EVENT_TITLE_REQUIRED'};
  const key=`jcv3:history:v1:event:${eventId}`,stored=await command(['SET',key,JSON.stringify(event),'NX']);
  if(!stored)return {ok:false,error:'EVENT_ALREADY_EXISTS',eventId};
  await command(['ZADD',EVENT_INDEX_KEY,isoMs(occurredAt),eventId]);
  return {ok:true,event};
}

async function readPersonHistory(personId,limit=90){
  const id=String(personId||'');if(!id)return {observations:[],derived:deriveHistoryMetrics([])};
  const members=await command(['ZREVRANGE',observationIndexKey(id),0,Math.max(0,Math.min(365,Number(limit)||90)-1)]);
  const publishIds=Array.isArray(members)?members:[];const keys=publishIds.map(x=>observationKey(id,x));const rows=await mgetRawJSON(keys);
  const observations=rows.filter(Boolean).reverse();return {observations,derived:deriveHistoryMetrics(observations)};
}
async function historyOverview(){
  const count=Number(await command(['ZCARD',SNAPSHOT_INDEX_KEY]))||0,latest=await command(['ZREVRANGE',SNAPSHOT_INDEX_KEY,0,0]);
  return {accessScope:CURRENT_ACCESS,availableScopes:[ACCESS.PUBLIC,ACCESS.INTERNAL_ADMIN,ACCESS.FUTURE_B2B],versions:{...VERSIONS},snapshotCount:count,latestDraftId:Array.isArray(latest)?latest[0]||null:null,rosterTotal:allPeople().length,backfill:{pageSize:BACKFILL_PAGE_SIZE,total:allPeople().length}};
}
module.exports={BACKFILL_PAGE_SIZE,recordPublishedSnapshot,backfillLegacyPage,recordActionSignal,appendPoliticalEvent,readPersonHistory,historyOverview};
