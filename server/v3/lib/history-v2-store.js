const redis=require('../../../lib/v3/redis');
const rosterLib=require('./politician-live-roster');
let signals;
try{signals=require('./now-public-signals');}
catch{signals={derivePersonView(){throw new Error('NOW_PUBLIC_SIGNALS_REQUIRED');}};}
const {getPoliticalIntelligenceEvidence}=require('../data/political-intelligence-evidence');
const {derivePoliticalIntelligenceV1}=require('./political-intelligence-v1');
const {readPoliticalIntelligenceSnapshotPersonV1,readLatestPoliticalIntelligenceSnapshotPersonV1}=require('./political-intelligence-store');
const {mergeLegacyObservations}=require('./history-core');
const {
  V2_VERSIONS,V2_PREFIX,V2_ACCESS,V2_SNAPSHOT_INDEX_KEY,V2_EVENT_INDEX_KEY,
  v2SnapshotKey,v2ObservationKey,v2ObservationIndexKey,v2EventKey,
  buildFullObservation,buildLegacyPartialObservation,buildDailySummaries,dailySummaryObservations,deriveWindowSummary
}=require('./history-v2-core');

const BACKFILL_PAGE_SIZE_V2=25;
function isoMs(value){const t=Date.parse(value||'');return Number.isFinite(t)?t:Date.now();}
function safeDays(value){if(String(value)==='all')return 'all';const n=Number(value);return [7,30,90,365].includes(n)?n:30;}
function cleanId(value=''){return String(value||'').trim().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);}
function observationReadLimit(days,requested){const base=days==='all'?4000:{7:96,30:320,90:960,365:3200}[Number(days)]||320;const req=Math.max(0,Number(requested)||0);return Math.min(4000,Math.max(base,req));}
function compactRoster(people=[]){return people.map(p=>({id:String(p.id||''),name:String(p.name||''),type:String(p.type||''),party:String(p.party||''),jurisdiction:String(p.jurisdiction||''),office:String(p.office||'')})).filter(x=>x.id);}
function snapshotHeader(current={},observations=[]){
  const movers=observations.map(o=>({id:o.person?.id||'',name:o.person?.name||'',type:o.person?.type||'',globalRank:o.rank?.global??null,categoryRank:o.rank?.category??null,rankDelta:Number.isFinite(Number(o._rankDelta))?Number(o._rankDelta):null,issueHeat:o.intelligence?.scores?.issueHeat??null,overallInterest:o.intelligence?.scores?.overallInterest??null,signal:o.intelligence?.signal?.label||''}))
    .filter(x=>x.id).sort((a,b)=>Math.abs(Number(b.rankDelta)||0)-Math.abs(Number(a.rankDelta)||0)||(Number(b.issueHeat)||0)-(Number(a.issueHeat)||0)).slice(0,12);
  return {schemaVersion:2,immutable:true,source:'FULL_SNAPSHOT',completeness:'FULL',accessScope:V2_ACCESS,versions:{...V2_VERSIONS},draftId:String(current.draftId||''),publishedAt:current.publishedAt||null,weights:{search:Number(current.weights?.search)||0,news:Number(current.weights?.news)||0},providers:Array.isArray(current.providers)?current.providers.map(String).slice(0,8):[],rosterTotal:observations.length,intelligenceSummary:{movers}};
}

