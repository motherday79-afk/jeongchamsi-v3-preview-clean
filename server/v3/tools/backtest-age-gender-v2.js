#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const baseline=require('../data/age-gender-baseline-v2.json');
const manifest=require('../data/age-gender-baseline-v2-manifest.json');
const crosswalk=require('../data/age-gender-crosswalk-v2.json');
const rosterLib=require('../lib/politician-live-roster');
const {parseCsv}=require('./build-age-gender-baseline-v2');

const METRIC_KEYS=['directionAccuracy','mae','confidenceCalibration','coverage','extremeErrorRate'];
function finite(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;}
function round(v,d=1){if(v===null||v===undefined||!Number.isFinite(Number(v)))return null;const p=10**d;return Math.round(Number(v)*p)/p;}
function sign(v){const n=finite(v);return n===null?null:n>0?1:n<0?-1:0;}

function buildCoverageReport(){
  const roster=rosterLib.allPeople(),people=baseline.people||{},ids=roster.map(p=>String(p.id||'')).filter(Boolean),idSet=new Set(ids);
  const explicit=ids.filter(id=>people[id]&&String(people[id].baselineKind||''));
  const missing=ids.filter(id=>!people[id]||!String(people[id].baselineKind||''));
  const extra=Object.keys(people).filter(id=>!idSet.has(id));
  const kinds=['DIRECT_CANDIDATE','PARTY_PROXY','REGIONAL_PARTY_PROXY','LIMITED'];
  const counts=Object.fromEntries(kinds.map(kind=>[kind,explicit.filter(id=>people[id].baselineKind===kind).length]));
  const limitedPersonIds=explicit.filter(id=>people[id].baselineKind==='LIMITED');
  const unresolvedMappings=Array.isArray(manifest.unresolved)?manifest.unresolved:[];
  return {
    schemaVersion:2,
    engineVersion:'JCS_AGE_GENDER_INTELLIGENCE_V2',
    baselineVersion:String(manifest.baselineVersion||baseline.baselineVersion||''),
    validationStatus:String(manifest.validationStatus||'BASELINE_INGESTION_REQUIRED'),
    trustedBaselineReady:Boolean(manifest.trustedBaselineReady),
    rosterTotal:ids.length,
    explicitBaselineCount:explicit.length,
    coveragePct:ids.length?round(explicit.length/ids.length*100,1):0,
    counts,
    missingPersonIds:missing,
    extraBaselinePersonIds:extra,
    limitedPersonIds,
    unresolvedMappings,
    unresolvedMappingRows:Number(manifest.unresolvedMappingRows)||unresolvedMappings.length,
    crosswalkOverrideCount:Object.keys(crosswalk.overrides||{}).length,
    sourceAuthorities:Array.isArray(manifest.sourceAuthorities)?manifest.sourceAuthorities:[],
    sourceFiles:Array.isArray(manifest.sourceFiles)?manifest.sourceFiles:[]
  };
}

function evaluateHoldout(rows=[]){
  const all=Array.isArray(rows)?rows:[];
  const usable=all.map(row=>({actual:finite(row.actual??row.actualDelta),predicted:finite(row.predicted??row.predictedMomentum),confidence:finite(row.confidence)})).filter(x=>x.actual!==null&&x.predicted!==null);
  if(!all.length||!usable.length)return Object.fromEntries(METRIC_KEYS.map(k=>[k,null]));
  let directionHits=0,directionN=0,absError=0,extreme=0,calibration=0,calibrationN=0;
  for(const row of usable){
    const as=sign(row.actual),ps=sign(row.predicted);if(as!==0){directionN++;if(as===ps)directionHits++;}
    const err=Math.abs(row.predicted-row.actual);absError+=err;if(err>=20)extreme++;
    if(row.confidence!==null){const correct=as===ps?100:0;calibration+=Math.abs(Math.max(0,Math.min(100,row.confidence))-correct);calibrationN++;}
  }
  return {
    directionAccuracy:directionN?round(directionHits/directionN*100,1):null,
    mae:round(absError/usable.length,1),
    confidenceCalibration:calibrationN?round(calibration/calibrationN,1):null,
    coverage:round(usable.length/all.length*100,1),
    extremeErrorRate:round(extreme/usable.length*100,1)
  };
}

function buildValidationReport(holdoutRows=[]){
  const coverage=buildCoverageReport(),hasHoldout=Array.isArray(holdoutRows)&&holdoutRows.length>0;
  let status='BASELINE_INGESTION_REQUIRED';
  if(coverage.trustedBaselineReady&&!hasHoldout)status='HOLDOUT_VALIDATION_REQUIRED';
  if(coverage.trustedBaselineReady&&hasHoldout)status='OFFLINE_VALIDATION_AVAILABLE';
  return {
    engineVersion:coverage.engineVersion,
    baselineVersion:coverage.baselineVersion,
    validationStatus:status,
    trustedBaselineReady:coverage.trustedBaselineReady,
    holdoutSampleSize:hasHoldout?holdoutRows.length:0,
    metrics:hasHoldout&&coverage.trustedBaselineReady?evaluateHoldout(holdoutRows):Object.fromEntries(METRIC_KEYS.map(k=>[k,null])),
    coverage
  };
}

