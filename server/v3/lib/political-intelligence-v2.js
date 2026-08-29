'use strict';
const {deriveAgeGenderCohortsV2,ENGINE_VERSION}=require('./age-gender-cohort-core');
const VERSION='JCS_POLITICAL_INTELLIGENCE_V2';
const SNAPSHOT_SCHEMA='JCS_POLITICAL_INTELLIGENCE_SNAPSHOT_V2';
function derivePoliticalIntelligenceV2({v1={},view={},history={},evidence={},baseline={},previousV2=null,reference30d=null,volatility30d=null,marketContext={},asOf=new Date().toISOString()}={}){
  const person=view?.row?.person||{};const cohorts=deriveAgeGenderCohortsV2({person,baseline,view,history,evidence,previous:previousV2,reference30d,volatility30d,marketContext,asOf});
  return {...v1,version:VERSION,engineVersion:ENGINE_VERSION,snapshotSchema:SNAPSHOT_SCHEMA,legacyVersion:v1?.version||null,asOf,cohorts,validity:{...(v1?.validity||{}),cohortState:cohorts.validity.state,cohortValidCells:cohorts.validity.validCellCount,cohortTotalCells:12,baselineKind:cohorts.baseline.kind,baselineQuality:cohorts.baseline.quality}};
}
module.exports={VERSION,ENGINE_VERSION,SNAPSHOT_SCHEMA,derivePoliticalIntelligenceV2};
