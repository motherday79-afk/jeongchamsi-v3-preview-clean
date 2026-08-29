const { requireAdmin } = require('../../../../lib/v3/access');
const { getJSON, setJSON, mgetJSON, msetJSON } = require('../../../../lib/v3/redis');
const { allPeople } = require('../../lib/politician-live-roster');
const { credentials: searchCredentials } = require('../../lib/naver-searchad');
const { credentials: newsCredentials, availability: newsAvailability } = require('../../lib/naver-news');
const { makeBatches, collectBatch, aggregateBatchSummaries, scoreSnapshot, resultState, compactRankRow } = require('../../lib/now-data-engine');
const { compactPreviewRow, compactHistory, buildHomePublicSnapshot, buildAdminPublicSnapshot, buildPersonPublicEntries, buildCategoryPublicSnapshots, mergePersonTrend } = require('../../lib/now-public-snapshot');
const { recordPublishedSnapshotV2 } = require('../../lib/history-v2-store');

const META='nowDataDraftMeta',CURRENT='nowDataCurrent',HISTORY='nowDataHistory',PUBLIC_HOME='nowDataPublicHome',PUBLIC_ADMIN='nowDataPublicAdmin';
const categoryDomain=type=>`nowDataPublicCategory:${type}`;
const batchDomain=(draftId,index)=>`nowDataBatch:${draftId}:${index}`;
const batchStatusDomain=(draftId,index)=>`nowDataBatchStatus:${draftId}:${index}`;
const rankedDomain=draftId=>`nowDataDraftRanked:${draftId}`;

function configState(){
  const search=searchCredentials(),news=newsCredentials(),newsState=newsAvailability(),missingEnv=[];
  if(!search.accessLicense)missingEnv.push('NAVER_AD_ACCESS_LICENSE');
  if(!search.secretKey)missingEnv.push('NAVER_AD_SECRET_KEY');
  if(!search.customerId)missingEnv.push('NAVER_AD_CUSTOMER_ID');
  const missingGroups=[];
  if(!search.configured)missingGroups.push('searchAds');
  return {searchAds:search.configured,news:newsState.available,newsNaver:news.configured,newsProvider:newsState.provider,missingEnv,missingGroups};
}
function weights(body={}){let s=Math.max(0,Math.min(100,Number(body.searchWeight)||50)),n=Math.max(0,Math.min(100,Number(body.newsWeight)||50));if(s+n===0){s=50;n=50;}return {search:s,news:n};}
async function loadBatches(meta){if(!meta?.draftId||!Array.isArray(meta.batches))return [];return mgetJSON(meta.batches.map((_,i)=>batchDomain(meta.draftId,i)));}
async function loadBatchStatuses(meta){if(!meta?.draftId||!Number(meta.batchCount))return [];return mgetJSON(Array.from({length:meta.batchCount},(_,i)=>batchStatusDomain(meta.draftId,i)));}
function summaryFromRows(rows=[],total=0){
  const summary={total:Number(total)||rows.length,completed:rows.length,success:0,partial:0,failed:0,remaining:0};
  rows.forEach(row=>{summary[resultState(row)]++;});summary.remaining=Math.max(0,summary.total-summary.completed);return summary;
}
function summaryFromStatuses(statuses=[],total=0){
  const out={total:Number(total)||0,completed:0,success:0,partial:0,failed:0,remaining:0};
  statuses.filter(Boolean).forEach(x=>{const s=x.summary||{};out.completed+=Number(s.completed)||0;out.success+=Number(s.success)||0;out.partial+=Number(s.partial)||0;out.failed+=Number(s.failed)||0;});
  out.remaining=Math.max(0,out.total-out.completed);return out;
}
function failedBatchIndexes(statuses=[]){return statuses.map((x,i)=>x&&((Number(x.summary?.partial)||0)+(Number(x.summary?.failed)||0)>0)?i:null).filter(x=>x!==null);}
function publicMeta(meta,statuses=[]){
  if(!meta)return null;
  let summary=meta.summary||summaryFromStatuses(statuses,meta.total);
  if((meta.status==='preview'||meta.status==='published')&&!summary.completed)summary={total:meta.total,completed:meta.total,success:meta.total,partial:0,failed:0,remaining:0};
  const completed=statuses.some(Boolean)?statuses.map((x,i)=>x?i:null).filter(x=>x!==null):(meta.completedBatchIndexes||((meta.status==='preview'||meta.status==='published')?Array.from({length:meta.batchCount},(_,i)=>i):[]));
  const failed=statuses.some(Boolean)?failedBatchIndexes(statuses):(meta.failedBatchIndexes||[]);
  return {draftId:meta.draftId,status:meta.status,total:meta.total,batchSize:meta.batchSize,batchCount:meta.batchCount,startedAt:meta.startedAt,finalizedAt:meta.finalizedAt||null,publishedAt:meta.publishedAt||null,weights:meta.weights,summary,completedBatchIndexes:completed,failedBatchIndexes:failed,top30:meta.top30||[]};
}
async function migrateLegacyMeta(meta){
  if(!meta||!Array.isArray(meta.ranked))return meta;
  const ranked=meta.ranked;
  const next={...meta,top30:ranked.slice(0,30).map(compactPreviewRow),summary:summaryFromRows(ranked,meta.total),completedBatchIndexes:Array.from({length:meta.batchCount||0},(_,i)=>i)};
  delete next.ranked;
  await msetJSON([[rankedDomain(meta.draftId),ranked],[META,next]]);
  return next;
}
async function writePersonEntries(entries=[]){
  const chunks=[];for(let i=0;i<entries.length;i+=40)chunks.push(entries.slice(i,i+40));
  for(let i=0;i<chunks.length;i+=4)await Promise.all(chunks.slice(i,i+4).map(chunk=>msetJSON(chunk)));
}
async function saveBatchAndStatus(meta,index,stored){
  const summary=aggregateBatchSummaries([stored],stored.ids?.length||stored.results?.length||0);
  const status={draftId:meta.draftId,batchIndex:index,count:stored.results?.length||0,elapsedMs:stored.elapsedMs||0,collectedAt:stored.collectedAt||new Date().toISOString(),summary};
  await msetJSON([[batchDomain(meta.draftId,index),stored],[batchStatusDomain(meta.draftId,index),status]]);
  return summary;
}