function readHoldout(file){
  if(!file)return [];
  const full=path.resolve(file),bytes=fs.readFileSync(full),ext=path.extname(full).toLowerCase();
  if(ext==='.json'){const parsed=JSON.parse(bytes.toString('utf8'));return Array.isArray(parsed)?parsed:Array.isArray(parsed.rows)?parsed.rows:[];}
  return parseCsv(bytes);
}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function modelCardMarkdown(report){
  const c=report.coverage,m=report.metrics;
  return `# JCS AGE & GENDER INTELLIGENCE ENGINE V2 — MODEL CARD\n\n`+
`## Release state\n\n- Engine: \`${report.engineVersion}\`\n- Baseline: \`${report.baselineVersion}\`\n- Validation status: **${report.validationStatus}**\n- Trusted official baseline ready: **${report.trustedBaselineReady?'YES':'NO'}**\n- Explicit roster coverage: **${c.explicitBaselineCount}/${c.rosterTotal} (${c.coveragePct}%)**\n\n`+
`## Integrity statement\n\nThe shipped source package currently contains a 542-person explicit coverage registry, but trusted official election and age×gender population source files have **not yet been ingested into the production baseline asset**. Therefore V2 demographic snapshot activation is intentionally gated and accuracy metrics are not claimed. Existing V1.2 intelligence remains the production fallback until the official-file baseline passes review.\n\n`+
`Missing or low-confidence cohort inputs are never converted into zero, -50, or synthetic precision. They remain \`SIGNAL CONFIDENCE LIMITED\` while JCS HISTORY remains intact.\n\n`+
`## Current baseline coverage\n\n- DIRECT_CANDIDATE: ${c.counts.DIRECT_CANDIDATE}\n- PARTY_PROXY: ${c.counts.PARTY_PROXY}\n- REGIONAL_PARTY_PROXY: ${c.counts.REGIONAL_PARTY_PROXY}\n- LIMITED: ${c.counts.LIMITED}\n- Missing roster members: ${c.missingPersonIds.length}\n- Unresolved mapping rows: ${c.unresolvedMappingRows}\n\n`+
`## Offline validation metrics\n\n- DIRECTION ACCURACY: ${m.directionAccuracy??'NOT EVALUATED'}\n- MAE: ${m.mae??'NOT EVALUATED'}\n- CONFIDENCE CALIBRATION: ${m.confidenceCalibration??'NOT EVALUATED'}\n- COVERAGE: ${m.coverage??'NOT EVALUATED'}\n- EXTREME ERROR RATE: ${m.extremeErrorRate??'NOT EVALUATED'}\n\n`+
`These values remain NOT EVALUATED until a trusted official baseline and a time-correct holdout set are supplied locally. No accuracy figure is inferred from unit tests or synthetic fixtures.\n\n`+
`## Activation gate\n\n1. Ingest official election result files and official age×gender population files with the offline importer.\n2. Review unresolved candidate/jurisdiction/geographic crosswalks.\n3. Confirm all 542 roster members have an explicit DIRECT/PROXY/LIMITED state and no silent loss.\n4. Run historical holdout backtests without future evidence leakage.\n5. Review model metrics and version coefficients before setting the trusted baseline ready state.\n6. Only then allow admin refresh to write immutable \`jcv3:intelligence:v2:*\` snapshots.\n`;
}

if(require.main===module){
  const args=process.argv.slice(2),value=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
  const holdout=readHoldout(value('--holdout')),report=buildValidationReport(holdout);
  const coverageOut=path.resolve(value('--coverage-out')||path.join(process.cwd(),'docs/JCS_AGE_GENDER_INTELLIGENCE_V2_COVERAGE.json'));
  const modelOut=path.resolve(value('--model-card-out')||path.join(process.cwd(),'docs/JCS_AGE_GENDER_INTELLIGENCE_V2_MODEL_CARD.md'));
  writeJson(coverageOut,{...report.coverage,validationStatus:report.validationStatus,holdoutSampleSize:report.holdoutSampleSize,metrics:report.metrics});
  fs.mkdirSync(path.dirname(modelOut),{recursive:true});fs.writeFileSync(modelOut,modelCardMarkdown(report));
  process.stdout.write(JSON.stringify({ok:true,validationStatus:report.validationStatus,rosterTotal:report.coverage.rosterTotal,explicitBaselineCount:report.coverage.explicitBaselineCount,metrics:report.metrics,coverageOut,modelOut},null,2)+'\n');
}

module.exports={METRIC_KEYS,buildCoverageReport,evaluateHoldout,buildValidationReport,readHoldout,modelCardMarkdown};
