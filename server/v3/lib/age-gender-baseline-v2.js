'use strict';

const baseline=require('../data/age-gender-baseline-v2.json');
const manifest=require('../data/age-gender-baseline-v2-manifest.json');

const BASELINE_VERSION='JCS_AGE_GENDER_BASELINE_V2';
const COHORT_KEYS=Object.freeze(['18_29_m','18_29_f','30_39_m','30_39_f','40_49_m','40_49_f','50_59_m','50_59_f','60_69_m','60_69_f','70_plus_m','70_plus_f']);
const BASELINE_KINDS=new Set(['DIRECT_CANDIDATE','PARTY_PROXY','REGIONAL_PARTY_PROXY','LIMITED']);

function normalizedVector(values){
  if(!Array.isArray(values)||values.length!==COHORT_KEYS.length)return Array(COHORT_KEYS.length).fill(null);
  const nums=values.map(v=>v===null||v===undefined||v===''?null:Number(v));
  if(nums.some(v=>v===null||!Number.isFinite(v)||v<0))return Array(COHORT_KEYS.length).fill(null);
  const total=nums.reduce((a,b)=>a+b,0);if(!(total>0))return Array(COHORT_KEYS.length).fill(null);
  return nums.map(v=>v/total);
}
function affinityVector(values){
  if(!Array.isArray(values)||values.length!==COHORT_KEYS.length)return Array(COHORT_KEYS.length).fill(null);
  return values.map(v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null));
}
function normalizeRecord(row,id){
  if(!row)return null;
  return {...row,personId:String(row.personId||id||''),baselineKind:BASELINE_KINDS.has(row.baselineKind)?row.baselineKind:'LIMITED',baselineQuality:Math.max(0,Math.min(100,Number(row.baselineQuality)||0)),populationWeights:normalizedVector(row.populationWeights),cohortAffinity:affinityVector(row.cohortAffinity),limitedReasons:Array.isArray(row.limitedReasons)?row.limitedReasons.map(String):[]};
}
function getAgeGenderBaselineV2(personId){const id=String(personId||'').trim();return id?normalizeRecord(baseline.people?.[id],id):null;}
function getAgeGenderBaselineManifestV2(){return {...manifest,cohortOrder:[...(manifest.cohortOrder||COHORT_KEYS)]};}
function hasTrustedBaselineV2(){return Boolean(manifest.trustedBaselineReady);}

module.exports={BASELINE_VERSION,COHORT_KEYS,getAgeGenderBaselineV2,getAgeGenderBaselineManifestV2,hasTrustedBaselineV2,_internals:{normalizedVector,affinityVector,normalizeRecord}};
