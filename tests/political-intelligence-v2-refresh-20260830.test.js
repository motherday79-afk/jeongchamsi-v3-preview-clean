const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('admin refresh finalize records V1 and attempts isolated V2 cohort snapshot after evidence/history preparation',()=>{
  const route=read('server/v3/routes/admin/now-data.js');
  assert.match(route,/recordPoliticalIntelligenceSnapshotV2/);
  assert.match(route,/ageGenderV2Snapshot/);
  const finalize=route.indexOf("if(action==='finalize')");
  const publish=route.indexOf("if(action==='publish')",finalize);
  const v1=route.indexOf('recordPoliticalIntelligenceSnapshotV1',finalize);
  const v2=route.indexOf('recordPoliticalIntelligenceSnapshotV2',finalize);
  assert.ok(finalize>=0&&v1>finalize&&v2>v1&&v2<publish);
  assert.match(route,/BASELINE_INGESTION_REQUIRED/);
  assert.match(route,/JCS_AGE_GENDER_V2_SNAPSHOT_FAILED/);
});

test('public serving protected routes do not import V2 intelligence',()=>{
  for(const file of ['api/gateway.js','server/v3/routes/now-data.js','server/v3/lib/now-public-signals.js','server/v3/lib/now-public-snapshot.js','src/core/repository.js','src/views/home.js']){
    assert.doesNotMatch(read(file),/political-intelligence-v2|age-gender-cohort|age-gender-baseline-v2/i,file);
  }
});
