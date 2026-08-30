const { requireAdmin } = require('../../../../lib/v3/access');
const { getJSON, setJSON, mgetJSON, msetJSON } = require('../../../../lib/v3/redis');
const { allPeople } = require('../../lib/politician-live-roster');
const { credentials: searchCredentials } = require('../../lib/naver-searchad');
const { credentials: newsCredentials, availability: newsAvailability } = require('../../lib/naver-news');
const { makeBatches, collectBatch, aggregateBatchSummaries, scoreSnapshot, resultState, compactRankRow } = require('../../lib/now-data-engine');
const { compactPreviewRow, compactHistory, buildHomePublicSnapshot, buildAdminPublicSnapshot, buildPersonPublicEntries, buildCategoryPublicSnapshots, mergePersonTrend } = require('../../lib/now-public-snapshot');
const { recordPublishedSnapshotV2 } = require('../../lib/history-v2-store');
const { collectExternalEvidence } = require('../../lib/external-evidence-collector');
const { collectOfficialAgeGenderBaseline } = require('../../lib/age-gender-public-baseline-collector');
const { readAgeGenderBaselineBundleV2, writeAgeGenderBaselineBundleV2 } = require('../../lib/age-gender-baseline-v2-store');
const { recordPoliticalIntelligenceSnapshotV1 } = require('../../lib/political-intelligence-store');
const { recordPoliticalIntelligenceSnapshotV2 } = require('../../lib/political-intelligence-v2-store');
const { cleanupAllNowTemp, cleanupDraftNowTemp } = require('../../lib/now-temp-cleanup');
const { fitNowPublishEntries } = require('../../lib/now-publish-payload');

