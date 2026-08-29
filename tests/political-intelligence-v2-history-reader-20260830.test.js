const test=require('node:test');
const assert=require('node:assert/strict');

test('frozen V2 cohort layer is merged with compatible V1.2 without reading large current NOW payload',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  let currentReads=0;
  const v1={version:'JCS_POLITICAL_INTELLIGENCE_V1_2',diagnosis:{label:'BASE'},support:{ageMomentum:{age2030:1,age4050:2,age60plus:3}}};
  const v2={version:'JCS_POLITICAL_INTELLIGENCE_V2',engineVersion:'JCS_AGE_GENDER_INTELLIGENCE_V2',draftId:'d2',publishedAt:'2026-08-30T00:00:00.000Z',cohorts:{cells:{},age:{},gender:{},summary:{},validity:{state:'VALID_SIGNAL'}}};
  const store=createHistoryV2Store({
    getJSON:async key=>{if(key==='nowDataCurrent')currentReads++;return null;},
    readLatestPoliticalIntelligenceSnapshotPersonV2:async()=>v2,
    readPoliticalIntelligenceSnapshotPersonV2:async()=>null,
    readLatestPoliticalIntelligenceSnapshotPersonV1:async()=>v1,
    readPoliticalIntelligenceSnapshotPersonV1:async()=>null
  });
  const out=await store.readPoliticalIntelligenceV2('p');
  assert.equal(out.version,'JCS_POLITICAL_INTELLIGENCE_V2');
  assert.equal(out.legacyVersion,'JCS_POLITICAL_INTELLIGENCE_V1_2');
  assert.equal(out.diagnosis.label,'BASE');
  assert.equal(out.cohorts.validity.state,'VALID_SIGNAL');
  assert.equal(currentReads,0);
});

test('when no compatible V2 exists reader preserves current V1.2 frozen fallback behavior',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  const v1={version:'JCS_POLITICAL_INTELLIGENCE_V1_2',diagnosis:{label:'V1'}};
  const store=createHistoryV2Store({
    readLatestPoliticalIntelligenceSnapshotPersonV2:async()=>null,
    readLatestPoliticalIntelligenceSnapshotPersonV1:async()=>v1,
    getJSON:async()=>{throw new Error('must not read current');}
  });
  assert.deepEqual(await store.readPoliticalIntelligenceV2('p'),v1);
});

test('a frozen V2 layer with LIMITED cohort signal still exposes the V2 admin structure while preserving V1.2 analysis',async()=>{
  const {createHistoryV2Store}=require('../server/v3/lib/history-v2-store');
  let currentReads=0;
  const v1={version:'JCS_POLITICAL_INTELLIGENCE_V1_2',diagnosis:{label:'V1 USEFUL'},support:{ageMomentum:{age2030:1,age4050:2,age60plus:3}}};
  const v2={version:'JCS_POLITICAL_INTELLIGENCE_V2',engineVersion:'JCS_AGE_GENDER_INTELLIGENCE_V2',cohorts:{validity:{state:'LIMITED_SIGNAL',validCellCount:0,totalCellCount:12},cells:{},age:{},gender:{},summary:{},baseline:{kind:'LIMITED',quality:0}}};
  const store=createHistoryV2Store({readLatestPoliticalIntelligenceSnapshotPersonV2:async()=>v2,readLatestPoliticalIntelligenceSnapshotPersonV1:async()=>v1,getJSON:async()=>{currentReads++;throw new Error('must not read current');}});
  const out=await store.readPoliticalIntelligenceV2('p');
  assert.equal(out.version,'JCS_POLITICAL_INTELLIGENCE_V2');
  assert.equal(out.legacyVersion,'JCS_POLITICAL_INTELLIGENCE_V1_2');
  assert.equal(out.diagnosis.label,'V1 USEFUL');
  assert.equal(out.cohorts.validity.state,'LIMITED_SIGNAL');
  assert.equal(out.validity.cohortValidCells,0);
  assert.equal(currentReads,0);
});
