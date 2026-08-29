'use strict';

const crypto=require('node:crypto');
const crosswalk=require('../data/age-gender-crosswalk-v2.json');
const {BASELINE_VERSION,COHORT_KEYS}=require('./age-gender-baseline-v2');
const {downloadDataGoFile,decodePublicText}=require('./public-baseline-source-client');
const {parseCsv,registryRows,mergeBaselineRows,buildDirectBaselines,buildPartyBaselines,applyProxyBaselines,buildManifest}=require('../tools/build-age-gender-baseline-v2');

const VERSION='JCS_OFFICIAL_AGE_GENDER_BASELINE_COLLECTOR_V2';
const SOURCE_DEFS=Object.freeze({
  population:Object.freeze({id:'population',publicDataPk:'15099158',authority:'행정안전부',title:'지역별(법정동) 성별 연령별 주민등록 인구수',date:'LATEST_MONTHLY',required:true}),
  constituency:Object.freeze({id:'constituency',publicDataPk:'15025527',authority:'중앙선거관리위원회',title:'제22대 국회의원선거 지역구 개표결과',date:'2024-04-10',required:true}),
  proportional:Object.freeze({id:'proportional',publicDataPk:'15144273',authority:'중앙선거관리위원회',title:'제22대 비례대표국회의원선거 개표결과',date:'2024-04-10',required:false})
});
const DEFAULT_PARTY_ALIASES=Object.freeze({
  '국민의미래':'국민의힘','더불어민주연합':'더불어민주당','조국혁신당':'조국혁신당','개혁신당':'개혁신당','진보당':'진보당','새로운미래':'새로운미래','녹색정의당':'정의당'
});
function sha256(bytes){return crypto.createHash('sha256').update(bytes||Buffer.alloc(0)).digest('hex');}
function sourceSummary(def,file){return {sourceId:def.id,authority:def.authority,title:def.title,date:def.date,url:file?.url||`https://www.data.go.kr/data/${def.publicDataPk}/fileData.do`,fileName:file?.fileName||'',bytes:Number(file?.bytes?.length)||0,sha256:sha256(file?.bytes),contentType:file?.contentType||''};}
function parseDownloadedCsv(file){return parseCsv(decodePublicText(file.bytes,file.contentType));}
async function defaultDownloadSource(def,{fetchImpl=globalThis.fetch}={}){return downloadDataGoFile({publicDataPk:def.publicDataPk,fetchImpl});}
function productionTrust(manifest,partyProfileCount,rosterTotal){
  const total=Number(rosterTotal)||0,coverage=total?Number(manifest.usableCount||0)/total:0,direct=Number(manifest.directCount)||0;
  return coverage>=.995&&(direct>=Math.min(20,Math.max(1,Math.ceil(total*.03)))||Number(partyProfileCount)>=2);
}
async function collectOfficialAgeGenderBaseline({people=[],downloadSource=defaultDownloadSource,fetchImpl=globalThis.fetch,partyAliases=DEFAULT_PARTY_ALIASES,overrides=crosswalk.overrides||{},now=()=>new Date()}={}){
  const roster=Array.isArray(people)?people.filter(p=>p?.id):[],files={},warnings=[],sources=[];
  for(const def of Object.values(SOURCE_DEFS)){
    try{const file=await downloadSource(def,{fetchImpl});if(!file?.bytes?.length)throw new Error('EMPTY_PUBLIC_FILE');files[def.id]=file;sources.push({...sourceSummary(def,file),ok:true});}
    catch(error){warnings.push({sourceId:def.id,error:String(error?.code||error?.message||'PUBLIC_SOURCE_FAILED')});sources.push({sourceId:def.id,authority:def.authority,title:def.title,date:def.date,url:`https://www.data.go.kr/data/${def.publicDataPk}/fileData.do`,ok:false,error:String(error?.code||error?.message||'PUBLIC_SOURCE_FAILED')});if(def.required){const e=new Error(`AGE_GENDER_REQUIRED_SOURCE_FAILED:${def.id}`);e.code='AGE_GENDER_REQUIRED_SOURCE_FAILED';e.sourceId=def.id;e.warnings=warnings;throw e;}}
  }
  const populationRows=parseDownloadedCsv(files.population),constituencyRows=parseDownloadedCsv(files.constituency),proportionalRows=files.proportional?parseDownloadedCsv(files.proportional):[];
  if(populationRows.length<3||constituencyRows.length<3){const e=new Error('AGE_GENDER_OFFICIAL_SOURCE_PARSE_EMPTY');e.code='AGE_GENDER_OFFICIAL_SOURCE_PARSE_EMPTY';throw e;}
  const directBuilt=buildDirectBaselines({electionRows:constituencyRows,populationRows,roster,overrides,electionDate:'2024-04-10'});
  const partyProfiles=proportionalRows.length?buildPartyBaselines({electionRows:proportionalRows,populationRows,partyAliases,electionDate:'2024-04-10'}):{};
  const merged=mergeBaselineRows({roster,incomingPeople:directBuilt.people}),directPeople=Object.fromEntries(merged.filter(x=>x.baselineKind==='DIRECT_CANDIDATE').map(x=>[x.personId,x]));
  const finalRows=applyProxyBaselines({rows:merged,directPeople,partyProfiles,electionDate:'2024-04-10',allowUniversalProxy:true}),sourceInputs=Object.entries(files).map(([id,file])=>{const def=SOURCE_DEFS[id];return {authority:def.authority,title:file.fileName||def.title,date:def.date,url:file.url||`https://www.data.go.kr/data/${def.publicDataPk}/fileData.do`,bytes:file.bytes};});
  let manifest=buildManifest({rosterTotal:roster.length,baselineRows:finalRows,sources:sourceInputs,unresolved:directBuilt.unresolved,minDirect:1,minCoverage:.995});
  const trusted=productionTrust(manifest,Object.keys(partyProfiles).length,roster.length);manifest={...manifest,validationStatus:trusted?(manifest.limitedCount===0?'FULL_OFFICIAL_BASELINE':'PARTIAL_OFFICIAL_BASELINE'):'BASELINE_COVERAGE_INSUFFICIENT',trustedBaselineReady:trusted,partyProfileCount:Object.keys(partyProfiles).length,collectorVersion:VERSION,collectedAt:now().toISOString(),warnings:warnings.slice(0,30),sourceStatus:sources};
  const peopleMap=Object.fromEntries(finalRows.map(x=>[String(x.personId),x]));return {schemaVersion:2,baselineVersion:BASELINE_VERSION,cohortOrder:[...COHORT_KEYS],generatedAt:manifest.collectedAt,manifest,people:peopleMap,partyProfiles,sources,warnings,unresolved:directBuilt.unresolved.slice(0,500)};
}

module.exports={VERSION,SOURCE_DEFS,DEFAULT_PARTY_ALIASES,collectOfficialAgeGenderBaseline,_internals:{sourceSummary,parseDownloadedCsv,defaultDownloadSource,productionTrust}};
