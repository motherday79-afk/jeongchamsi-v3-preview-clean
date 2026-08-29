const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('release coverage has all 542 roster people with an explicit baseline state and no silent loss',()=>{
  const tool=require('../server/v3/tools/backtest-age-gender-v2');
  const report=tool.buildCoverageReport();
  assert.equal(report.rosterTotal,542);
  assert.equal(report.explicitBaselineCount,542);
  assert.equal(report.coveragePct,100);
  assert.equal(report.counts.LIMITED,542);
  assert.equal(report.counts.DIRECT_CANDIDATE,0);
  assert.equal(report.limitedPersonIds.length,542);
  assert.deepEqual(report.missingPersonIds,[]);
  assert.ok(Array.isArray(report.unresolvedMappings));
});

test('release gate is honest when trusted baseline and holdout data are absent',()=>{
  const tool=require('../server/v3/tools/backtest-age-gender-v2');
  const report=tool.buildValidationReport([]);
  assert.equal(report.validationStatus,'BASELINE_INGESTION_REQUIRED');
  assert.equal(report.trustedBaselineReady,false);
  for(const key of ['directionAccuracy','mae','confidenceCalibration','coverage','extremeErrorRate']) assert.equal(report.metrics[key],null,key);
  assert.equal(report.holdoutSampleSize,0);
});

test('backtest computes declared metrics only when local holdout rows are supplied',()=>{
  const tool=require('../server/v3/tools/backtest-age-gender-v2');
  const rows=[
    {actual:10,predicted:8,confidence:80},
    {actual:-8,predicted:-4,confidence:70},
    {actual:5,predicted:-3,confidence:60},
    {actual:20,predicted:null,confidence:null}
  ];
  const metrics=tool.evaluateHoldout(rows);
  assert.equal(metrics.coverage,75);
  assert.equal(metrics.directionAccuracy,66.7);
  assert.equal(metrics.mae,4.7);
  assert.ok(metrics.confidenceCalibration>=0&&metrics.confidenceCalibration<=100);
  assert.equal(metrics.extremeErrorRate,0);
});

test('shipped model card and coverage artifact state that official baseline ingestion is still required',()=>{
  const model=fs.readFileSync(path.join(root,'docs/JCS_AGE_GENDER_INTELLIGENCE_V2_MODEL_CARD.md'),'utf8');
  const coverage=JSON.parse(fs.readFileSync(path.join(root,'docs/JCS_AGE_GENDER_INTELLIGENCE_V2_COVERAGE.json'),'utf8'));
  assert.match(model,/BASELINE_INGESTION_REQUIRED/);
  assert.match(model,/accuracy metrics[^\n]*not claimed|정확도[^\n]*주장하지/iu);
  assert.equal(coverage.validationStatus,'BASELINE_INGESTION_REQUIRED');
  assert.equal(coverage.explicitBaselineCount,542);
  assert.equal(coverage.metrics.directionAccuracy,null);
});