function createHistoryV2Store(overrides={}){
  const deps={
    command:redis.command,pipeline:redis.pipeline,getJSON:redis.getJSON,mgetJSON:redis.mgetJSON,mgetRawJSON:redis.mgetRawJSON,
    allPeople:rosterLib.allPeople,derivePersonView:signals.derivePersonView,
    getPoliticalIntelligenceEvidence,derivePoliticalIntelligenceV1,readPoliticalIntelligenceSnapshotPersonV1,readLatestPoliticalIntelligenceSnapshotPersonV1,
    ...overrides
  };

  async function pipelineChunks(commands,size=180){const results=[];for(let i=0;i<commands.length;i+=size)results.push(...await deps.pipeline(commands.slice(i,i+size)));return results;}
  async function mgetRawJSONChunks(keys,size=180){const results=[];for(let i=0;i<keys.length;i+=size)results.push(...await deps.mgetRawJSON(keys.slice(i,i+size)));return results;}

  async function recordPublishedSnapshotV2(current={},historyOverride){
    const draftId=String(current?.draftId||'').trim(),publishedAt=current?.publishedAt||null;
    if(!draftId||!publishedAt||!Array.isArray(current?.ranked)||!current.ranked.length)return {ok:false,error:'HISTORY_V2_SNAPSHOT_INPUT_REQUIRED'};
    const existing=await deps.command(['GET',v2SnapshotKey(draftId)]);
    if(existing)return {ok:true,created:false,draftId,rosterTotal:Number(JSON.parse(existing)?.rosterTotal)||current.ranked.length};
    const history=historyOverride===undefined?((await deps.getJSON('nowDataHistory'))||{items:[]}):(historyOverride||{items:[]});
    const observations=[];
    for(const row of current.ranked){
      const id=String(row?.person?.id||'');if(!id)continue;
      const view=deps.derivePersonView(current,history,id);
      if(!view?.row)continue;
      const observation=buildFullObservation(view,{draftId,publishedAt,weights:current.weights||{},providers:current.providers||[]});
      observation._rankDelta=Number.isFinite(Number(view.rankDelta))?Number(view.rankDelta):null;
      observations.push(observation);
    }
    const ts=isoMs(publishedAt),observationCommands=[];
    for(const observation of observations){
      const id=observation.person?.id;if(!id)continue;
      const stored={...observation};delete stored._rankDelta;
      observationCommands.push(['SET',v2ObservationKey(id,draftId),JSON.stringify(stored),'NX']);
      observationCommands.push(['ZADD',v2ObservationIndexKey(id),ts,draftId]);
    }
    if(observationCommands.length)await pipelineChunks(observationCommands);
    const header=snapshotHeader(current,observations);
    const finalResults=await deps.pipeline([
      ['SET',v2SnapshotKey(draftId),JSON.stringify(header),'NX'],
      ['ZADD',V2_SNAPSHOT_INDEX_KEY,ts,draftId]
    ]);
    const created=Boolean(finalResults?.[0]);
    return {ok:true,created,draftId,rosterTotal:observations.length};
  }

  async function captureCurrentSnapshot(){
    const [current,history]=await Promise.all([deps.getJSON('nowDataCurrent'),deps.getJSON('nowDataHistory')]);
    if(!current?.draftId||!Array.isArray(current?.ranked)||!current.ranked.length)return {ok:false,error:'NOW_CURRENT_REQUIRED'};
    return recordPublishedSnapshotV2(current,history||{items:[]});
  }

  async function backfillLegacyPageV2({cursor=0,pageSize=BACKFILL_PAGE_SIZE_V2}={}){
    cursor=Math.max(0,Number(cursor)||0);pageSize=Math.max(1,Math.min(BACKFILL_PAGE_SIZE_V2,Number(pageSize)||BACKFILL_PAGE_SIZE_V2));
    const roster=deps.allPeople(),people=roster.slice(cursor,cursor+pageSize);
    const [personViews,legacyHistory]=await Promise.all([deps.mgetJSON(people.map(person=>`nowDataPersonPublic:${person.id}`)),deps.getJSON('nowDataHistory')]);
    const historyItems=Array.isArray(legacyHistory?.items)?legacyHistory.items:[],candidates=[];
    people.forEach((person,index)=>{
      const points=Array.isArray(personViews[index]?.trend?.points)?personViews[index].trend.points:[];
      for(const observation of mergeLegacyObservations(person.id,points,historyItems))candidates.push(observation);
    });
    const draftIds=[...new Set(candidates.map(x=>String(x.draftId||'')).filter(Boolean))];
    const formalHeaders=await deps.mgetRawJSON(draftIds.map(v2SnapshotKey));
    const fullDrafts=new Set(draftIds.filter((id,index)=>formalHeaders[index]?.completeness==='FULL'));
    const pending=candidates.filter(x=>!x.draftId||!fullDrafts.has(String(x.draftId)));
    const commands=[];
    for(const source of pending){
      const id=String(source.personId||'');if(!id)continue;
      const publishId=cleanId(source.draftId||`legacy-${isoMs(source.publishedAt)}`),observation=buildLegacyPartialObservation(source),ts=isoMs(source.publishedAt);
      commands.push(['SET',v2ObservationKey(id,publishId),JSON.stringify(observation),'NX']);
      commands.push(['ZADD',v2ObservationIndexKey(id),ts,publishId]);
    }
    if(commands.length)await pipelineChunks(commands);
    const nextCursor=Math.min(roster.length,cursor+people.length);
    return {ok:true,cursor,nextCursor,done:nextCursor>=roster.length,total:roster.length,pageSize:BACKFILL_PAGE_SIZE_V2,processed:people.length,candidates:candidates.length,skippedFull:candidates.length-pending.length,written:Math.floor(commands.length/2)};
  }

  async function readEventsForPerson(personId,{days='all',limit=80}={}){
    const ids=await deps.command(['ZREVRANGE',V2_EVENT_INDEX_KEY,0,Math.max(0,Math.min(200,Number(limit)||80)-1)]);const keys=(Array.isArray(ids)?ids:[]).map(v2EventKey);const rows=await deps.mgetRawJSON(keys);
    const cutoff=days==='all'?0:Date.now()-Number(days)*86400000;
    return rows.filter(Boolean).filter(e=>!personId||!Array.isArray(e.personIds)||e.personIds.includes(String(personId))).filter(e=>!cutoff||(Date.parse(e.occurredAt)||0)>=cutoff).sort((a,b)=>(Date.parse(a.occurredAt)||0)-(Date.parse(b.occurredAt)||0));
  }

  async function readPersonHistoryV2(personId,{days=30,limit=365}={}){
    const id=String(personId||'').trim();
    if(!id){
      const summary=deriveWindowSummary([]);summary.normalization='DAILY_AVERAGE';summary.rawSampleSize=0;summary.dailySampleSize=0;
      return {observations:[],daily:[],summary,events:[],rangeDays:safeDays(days)};
    }
    days=safeDays(days);const max=observationReadLimit(days,limit);
    const members=await deps.command(['ZREVRANGE',v2ObservationIndexKey(id),0,max-1]);
    const publishIds=Array.isArray(members)?members:[],rows=await mgetRawJSONChunks(publishIds.map(x=>v2ObservationKey(id,x)));
    const cutoff=days==='all'?0:Date.now()-Number(days)*86400000;
    const observations=rows.filter(Boolean).filter(row=>!cutoff||(Date.parse(row.publishedAt)||0)>=cutoff).sort((a,b)=>(Date.parse(a.publishedAt)||0)-(Date.parse(b.publishedAt)||0));
    const daily=buildDailySummaries(observations),rawSummary=deriveWindowSummary(observations);
    const intraday=days===7,trendRows=intraday?observations:dailySummaryObservations(daily);
    const summary=deriveWindowSummary(trendRows);
    summary.normalization=intraday?'RAW_INTRADAY':'DAILY_AVERAGE';
    summary.rawSampleSize=observations.length;summary.dailySampleSize=daily.length;summary.latest=rawSummary.latest;
    const events=await readEventsForPerson(id,{days,limit:80});
    return {observations,daily,summary,events,rangeDays:days};
  }

  async function readPoliticalIntelligenceV2(personId,personHistory=null){
    const id=String(personId||'').trim();if(!id)return null;
    const current=await deps.getJSON('nowDataCurrent');
    if(!current?.draftId||!Array.isArray(current?.ranked)||!current.ranked.length)return null;
    try{const latestFrozen=await deps.readLatestPoliticalIntelligenceSnapshotPersonV1(id);if(latestFrozen)return latestFrozen;}catch{}
    try{const frozen=await deps.readPoliticalIntelligenceSnapshotPersonV1(current.draftId,id);if(frozen)return frozen;}catch{}
    const legacyHistory=(await deps.getJSON('nowDataHistory'))||{items:[]};
    const view=deps.derivePersonView(current,legacyHistory,id);if(!view?.row)return null;
    const history=personHistory||await readPersonHistoryV2(id,{days:30,limit:365});
    const asOf=current?.publishedAt||new Date().toISOString();
    const evidence=deps.getPoliticalIntelligenceEvidence(id,{asOf,person:view.row.person||null});
    return deps.derivePoliticalIntelligenceV1({view,history,evidence,asOf});
  }

  async function appendPoliticalEventV2(input={}){
    const occurredAt=input.occurredAt&&Number.isFinite(Date.parse(input.occurredAt))?new Date(input.occurredAt).toISOString():new Date().toISOString();
    const eventId=cleanId(input.eventId||`event-${Date.now().toString(36)}`),title=String(input.title||'').trim().slice(0,180);
    if(!title)return {ok:false,error:'EVENT_TITLE_REQUIRED'};
    const event={schemaVersion:2,immutable:true,accessScope:V2_ACCESS,versions:{...V2_VERSIONS},eventId,occurredAt,title,category:String(input.category||'').trim().slice(0,80),personIds:Array.isArray(input.personIds)?input.personIds.map(String).filter(Boolean).slice(0,40):[],sourceUrl:String(input.sourceUrl||'').trim().slice(0,1200),note:String(input.note||'').trim().slice(0,1200)};
    const stored=await deps.command(['SET',v2EventKey(eventId),JSON.stringify(event),'NX']);if(!stored)return {ok:false,error:'EVENT_ALREADY_EXISTS',eventId};
    await deps.command(['ZADD',V2_EVENT_INDEX_KEY,isoMs(occurredAt),eventId]);return {ok:true,event};
  }

  async function historyHomeSummaryV2(){
    const [count,latest,current]=await Promise.all([
      deps.command(['ZCARD',V2_SNAPSHOT_INDEX_KEY]),
      deps.command(['ZREVRANGE',V2_SNAPSHOT_INDEX_KEY,0,0]),
      deps.getJSON('nowDataCurrent')
    ]);
    const latestDraftId=Array.isArray(latest)?latest[0]||null:null;
    const currentDraftId=current?.draftId||null;
    const latestHeader=latestDraftId?await deps.command(['GET',v2SnapshotKey(latestDraftId)]):null;
    let latestSnapshot=null;try{latestSnapshot=latestHeader?JSON.parse(latestHeader):null;}catch{}
    let currentCaptured=false;
    if(currentDraftId){
      if(currentDraftId===latestDraftId)currentCaptured=Boolean(latestHeader);
      else currentCaptured=Boolean(await deps.command(['GET',v2SnapshotKey(currentDraftId)]));
    }
    return {
      accessScope:V2_ACCESS,versions:{...V2_VERSIONS},snapshotCount:Number(count)||0,latestDraftId,latestSnapshot,
      rosterTotal:Number(latestSnapshot?.rosterTotal)||0,currentDraftId,currentPublishedAt:current?.publishedAt||null,currentCaptured
    };
  }

  async function historyOverviewV2(){
    const roster=compactRoster(deps.allPeople());
    const [count,latest,current]=await Promise.all([deps.command(['ZCARD',V2_SNAPSHOT_INDEX_KEY]),deps.command(['ZREVRANGE',V2_SNAPSHOT_INDEX_KEY,0,0]),deps.getJSON('nowDataCurrent')]);
    const latestDraftId=Array.isArray(latest)?latest[0]||null:null;
    const [latestHeader,currentHeader]=await Promise.all([
      latestDraftId?deps.command(['GET',v2SnapshotKey(latestDraftId)]):Promise.resolve(null),
      current?.draftId?deps.command(['GET',v2SnapshotKey(current.draftId)]):Promise.resolve(null)
    ]);
    let latestSnapshot=null;try{latestSnapshot=latestHeader?JSON.parse(latestHeader):null;}catch{}
    return {accessScope:V2_ACCESS,versions:{...V2_VERSIONS},snapshotCount:Number(count)||0,latestDraftId,latestSnapshot,rosterTotal:roster.length,roster,currentDraftId:current?.draftId||null,currentPublishedAt:current?.publishedAt||null,currentCaptured:Boolean(currentHeader),backfill:{pageSize:BACKFILL_PAGE_SIZE_V2,total:roster.length}};
  }

  return {BACKFILL_PAGE_SIZE_V2,recordPublishedSnapshotV2,captureCurrentSnapshot,backfillLegacyPageV2,readPersonHistoryV2,readPoliticalIntelligenceV2,historyOverviewV2,historyHomeSummaryV2,appendPoliticalEventV2,readEventsForPerson,_deps:deps};
}

const defaultStore=createHistoryV2Store();
module.exports={createHistoryV2Store,...defaultStore,V2_PREFIX};