const META='nowDataDraftMeta',CURRENT='nowDataCurrent',HISTORY='nowDataHistory',PUBLIC_HOME='nowDataPublicHome',PUBLIC_ADMIN='nowDataPublicAdmin';
const categoryDomain=type=>`nowDataPublicCategory:${type}`;
const batchDomain=(draftId,index)=>`nowDataBatch:${draftId}:${index}`;
const batchStatusDomain=(draftId,index)=>`nowDataBatchStatus:${draftId}:${index}`;
const rankedDomain=draftId=>`nowDataDraftRanked:${draftId}`;
const evidenceDomain=draftId=>`nowDataExternalEvidence:${draftId}`;

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
  return {draftId:meta.draftId,status:meta.status,total:meta.total,batchSize:meta.batchSize,batchCount:meta.batchCount,startedAt:meta.startedAt,finalizedAt:meta.finalizedAt||null,publishedAt:meta.publishedAt||null,weights:meta.weights,summary,completedBatchIndexes:completed,failedBatchIndexes:failed,top30:meta.top30||[],externalEvidence:meta.externalEvidence||null,ageGenderBaseline:meta.ageGenderBaseline||null,intelligenceSnapshot:meta.intelligenceSnapshot||null,pipeline:meta.pipeline||null};
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
      const meta={draftId,status:'collecting',total:ids.length,batchSize:10,batchCount:batches.length,batches,weights:w,newsProvider:configured.newsProvider,startedAt:new Date().toISOString(),createdBy:admin.id,pipeline:{stage:'now',detail:'SEARCH_NEWS_COLLECTION',updatedAt:new Date().toISOString()}};
      const tempCleanup=await cleanupAllNowTemp();
      await setJSON(META,meta);
      return res.status(200).json({ok:true,draftId,batchCount:batches.length,batchSize:10,total:ids.length,weights:w,tempCleanup,performance:{browserWorkers:2,serverConcurrency:5}});
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
    if(action==='collect-external-evidence'){
      const evidence=await collectExternalEvidence({people:allPeople()});
      const externalEvidence={
        status:'collected',collectedAt:evidence.collectedAt,recordCount:Number(evidence.recordCount)||0,matchedPeople:Number(evidence.matchedPeople)||0,
        sources:(evidence.sources||[]).map(x=>({sourceId:x.sourceId,institution:x.institution,url:x.url,ok:Boolean(x.ok),records:Number(x.records)||0,elapsedMs:Number(x.elapsedMs)||0,error:x.error||''})),
        warnings:Array.isArray(evidence.warnings)?evidence.warnings.slice(0,20):[]
      };
      const next={...meta,externalEvidence,pipeline:{stage:'evidence',detail:'PUBLIC_RESEARCH_POLL_EVIDENCE_COMPLETE',updatedAt:new Date().toISOString()}};
      await msetJSON([[evidenceDomain(meta.draftId),evidence],[META,next]]);
      return res.status(200).json({ok:true,draftId:meta.draftId,...externalEvidence});
    }
    if(action==='collect-age-gender-baseline'){
      const previous=await readAgeGenderBaselineBundleV2({fresh:true});
      try{
        const bundle=await collectOfficialAgeGenderBaseline({people:allPeople()});
        const manifest=bundle.manifest||{};
        if(!manifest.trustedBaselineReady){
          if(previous?.manifest?.trustedBaselineReady){
            const ageGenderBaseline={status:'reused',warning:'USING_PREVIOUS_TRUSTED_BASELINE',collectedAt:previous.generatedAt||null,rosterTotal:Number(previous.manifest.rosterTotal)||0,directCount:Number(previous.manifest.directCount)||0,partyProxyCount:Number(previous.manifest.partyProxyCount)||0,regionalPartyProxyCount:Number(previous.manifest.regionalPartyProxyCount)||0,limitedCount:Number(previous.manifest.limitedCount)||0,coverage:Number(previous.manifest.coverage)||0};
            const next={...meta,ageGenderBaseline,pipeline:{stage:'official',detail:'OFFICIAL_ELECTION_POPULATION_AGE_GENDER_COMPLETE',updatedAt:new Date().toISOString()}};await setJSON(META,next);return res.status(200).json({ok:true,draftId:meta.draftId,...ageGenderBaseline});
          }
          return res.status(409).json({ok:false,error:'AGE_GENDER_BASELINE_COVERAGE_INSUFFICIENT',manifest});
        }
        const stored=await writeAgeGenderBaselineBundleV2(bundle);
        const ageGenderBaseline={status:'collected',collectedAt:bundle.generatedAt,rosterTotal:Number(manifest.rosterTotal)||0,usableCount:Number(manifest.usableCount)||0,directCount:Number(manifest.directCount)||0,partyProxyCount:Number(manifest.partyProxyCount)||0,regionalPartyProxyCount:Number(manifest.regionalPartyProxyCount)||0,limitedCount:Number(manifest.limitedCount)||0,coverage:Number(manifest.coverage)||0,partyProfileCount:Number(manifest.partyProfileCount)||0,compressedBytes:Number(stored.compressedBytes)||0,sources:(manifest.sourceStatus||[]).map(x=>({sourceId:x.sourceId,authority:x.authority,ok:Boolean(x.ok),bytes:Number(x.bytes)||0,error:x.error||''})),warnings:Array.isArray(manifest.warnings)?manifest.warnings.slice(0,20):[]};
        const next={...meta,ageGenderBaseline,pipeline:{stage:'official',detail:'OFFICIAL_ELECTION_POPULATION_AGE_GENDER_COMPLETE',updatedAt:new Date().toISOString()}};await setJSON(META,next);return res.status(200).json({ok:true,draftId:meta.draftId,...ageGenderBaseline});
      }catch(error){
        if(previous?.manifest?.trustedBaselineReady){
          const ageGenderBaseline={status:'reused',warning:'USING_PREVIOUS_TRUSTED_BASELINE',sourceError:String(error?.code||error?.message||'OFFICIAL_BASELINE_COLLECTION_FAILED'),collectedAt:previous.generatedAt||null,rosterTotal:Number(previous.manifest.rosterTotal)||0,directCount:Number(previous.manifest.directCount)||0,partyProxyCount:Number(previous.manifest.partyProxyCount)||0,regionalPartyProxyCount:Number(previous.manifest.regionalPartyProxyCount)||0,limitedCount:Number(previous.manifest.limitedCount)||0,coverage:Number(previous.manifest.coverage)||0};
          const next={...meta,ageGenderBaseline,pipeline:{stage:'official',detail:'OFFICIAL_ELECTION_POPULATION_AGE_GENDER_COMPLETE',updatedAt:new Date().toISOString()}};await setJSON(META,next);return res.status(200).json({ok:true,draftId:meta.draftId,...ageGenderBaseline});
        }
        return res.status(502).json({ok:false,error:error?.code||'AGE_GENDER_OFFICIAL_BASELINE_COLLECTION_FAILED',detail:String(error?.message||'')});
      }
    }
    if(action==='finalize'){
      meta={...meta,pipeline:{stage:'market',detail:'RANK_PARTY_REGION_COMPETITOR_CONTEXT',updatedAt:new Date().toISOString()}};await setJSON(META,meta);
      const batches=await loadBatches(meta);if(batches.some(x=>!x))return res.status(409).json({ok:false,error:'NOW_BATCHES_INCOMPLETE',summary:aggregateBatchSummaries(batches,meta.total)});
      const rows=batches.flatMap(x=>x.results||[]),ranked=scoreSnapshot(rows,{searchWeight:meta.weights.search,newsWeight:meta.weights.news}).map(compactRankRow),summary=aggregateBatchSummaries(batches,meta.total);
      const statuses=await loadBatchStatuses(meta),top30=ranked.slice(0,30).map(compactPreviewRow),finalizedAt=new Date().toISOString();
      let next={...meta,status:'preview',finalizedAt,top30,summary,completedBatchIndexes:Array.from({length:meta.batchCount},(_,i)=>i),failedBatchIndexes:failedBatchIndexes(statuses)};delete next.ranked;
      await msetJSON([[rankedDomain(meta.draftId),ranked],[META,next]]);
      let intelligenceSnapshot=null,ageGenderV2Snapshot=null;const intelligenceWarnings=[];
      try{
        meta={...meta,pipeline:{stage:'history',detail:'HISTORY_CONTEXT_PREPARED',updatedAt:new Date().toISOString()}};await setJSON(META,meta);
        const previousHistory=compactHistory((await getJSON(HISTORY))||{items:[]});
        const previewCurrent={schemaVersion:1,draftId:meta.draftId,publishedAt:finalizedAt,snapshotKind:'REFRESH_FINALIZE',weights:meta.weights,ranked,batchCount:meta.batchCount,batches:meta.batches,providers:['naver-search-ads',meta.newsProvider||'news-auto-fallback']};
        const previewEntries=buildPersonPublicEntries(previewCurrent,previousHistory,Date.parse(finalizedAt));
        const previousPersonEntries=await mgetJSON(previewEntries.map(([key])=>key));
        const trendedPreviewEntries=previewEntries.map(([key,view],index)=>[key,mergePersonTrend(view,previousPersonEntries[index]||null,60)]);
        const evidenceBundle=(await getJSON(evidenceDomain(meta.draftId)))||{version:'JCS_EXTERNAL_EVIDENCE_V1',collectedAt:finalizedAt,records:[],sources:[],warnings:[{sourceId:'refresh',error:'EXTERNAL_EVIDENCE_NOT_COLLECTED'}],matchedPeople:0,recordCount:0};
        meta={...meta,pipeline:{stage:'cohort',detail:'AGE_GENDER_COHORT_ANALYSIS',updatedAt:new Date().toISOString()}};await setJSON(META,meta);
        try{ageGenderV2Snapshot=await recordPoliticalIntelligenceSnapshotV2({current:previewCurrent,legacyHistory:previousHistory,personViews:trendedPreviewEntries,evidenceBundle});}
        catch(v2Error){console.error('[JCS_AGE_GENDER_V2_REFRESH_SNAPSHOT_NON_BLOCKING]',v2Error);intelligenceWarnings.push('JCS_AGE_GENDER_V2_SNAPSHOT_FAILED');}
        meta={...meta,pipeline:{stage:'intelligence',detail:'AGGRESSIVE_JCS_INTELLIGENCE',updatedAt:new Date().toISOString()}};await setJSON(META,meta);
        intelligenceSnapshot=await recordPoliticalIntelligenceSnapshotV1({current:previewCurrent,legacyHistory:previousHistory,personViews:trendedPreviewEntries,evidenceBundle});
        if(ageGenderV2Snapshot?.error==='BASELINE_INGESTION_REQUIRED')intelligenceWarnings.push('BASELINE_INGESTION_REQUIRED');
        next={...next,pipeline:{stage:'verify',detail:'SNAPSHOT_VERIFIED_SAVED',updatedAt:new Date().toISOString()},intelligenceSnapshot:{created:Boolean(intelligenceSnapshot?.created),analysisAt:intelligenceSnapshot?.analysisAt||finalizedAt,snapshotKind:intelligenceSnapshot?.snapshotKind||'REFRESH_FINALIZE',rosterTotal:Number(intelligenceSnapshot?.rosterTotal)||0,compressedBytes:Number(intelligenceSnapshot?.compressedBytes)||0,evidenceRecords:Number(intelligenceSnapshot?.evidenceRecords)||0,matchedPeople:Number(intelligenceSnapshot?.matchedPeople)||0},ageGenderV2Snapshot:ageGenderV2Snapshot?{created:Boolean(ageGenderV2Snapshot.created),skipped:Boolean(ageGenderV2Snapshot.skipped),error:ageGenderV2Snapshot.error||null,analysisAt:ageGenderV2Snapshot.analysisAt||finalizedAt,rosterTotal:Number(ageGenderV2Snapshot.rosterTotal)||0,compressedBytes:Number(ageGenderV2Snapshot.compressedBytes)||0,baselineVersion:ageGenderV2Snapshot.baselineVersion||null}:null};
        await setJSON(META,next);
      }catch(intelligenceError){console.error('[JCS_INTELLIGENCE_REFRESH_SNAPSHOT_NON_BLOCKING]',intelligenceError);intelligenceWarnings.push('JCS_INTELLIGENCE_SNAPSHOT_FAILED');next={...next,pipeline:{stage:'verify',detail:'SNAPSHOT_VERIFY_COMPLETE_WITH_WARNINGS',updatedAt:new Date().toISOString()}};await setJSON(META,next);}
      return res.status(200).json({ok:true,draftId:meta.draftId,summary,top30,weights:meta.weights,intelligenceSnapshot,ageGenderV2Snapshot,intelligenceWarnings});
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
      const publishPayload=fitNowPublishEntries([
        [CURRENT,current],[HISTORY,history],[PUBLIC_HOME,publicHome],[PUBLIC_ADMIN,publicAdmin],[META,nextMeta],
        ...Object.entries(categorySnapshots).map(([type,value])=>[categoryDomain(type),value])
      ]);
      await msetJSON(publishPayload.entries);
      await writePersonEntries(trendedPersonEntries);
      const historyWarnings=[];
      // HISTORY V1 remains readable as a legacy layer. New formal publish snapshots are recorded only in V2.
      try{await recordPublishedSnapshotV2(current,previousHistory);}catch(historyError){console.error('[HISTORY_V2_NON_BLOCKING]',historyError);historyWarnings.push('HISTORY_V2_CAPTURE_FAILED');}
      let intelligenceSnapshot=null,ageGenderV2Snapshot=null;
      try{
        const evidenceBundle=(await getJSON(evidenceDomain(meta.draftId)))||{version:'JCS_EXTERNAL_EVIDENCE_V1',collectedAt:publishedAt,records:[],sources:[],warnings:[{sourceId:'refresh',error:'EXTERNAL_EVIDENCE_NOT_COLLECTED'}],matchedPeople:0,recordCount:0};
        intelligenceSnapshot=await recordPoliticalIntelligenceSnapshotV1({current,legacyHistory:previousHistory,personViews:trendedPersonEntries,evidenceBundle});
        try{ageGenderV2Snapshot=await recordPoliticalIntelligenceSnapshotV2({current,legacyHistory:previousHistory,personViews:trendedPersonEntries,evidenceBundle});}
        catch(v2Error){console.error('[JCS_AGE_GENDER_V2_SNAPSHOT_NON_BLOCKING]',v2Error);historyWarnings.push('JCS_AGE_GENDER_V2_SNAPSHOT_FAILED');}
        if(ageGenderV2Snapshot?.error==='BASELINE_INGESTION_REQUIRED')historyWarnings.push('BASELINE_INGESTION_REQUIRED');
        await setJSON(META,{...nextMeta,intelligenceSnapshot:{created:Boolean(intelligenceSnapshot?.created),rosterTotal:Number(intelligenceSnapshot?.rosterTotal)||0,compressedBytes:Number(intelligenceSnapshot?.compressedBytes)||0,evidenceRecords:Number(intelligenceSnapshot?.evidenceRecords)||0,matchedPeople:Number(intelligenceSnapshot?.matchedPeople)||0},ageGenderV2Snapshot:ageGenderV2Snapshot?{created:Boolean(ageGenderV2Snapshot.created),skipped:Boolean(ageGenderV2Snapshot.skipped),error:ageGenderV2Snapshot.error||null,rosterTotal:Number(ageGenderV2Snapshot.rosterTotal)||0,compressedBytes:Number(ageGenderV2Snapshot.compressedBytes)||0,baselineVersion:ageGenderV2Snapshot.baselineVersion||null}:null});
      }catch(intelligenceError){console.error('[JCS_INTELLIGENCE_SNAPSHOT_NON_BLOCKING]',intelligenceError);historyWarnings.push('JCS_INTELLIGENCE_SNAPSHOT_FAILED');}
      let tempCleanup={matched:0,deleted:0};
      try{tempCleanup=await cleanupDraftNowTemp(meta.draftId,meta.batchCount);}catch(cleanupError){console.error('[NOW_TEMP_CLEANUP_NON_BLOCKING]',cleanupError);historyWarnings.push('NOW_TEMP_CLEANUP_FAILED');}
      return res.status(200).json({ok:true,draftId:meta.draftId,publishedAt,historyWarnings,intelligenceSnapshot,ageGenderV2Snapshot,tempCleanup,publishPayload:{beforeBytes:publishPayload.beforeBytes,bytes:publishPayload.bytes,savedBytes:publishPayload.savedBytes,targetBytes:9500000,phase:publishPayload.phase}});
    }
    return res.status(400).json({ok:false,error:'UNKNOWN_NOW_ACTION'});
  }catch(error){console.error('[NOW_DATA_ADMIN]',error);return res.status(error?.code==='STORAGE_MISSING'?503:500).json({ok:false,error:error?.code||'NOW_DATA_ADMIN_FAILED',detail:String(error?.message||'')});}
};
