'use strict';

let redis={};try{redis=require('../../../lib/v3/redis');}catch{}

const PREFIX='jcv3:decision:v1';
const GLOBAL_CASE_INDEX=`${PREFIX}:cases`;
function cleanId(v=''){return String(v||'').trim().replace(/[^A-Za-z0-9._-]/g,'_').slice(0,180);}
function caseKey(id){return `${PREFIX}:case:${cleanId(id)}`;}
function caseIndex(personId){return `${PREFIX}:cases:${cleanId(personId)}`;}
function actionKey(id){return `${PREFIX}:action:${cleanId(id)}`;}
function actionIndex(personId){return `${PREFIX}:actions:${cleanId(personId)}`;}
function caseActionIndex(caseId){return `${PREFIX}:actions:case:${cleanId(caseId)}`;}
function iso(value,now){const t=Date.parse(value||'');return Number.isFinite(t)?new Date(t).toISOString():new Date(now()).toISOString();}
function score(value,now){const t=Date.parse(value||'');return Number.isFinite(t)?t:now();}
function compactDecision(decision={}){
  return {
    decisionVersion:String(decision?.version||''),
    currentState:decision?.currentState?{...decision.currentState}:{},
    causeTraceTop3:(Array.isArray(decision?.causeTrace)?decision.causeTrace:[]).slice(0,3),
    risksTop3:(Array.isArray(decision?.risks)?decision.risks:[]).slice(0,3),
    opportunitiesTop3:(Array.isArray(decision?.opportunities)?decision.opportunities:[]).slice(0,3),
    prioritiesTop3:(Array.isArray(decision?.priorities)?decision.priorities:[]).slice(0,3),
    evidenceState:decision?.evidenceState?{...decision.evidenceState}:null
  };
}
function makeId(prefix,now,randomId){return `${prefix}-${now().toString(36)}-${cleanId(randomId())}`;}
function parse(raw){try{return raw?JSON.parse(String(raw)):null;}catch{return null;}}

