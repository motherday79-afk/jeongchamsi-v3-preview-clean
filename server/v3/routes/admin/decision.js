'use strict';

const {deriveDecisionIntelligenceV1}=require('../../lib/decision-intelligence-v1');
const {createDecisionCaseStore}=require('../../lib/decision-case-store');
const {evaluateDecisionOutcomeV1,deriveCasePatternsV1}=require('../../lib/decision-outcome-v1');

function safeRange(value){const v=String(value||'30');return ['7','30','90','365','all'].includes(v)?v:'30';}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function defaultDeps(){
  const {requireAdmin}=require('../../../../lib/v3/access');
  const redis=require('../../../../lib/v3/redis');
  const historyStore=require('../../lib/history-v2-store');
  return {requireAdmin,getJSON:redis.getJSON,readPersonHistoryV2:historyStore.readPersonHistoryV2,readPoliticalIntelligenceV2:historyStore.readPoliticalIntelligenceV2,decisionStore:createDecisionCaseStore({command:redis.command})};
}
function currentRowFrom(value={}){return value?.row||value?.current?.row||value?.person||value||{};}
async function safeGetJSON(deps,key){try{return await deps.getJSON(key);}catch{return null;}}
function baselineFromObservation(observation={},condition=null){const scores=observation?.intelligence?.scores||observation?.scores||{};return {publishedAt:observation?.publishedAt||null,condition:num(condition),overallInterest:num(scores.overallInterest),highEngagement:num(scores.highEngagement),massExpansion:num(scores.massExpansion),issueHeat:num(scores.issueHeat),mediaSpread:num(scores.mediaSpread),globalRank:num(observation?.rank?.global)};}
function closestBaseline(history={},occurredAt,condition){
  const t=Date.parse(occurredAt||'');if(!Number.isFinite(t))return null;
  const rows=(Array.isArray(history?.observations)?history.observations:[]).filter(Boolean).filter(r=>{const rt=Date.parse(r?.publishedAt||'');return Number.isFinite(rt)&&rt<=t;}).sort((a,b)=>Date.parse(a.publishedAt)-Date.parse(b.publishedAt));
  const row=rows.at(-1);return row?baselineFromObservation(row,condition):null;
}
async function loadDecisionPerson(personId,range,deps){
  const days=safeRange(range);const numericDays=days==='all'?'all':Number(days);
  const [history,personPublic,publicAdmin]=await Promise.all([
    deps.readPersonHistoryV2(personId,{days:numericDays,limit:730}),
    safeGetJSON(deps,`nowDataPersonPublic:${personId}`),
    safeGetJSON(deps,'nowDataPublicAdmin')
  ]);
  const politicalIntelligence=await deps.readPoliticalIntelligenceV2(personId,history);
  const currentRow=currentRowFrom(personPublic||{});
  const decision=deriveDecisionIntelligenceV1({politicalIntelligence:politicalIntelligence||{},history:history||{},currentRow,rangeDays:days,asOf:politicalIntelligence?.asOf||history?.summary?.latest?.publishedAt||publicAdmin?.publishedAt||null});
  const [cases,actions]=await Promise.all([deps.decisionStore.listCases(personId,{limit:20}),deps.decisionStore.listActions(personId,{limit:40})]);
  const outcomes=actions.map(action=>evaluateDecisionOutcomeV1({action,observations:history?.observations||[],currentCondition:decision?.currentState?.condition,evaluatedAt:new Date().toISOString()}));
  const patterns=deriveCasePatternsV1({actions,outcomes,cases});
  return {personId,range:days,history,politicalIntelligence,decision,cases,actions,outcomes,patterns,openCaseCount:cases.filter(x=>x?.status!=='CLOSED').length,source:{draftId:publicAdmin?.draftId||history?.observations?.at(-1)?.draftId||null,publishedAt:publicAdmin?.publishedAt||history?.summary?.latest?.publishedAt||history?.observations?.at(-1)?.publishedAt||null}};
}
function statusFor(result,success=200){if(result?.ok)return success;return ['CASE_NOT_FOUND','ACTION_NOT_FOUND'].includes(result?.error)?404:409;}

function createDecisionAdminRoute(overrides={}){
  let depsCache=null;function deps(){if(depsCache)return depsCache;const base=Object.keys(overrides).length?{}:defaultDeps();depsCache={...base,...overrides};return depsCache;}
  return async function decisionAdmin(req,res){
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
    try{
      const d=deps();const admin=await d.requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
      if(req.method==='GET'){
        const personId=String(req.query?.personId||'').trim();
        if(!personId){const cases=await d.decisionStore.listCases('',{limit:20});return res.status(200).json({ok:true,cases});}
        const loaded=await loadDecisionPerson(personId,req.query?.range,d);return res.status(200).json({ok:true,...loaded});
      }
      if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
      const action=String(req.body?.action||'');
      if(action==='case-create'){
        const personId=String(req.body?.personId||'').trim();if(!personId)return res.status(400).json({ok:false,error:'CASE_PERSON_REQUIRED'});
        const loaded=await loadDecisionPerson(personId,req.body?.range||'30',d);if(!loaded.source?.draftId||!loaded.source?.publishedAt)return res.status(409).json({ok:false,error:'CASE_SOURCE_REQUIRED'});
        const top=loaded.decision?.causeTrace?.[0]?.title||loaded.decision?.currentState?.conditionLabel||'현재 정치 흐름';
        const result=await d.decisionStore.createCase({personId,sourceDraftId:loaded.source.draftId,sourcePublishedAt:loaded.source.publishedAt,decision:loaded.decision,headline:`${loaded.decision?.currentState?.conditionLabel||'현재 흐름'} · ${top}`,note:String(req.body?.note||'').trim()});
        return res.status(statusFor(result)).json(result);
      }
      if(action==='case-close'){
        const result=await d.decisionStore.closeCase(String(req.body?.caseId||''));return res.status(statusFor(result)).json(result);
      }
      if(action==='action-add'){
        const caseId=String(req.body?.caseId||'').trim();const parent=await d.decisionStore.getCase(caseId);if(!parent)return res.status(404).json({ok:false,error:'CASE_NOT_FOUND'});
        const personId=String(parent.personId||'');const occurredAt=req.body?.occurredAt&&Number.isFinite(Date.parse(req.body.occurredAt))?new Date(req.body.occurredAt).toISOString():new Date().toISOString();
        const loaded=await loadDecisionPerson(personId,req.body?.range||'30',d);const baseline=closestBaseline(loaded.history,occurredAt,loaded.decision?.currentState?.condition);if(!baseline?.publishedAt)return res.status(409).json({ok:false,error:'ACTION_BASELINE_REQUIRED'});
        const result=await d.decisionStore.addAction({caseId,personId,occurredAt,type:req.body?.type,title:req.body?.title,note:req.body?.note,linkedPriorityRank:req.body?.linkedPriorityRank,baseline});
        return res.status(statusFor(result)).json(result);
      }
      if(action==='action-note-update'){
        const result=await d.decisionStore.updateActionNote(String(req.body?.actionId||''),String(req.body?.note||''));return res.status(statusFor(result)).json(result);
      }
      return res.status(400).json({ok:false,error:'UNKNOWN_DECISION_ACTION'});
    }catch(error){console.error('[JCS_DECISION_ADMIN]',error);return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'JCS_DECISION_ADMIN_FAILED'});}
  };
}

module.exports=createDecisionAdminRoute();
module.exports.createDecisionAdminRoute=createDecisionAdminRoute;
module.exports._internals={safeRange,baselineFromObservation,closestBaseline,loadDecisionPerson};