module.exports=async function nowDataAdmin(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  try{
    const admin=await requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
    if(req.method==='GET'){
      let [meta,currentPublic]=await Promise.all([getJSON(META),getJSON(PUBLIC_ADMIN)]);
      meta=await migrateLegacyMeta(meta);
      const statuses=meta?.status==='collecting'?await loadBatchStatuses(meta):[];
      if(!currentPublic&&meta?.status==='published'&&meta?.top30?.length)currentPublic={draftId:meta.draftId,publishedAt:meta.publishedAt,weights:meta.weights,total:meta.total,top30:meta.top30};
      const configured=configState();
      return res.status(200).json({ok:true,configured:{searchAds:configured.searchAds,news:configured.news,newsNaver:configured.newsNaver},newsProvider:configured.newsProvider,missingEnv:configured.missingEnv,missingGroups:configured.missingGroups,rosterTotal:allPeople().length,draft:publicMeta(meta,statuses),current:currentPublic,performance:{batchSize:10,browserWorkers:2,serverConcurrency:5,publicSnapshot:'compact'}});
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    const action=String(req.body?.action||'');
    if(action==='start'){
      const configured=configState();if(configured.missingEnv.length)return res.status(409).json({ok:false,error:'NAVER_CONFIG_REQUIRED',missingEnv:configured.missingEnv,missingGroups:configured.missingGroups,configured:{searchAds:configured.searchAds,news:configured.news,newsNaver:configured.newsNaver},newsProvider:configured.newsProvider});
      const people=allPeople(),ids=people.map(x=>x.id),batches=makeBatches(ids,10),w=weights(req.body),draftId=`now-${Date.now().toString(36)}`;
      const meta={draftId,status:'collecting',total:ids.length,batchSize:10,batchCount:batches.length,batches,weights:w,newsProvider:configured.newsProvider,startedAt:new Date().toISOString(),createdBy:admin.id};
      await setJSON(META,meta);
      return res.status(200).json({ok:true,draftId,batchCount:batches.length,batchSize:10,total:ids.length,weights:w,performance:{browserWorkers:2,serverConcurrency:5}});
    }
    let meta=await getJSON(META);if(!meta||String(req.body?.draftId||'')!==meta.draftId)return res.status(409).json({ok:false,error:'NOW_DRAFT_MISMATCH'});
    meta=await migrateLegacyMeta(meta);
    if(action==='collect-batch'){
      const index=Number(req.body?.batchIndex);if(!Number.isInteger(index)||index<0||index>=meta.batchCount)return res.status(400).json({ok:false,error:'INVALID_BATCH_INDEX'});
      const ids=meta.batches[index],data=await collectBatch(ids,{concurrency:5});
      const stored={draftId:meta.draftId,batchIndex:index,ids,results:data.results,elapsedMs:data.elapsedMs,collectedAt:new Date().toISOString()};
      const summary=await saveBatchAndStatus(meta,index,stored);
      return res.status(200).json({ok:true,batchIndex:index,count:data.results.length,elapsedMs:data.elapsedMs,summary});
    }
    if(action==='retry-batch'){
      const index=Number(req.body?.batchIndex),key=batchDomain(meta.draftId,index),old=await getJSON(key);if(!old)return res.status(404).json({ok:false,error:'BATCH_NOT_FOUND'});
      const retryIds=old.results.filter(row=>resultState(row)!=='success').map(row=>row.person?.id).filter(Boolean);
      if(retryIds.length){const retry=await collectBatch(retryIds,{concurrency:5}),map=new Map(retry.results.map(x=>[x.person?.id,x]));old.results=old.results.map(row=>map.get(row.person?.id)||row);old.retriedAt=new Date().toISOString();}
      const summary=await saveBatchAndStatus(meta,index,old);
      return res.status(200).json({ok:true,batchIndex:index,count:retryIds.length,summary});
    }
    if(action==='finalize'){
      const batches=await loadBatches(meta);if(batches.some(x=>!x))return res.status(409).json({ok:false,error:'NOW_BATCHES_INCOMPLETE',summary:aggregateBatchSummaries(batches,meta.total)});
      const rows=batches.flatMap(x=>x.results||[]),ranked=scoreSnapshot(rows,{searchWeight:meta.weights.search,newsWeight:meta.weights.news}).map(compactRankRow),summary=aggregateBatchSummaries(batches,meta.total);
      const statuses=await loadBatchStatuses(meta),top30=ranked.slice(0,30).map(compactPreviewRow);
      const next={...meta,status:'preview',finalizedAt:new Date().toISOString(),top30,summary,completedBatchIndexes:Array.from({length:meta.batchCount},(_,i)=>i),failedBatchIndexes:failedBatchIndexes(statuses)};delete next.ranked;
      await msetJSON([[rankedDomain(meta.draftId),ranked],[META,next]]);
      return res.status(200).json({ok:true,draftId:meta.draftId,summary,top30,weights:meta.weights});
    }
    if(action==='publish'){
      const ranked=await getJSON(rankedDomain(meta.draftId));
      if(meta.status!=='preview'||!Array.isArray(ranked))return res.status(409).json({ok:false,error:'NOW_PREVIEW_REQUIRED'});
      const publishedAt=new Date().toISOString(),previousHistory=compactHistory((await getJSON(HISTORY))||{items:[]});
      const current={schemaVersion:1,draftId:meta.draftId,publishedAt,weights:meta.weights,ranked,batchCount:meta.batchCount,batches:meta.batches,providers:['naver-search-ads',meta.newsProvider||'news-auto-fallback']};
      const publicHome=buildHomePublicSnapshot(current,previousHistory,Date.parse(publishedAt));
      const publicAdmin=buildAdminPublicSnapshot(current);
      const personEntries=buildPersonPublicEntries(current,previousHistory,Date.parse(publishedAt));
      const previousPersonEntries=await mgetJSON(personEntries.map(([key])=>key));
      const trendedPersonEntries=personEntries.map(([key,view],index)=>[key,mergePersonTrend(view,previousPersonEntries[index]||null,60)]);
      const categorySnapshots=buildCategoryPublicSnapshots(current);
      const history={items:[{draftId:meta.draftId,publishedAt,weights:meta.weights,top30:publicAdmin.top30},...(previousHistory.items||[]).filter(x=>x.draftId!==meta.draftId)].slice(0,30)};
      const nextMeta={...meta,status:'published',publishedAt,top30:publicAdmin.top30};delete nextMeta.ranked;
      await msetJSON([
        [CURRENT,current],[HISTORY,history],[PUBLIC_HOME,publicHome],[PUBLIC_ADMIN,publicAdmin],[META,nextMeta],
        ...Object.entries(categorySnapshots).map(([type,value])=>[categoryDomain(type),value])
      ]);
      await writePersonEntries(trendedPersonEntries);
      const historyWarnings=[];
      // HISTORY V1 remains readable as a legacy layer. New formal publish snapshots are recorded only in V2.
      try{await recordPublishedSnapshotV2(current,previousHistory);}catch(historyError){console.error('[HISTORY_V2_NON_BLOCKING]',historyError);historyWarnings.push('HISTORY_V2_CAPTURE_FAILED');}
      return res.status(200).json({ok:true,draftId:meta.draftId,publishedAt,historyWarnings});
    }
    return res.status(400).json({ok:false,error:'UNKNOWN_NOW_ACTION'});
  }catch(error){console.error('[NOW_DATA_ADMIN]',error);return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'NOW_DATA_ADMIN_FAILED',detail:String(error?.message||'')});}
};