function createDecisionCaseStore(overrides={}){
  const deps={command:overrides.command||redis.command,now:()=>Date.now(),randomId:()=>Math.random().toString(36).slice(2,8),...overrides};
  if(typeof deps.command!=='function')throw new Error('DECISION_STORAGE_COMMAND_REQUIRED');

  async function getCase(caseId){return parse(await deps.command(['GET',caseKey(caseId)]));}
  async function getAction(actionId){return parse(await deps.command(['GET',actionKey(actionId)]));}
  async function readRows(ids,keyFn){const out=[];for(const id of ids||[]){const row=parse(await deps.command(['GET',keyFn(id)]));if(row)out.push(row);}return out;}

  async function createCase(input={}){
    const personId=cleanId(input.personId),sourceDraftId=String(input.sourceDraftId||'').trim(),sourcePublishedAt=input.sourcePublishedAt||null;
    if(!personId)return {ok:false,error:'CASE_PERSON_REQUIRED'};
    if(!sourceDraftId||!sourcePublishedAt)return {ok:false,error:'CASE_SOURCE_REQUIRED'};
    const createdAt=iso(input.createdAt,deps.now),caseId=cleanId(input.caseId||makeId('case',deps.now,deps.randomId));
    const compact=compactDecision(input.decision||{});
    const row={schemaVersion:1,caseId,personId,createdAt,status:'OPEN',sourceDraftId,sourcePublishedAt,decisionVersion:compact.decisionVersion,headline:String(input.headline||compact.currentState?.conditionLabel||'정치 의사결정 CASE').trim().slice(0,240),currentState:compact.currentState,causeTraceTop3:compact.causeTraceTop3,risksTop3:compact.risksTop3,opportunitiesTop3:compact.opportunitiesTop3,prioritiesTop3:compact.prioritiesTop3,evidenceState:compact.evidenceState,note:String(input.note||'').trim().slice(0,2000)};
    const stored=await deps.command(['SET',caseKey(caseId),JSON.stringify(row),'NX']);
    if(!stored)return {ok:false,error:'CASE_ALREADY_EXISTS',caseId};
    const ts=score(createdAt,deps.now);let personalIndexed=false,globalIndexed=false;
    try{
      await deps.command(['ZADD',caseIndex(personId),String(ts),caseId]);personalIndexed=true;
      await deps.command(['ZADD',GLOBAL_CASE_INDEX,String(ts),caseId]);globalIndexed=true;
    }catch(error){
      try{if(personalIndexed)await deps.command(['ZREM',caseIndex(personId),caseId]);}catch{}
      try{if(globalIndexed)await deps.command(['ZREM',GLOBAL_CASE_INDEX,caseId]);}catch{}
      try{await deps.command(['DEL',caseKey(caseId)]);}catch{}
      throw error;
    }
    return {ok:true,case:row};
  }

  async function closeCase(caseId,closedAt){
    const row=await getCase(caseId);if(!row)return {ok:false,error:'CASE_NOT_FOUND'};
    if(row.status==='CLOSED')return {ok:true,case:row};
    const next={...row,status:'CLOSED',closedAt:iso(closedAt,deps.now)};
    await deps.command(['SET',caseKey(caseId),JSON.stringify(next)]);return {ok:true,case:next};
  }

  async function listCases(personId,{limit=20}={}){
    const key=personId?caseIndex(personId):GLOBAL_CASE_INDEX;
    const ids=await deps.command(['ZREVRANGE',key,0,Math.max(0,Math.min(100,Number(limit)||20)-1)]);
    return readRows(Array.isArray(ids)?ids:[],caseKey);
  }

  async function addAction(input={}){
    const personId=cleanId(input.personId),caseId=cleanId(input.caseId),baseline=input.baseline&&typeof input.baseline==='object'?{...input.baseline}:null;
    if(!personId||!caseId)return {ok:false,error:'ACTION_CASE_REQUIRED'};
    if(!baseline||!baseline.publishedAt)return {ok:false,error:'ACTION_BASELINE_REQUIRED'};
    const parent=await getCase(caseId);if(!parent)return {ok:false,error:'CASE_NOT_FOUND'};
    const title=String(input.title||'').trim();if(!title)return {ok:false,error:'ACTION_TITLE_REQUIRED'};
    const createdAt=iso(input.createdAt,deps.now),occurredAt=iso(input.occurredAt||createdAt,deps.now),actionId=cleanId(input.actionId||makeId('action',deps.now,deps.randomId));
    const allowed=new Set(['MESSAGE','MEDIA','POLICY','FIELD','ISSUE_RESPONSE','CAMPAIGN','OTHER']);
    const type=allowed.has(String(input.type||'').toUpperCase())?String(input.type).toUpperCase():'OTHER';
    const row={schemaVersion:1,actionId,caseId,personId,occurredAt,createdAt,type,title:title.slice(0,240),note:String(input.note||'').trim().slice(0,2000),linkedPriorityRank:Number.isInteger(Number(input.linkedPriorityRank))?Number(input.linkedPriorityRank):null,baseline};
    const stored=await deps.command(['SET',actionKey(actionId),JSON.stringify(row),'NX']);if(!stored)return {ok:false,error:'ACTION_ALREADY_EXISTS',actionId};
    const ts=score(occurredAt,deps.now);let personIndexed=false,caseIndexed=false;
    try{
      await deps.command(['ZADD',actionIndex(personId),String(ts),actionId]);personIndexed=true;
      await deps.command(['ZADD',caseActionIndex(caseId),String(ts),actionId]);caseIndexed=true;
    }catch(error){
      try{if(personIndexed)await deps.command(['ZREM',actionIndex(personId),actionId]);}catch{}
      try{if(caseIndexed)await deps.command(['ZREM',caseActionIndex(caseId),actionId]);}catch{}
      try{await deps.command(['DEL',actionKey(actionId)]);}catch{}
      throw error;
    }
    return {ok:true,action:row};
  }

  async function updateActionNote(actionId,note=''){
    const row=await getAction(actionId);if(!row)return {ok:false,error:'ACTION_NOT_FOUND'};
    const next={...row,note:String(note||'').trim().slice(0,2000),updatedAt:new Date(deps.now()).toISOString()};
    await deps.command(['SET',actionKey(actionId),JSON.stringify(next)]);return {ok:true,action:next};
  }
  async function listActions(personId,{limit=40}={}){
    const ids=await deps.command(['ZREVRANGE',actionIndex(personId),0,Math.max(0,Math.min(200,Number(limit)||40)-1)]);
    return readRows(Array.isArray(ids)?ids:[],actionKey);
  }
  async function listActionsForCase(caseId,{limit=40}={}){
    const ids=await deps.command(['ZREVRANGE',caseActionIndex(caseId),0,Math.max(0,Math.min(200,Number(limit)||40)-1)]);
    return readRows(Array.isArray(ids)?ids:[],actionKey);
  }

  return {createCase,closeCase,listCases,getCase,addAction,updateActionNote,listActions,listActionsForCase,getAction,_deps:deps};
}

const defaults=typeof redis.command==='function'?createDecisionCaseStore():{};
module.exports={PREFIX,GLOBAL_CASE_INDEX,caseKey,caseIndex,actionKey,actionIndex,caseActionIndex,compactDecision,createDecisionCaseStore,...defaults};
