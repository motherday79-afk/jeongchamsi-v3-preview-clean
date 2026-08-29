'use strict';

const zlib=require('node:zlib');
const redis=require('../../../lib/v3/redis');
const staticBaseline=require('../data/age-gender-baseline-v2.json');
const staticManifest=require('../data/age-gender-baseline-v2-manifest.json');
const {BASELINE_VERSION,COHORT_KEYS}=require('./age-gender-baseline-v2');

const RUNTIME_KEY='jcv3:intelligence:v2:baseline:current';
const STORE_VERSION='JCS_AGE_GENDER_BASELINE_RUNTIME_V2';
const MAX_COMPRESSED_BYTES=1_500_000;

function staticBundle(){return {schemaVersion:2,storeVersion:STORE_VERSION,baselineVersion:BASELINE_VERSION,generatedAt:staticBaseline.generatedAt||staticManifest.generatedAt||null,manifest:{...staticManifest},people:{...(staticBaseline.people||{})}};}
function encodeBundle(bundle){const gz=zlib.gzipSync(Buffer.from(JSON.stringify(bundle)),{level:9});if(gz.length>MAX_COMPRESSED_BYTES){const e=new Error('AGE_GENDER_BASELINE_RUNTIME_TOO_LARGE');e.code='STORAGE_REQUEST';throw e;}return {encoded:`gz2:${gz.toString('base64')}`,compressedBytes:gz.length};}
function decodeBundle(raw){if(!raw)return null;try{const text=String(raw),json=text.startsWith('gz2:')?zlib.gunzipSync(Buffer.from(text.slice(4),'base64')).toString('utf8'):text;const bundle=JSON.parse(json);return bundle&&bundle.people&&bundle.manifest?bundle:null;}catch{return null;}}
function createAgeGenderBaselineV2Store(overrides={}){
  const deps={command:redis.command,staticBundle:staticBundle(),...overrides};let cache=null,cacheRaw='';
  async function readAgeGenderBaselineBundleV2({fresh=false}={}){
    if(cache&&!fresh)return cache;
    const raw=await deps.command(['GET',RUNTIME_KEY]);if(raw){if(raw===cacheRaw&&cache)return cache;const decoded=decodeBundle(raw);if(decoded){cache=decoded;cacheRaw=String(raw);return decoded;}}
    const fallback=typeof deps.staticBundle==='function'?deps.staticBundle():deps.staticBundle;cache=fallback||staticBundle();cacheRaw='';return cache;
  }
  async function writeAgeGenderBaselineBundleV2(bundle){
    if(!bundle?.people||!bundle?.manifest)throw Object.assign(new Error('AGE_GENDER_BASELINE_BUNDLE_REQUIRED'),{code:'AGE_GENDER_BASELINE_BUNDLE_REQUIRED'});
    const normalized={schemaVersion:2,storeVersion:STORE_VERSION,baselineVersion:bundle.baselineVersion||BASELINE_VERSION,generatedAt:bundle.generatedAt||new Date().toISOString(),cohortOrder:Array.isArray(bundle.cohortOrder)?bundle.cohortOrder:[...COHORT_KEYS],manifest:{...bundle.manifest},people:bundle.people};const packed=encodeBundle(normalized);await deps.command(['SET',RUNTIME_KEY,packed.encoded]);cache=normalized;cacheRaw=packed.encoded;return {ok:true,key:RUNTIME_KEY,compressedBytes:packed.compressedBytes,manifest:normalized.manifest};
  }
  async function getAgeGenderBaselineRuntimeV2(personId){const bundle=await readAgeGenderBaselineBundleV2();return bundle?.people?.[String(personId||'')]||null;}
  async function hasTrustedRuntimeBaselineV2(){return Boolean((await readAgeGenderBaselineBundleV2()).manifest?.trustedBaselineReady);}
  function clearCache(){cache=null;cacheRaw='';}
  return {readAgeGenderBaselineBundleV2,writeAgeGenderBaselineBundleV2,getAgeGenderBaselineRuntimeV2,hasTrustedRuntimeBaselineV2,clearCache,_deps:deps};
}
const defaults=createAgeGenderBaselineV2Store();
module.exports={RUNTIME_KEY,STORE_VERSION,MAX_COMPRESSED_BYTES,staticBundle,encodeBundle,decodeBundle,createAgeGenderBaselineV2Store,...defaults};
