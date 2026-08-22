const { requireAdmin } = require('../../../../lib/v3/access');
const { getJSON, setJSON, mgetJSON } = require('../../../../lib/v3/redis');
const { allPeople } = require('../../lib/politician-live-roster');
const { credentials: searchCredentials } = require('../../lib/naver-searchad');
const { credentials: newsCredentials } = require('../../lib/naver-news');
const { makeBatches, collectBatch, aggregateBatchSummaries, scoreSnapshot, resultState, compactRankRow } = require('../../lib/now-data-engine');

const META='nowDataDraftMeta',CURRENT='nowDataCurrent',HISTORY='nowDataHistory';
const batchDomain=(draftId,index)=>`nowDataBatch:${draftId}:${index}`;
function weights(body={}){let s=Math.max(0,Math.min(100,Number(body.searchWeight)||50)),n=Math.max(0,Math.min(100,Number(body.newsWeight)||50));if(s+n===0){s=50;n=50;}return {search:s,news:n};}
async function loadBatches(meta){if(!meta?.draftId||!Array.isArray(meta.batches))return [];return mgetJSON(meta.batches.map((_,i)=>batchDomain(meta.draftId,i)));}
function failedBatchIndexes(batches=[]){const out=[];batches.forEach((batch,i)=>{if(batch?.results?.some(row=>resultState(row)!=='success'))out.push(i);});return out;}
function publicMeta(meta,batches){
  if(!meta)return null;
  const summary=aggregateBatchSummaries(batches,meta.total);
  return {draftId:meta.draftId,status:meta.status,total:meta.total,batchSize:meta.batchSize,batchCount:meta.batchCount,startedAt:meta.startedAt,finalizedAt:meta.finalizedAt||null,publishedAt:meta.publishedAt||null,weights:meta.weights,summary,completedBatchIndexes:batches.map((x,i)=>x?i:null).filter(x=>x!==null),failedBatchIndexes:failedBatchIndexes(batches),top30:meta.top30||[]};
}
module.exports=async function nowDataAdmin(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  try{
    const admin=await requireAdmin(req);if(!admin)return res.status(401).json({ok:false,error:'ADMIN_LOGIN_REQUIRED'});
    if(req.method==='GET'){
      const [meta,current]=await Promise.all([getJSON(META),getJSON(CURRENT)]),batches=await loadBatches(meta);
      return res.status(200).json({ok:true,configured:{searchAds:searchCredentials().configured,news:newsCredentials().configured},rosterTotal:allPeople().length,draft:publicMeta(meta,batches),current:current?{draftId:current.draftId,publishedAt:current.publishedAt,weights:current.weights,top30:(current.ranked||[]).slice(0,30)}:null,performance:{batchSize:10,browserWorkers:2,serverConcurrency:5}});
    }
    if(req.method!=='POST')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
    const action=String(req.body?.action||'');
    if(action==='start'){
      const people=allPeople(),ids=people.map(x=>x.id),batches=makeBatches(ids,10),w=weights(req.body),draftId=`now-${Date.now().toString(36)}`;
      const meta={draftId,status:'collecting',total:ids.length,batchSize:10,batchCount:batches.length,batches,weights:w,startedAt:new Date().toISOString(),createdBy:admin.id};
      await setJSON(META,meta);
      return res.status(200).json({ok:true,draftId,batchCount:batches.length,batchSize:10,total:ids.length,weights:w,performance:{browserWorkers:2,serverConcurrency:5}});
    }
    const meta=await getJSON(META);if(!meta||String(req.body?.draftId||'')!==meta.draftId)return res.status(409).json({ok:false,error:'NOW_DRAFT_MISMATCH'});
    if(action==='collect-batch'){
      const index=Number(req.body?.batchIndex);if(!Number.isInteger(index)||index<0||index>=meta.batchCount)return res.status(400).json({ok:false,error:'INVALID_BATCH_INDEX'});
      const ids=meta.batches[index],data=await collectBatch(ids,{concurrency:5});
      const stored={draftId:meta.draftId,batchIndex:index,ids,results:data.results,elapsedMs:data.elapsedMs,collectedAt:new Date().toISOString()};
      await setJSON(batchDomain(meta.draftId,index),stored);
      return res.status(200).json({ok:true,batchIndex:index,count:data.results.length,elapsedMs:data.elapsedMs,summary:aggregateBatchSummaries([stored],ids.length)});
    }
    if(action==='retry-batch'){
      const index=Number(req.body?.batchIndex),key=batchDomain(meta.draftId,index),old=await getJSON(key);if(!old)return res.status(404).json({ok:false,error:'BATCH_NOT_FOUND'});
      const retryIds=old.results.filter(row=>resultState(row)!=='success').map(row=>row.person?.id).filter(Boolean);if(!retryIds.length)return res.status(200).json({ok:true,batchIndex:index,count:0,summary:aggregateBatchSummaries([old],old.ids.length)});
      const retry=await collectBatch(retryIds,{concurrency:5}),map=new Map(retry.results.map(x=>[x.person?.id,x]));
      old.results=old.results.map(row=>map.get(row.person?.id)||row);old.retriedAt=new Date().toISOString();await setJSON(key,old);
      return res.status(200).json({ok:true,batchIndex:index,count:retry.results.length,summary:aggregateBatchSummaries([old],old.ids.length)});
    }
    if(action==='finalize'){
      const batches=await loadBatches(meta);if(batches.some(x=>!x))return res.status(409).json({ok:false,error:'NOW_BATCHES_INCOMPLETE',summary:aggregateBatchSummaries(batches,meta.total)});
      const rows=batches.flatMap(x=>x.results||[]),ranked=scoreSnapshot(rows,{searchWeight:meta.weights.search,newsWeight:meta.weights.news}).map(compactRankRow);
      meta.status='preview';meta.finalizedAt=new Date().toISOString();meta.top30=ranked.slice(0,30);meta.ranked=ranked;await setJSON(META,meta);
      return res.status(200).json({ok:true,draftId:meta.draftId,summary:aggregateBatchSummaries(batches,meta.total),top30:meta.top30,weights:meta.weights});
    }
    if(action==='publish'){
      if(meta.status!=='preview'||!Array.isArray(meta.ranked))return res.status(409).json({ok:false,error:'NOW_PREVIEW_REQUIRED'});
      const publishedAt=new Date().toISOString(),current={schemaVersion:1,draftId:meta.draftId,publishedAt,weights:meta.weights,ranked:meta.ranked,batchCount:meta.batchCount,batches:meta.batches,providers:['naver-search-ads','naver-news']};
      await setJSON(CURRENT,current);
      const history=(await getJSON(HISTORY))||{items:[]};history.items=[{draftId:meta.draftId,publishedAt,weights:meta.weights,top30:meta.top30},...(history.items||[]).filter(x=>x.draftId!==meta.draftId)].slice(0,30);await setJSON(HISTORY,history);
      meta.status='published';meta.publishedAt=publishedAt;await setJSON(META,meta);
      return res.status(200).json({ok:true,draftId:meta.draftId,publishedAt});
    }
    return res.status(400).json({ok:false,error:'UNKNOWN_NOW_ACTION'});
  }catch(error){console.error('[NOW_DATA_ADMIN]',error);return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'NOW_DATA_ADMIN_FAILED',detail:String(error?.message||'')});}
};
