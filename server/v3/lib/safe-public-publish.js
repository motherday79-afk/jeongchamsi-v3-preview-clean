'use strict';

function jsonBytes(value){
  return Buffer.byteLength(JSON.stringify(value ?? null),'utf8');
}
function asError(code,message,extra={}){
  const error=new Error(message);error.code=code;Object.assign(error,extra);return error;
}
function createSafePublicPublisher(deps={},options={}){
  if(typeof deps.getJSON!=='function'||typeof deps.setJSON!=='function')throw new TypeError('SAFE_PUBLIC_PUBLISH_DEPS_REQUIRED');
  const concurrency=Math.max(1,Math.min(8,Number(options.concurrency)||4));
  const maxEntryBytes=Math.max(1,Number(options.maxEntryBytes)||9_000_000);
  const clone=value=>value===undefined?null:JSON.parse(JSON.stringify(value));
  const preflight=entries=>{
    for(const [key,value] of entries||[]){
      const bytes=jsonBytes(value);
      if(bytes>maxEntryBytes)throw asError('NOW_PUBLIC_ENTRY_TOO_LARGE',`NOW public value exceeds safe Redis request size: ${key}`,{key,bytes,maxEntryBytes});
    }
  };
  async function readBackups(entries=[]){
    const out=new Map();
    for(let i=0;i<entries.length;i+=concurrency){
      const batch=entries.slice(i,i+concurrency);
      const values=await Promise.all(batch.map(([key])=>deps.getJSON(key)));
      batch.forEach(([key],index)=>out.set(key,clone(values[index])));
    }
    return out;
  }
  async function writeIndividually(entries=[],writtenKeys=null){
    for(let i=0;i<entries.length;i+=concurrency){
      const batch=entries.slice(i,i+concurrency);
      await Promise.all(batch.map(async([key,value])=>{await deps.setJSON(key,value);if(writtenKeys)writtenKeys.add(key);}));
    }
  }
  async function restore(entries=[],backups=new Map()){
    const restoreEntries=entries.map(([key])=>[key,backups.has(key)?backups.get(key):null]);
    try{await writeIndividually(restoreEntries);return null;}catch(error){return error;}
  }
  async function publish({personEntries=[],controlEntries=[],commitEntry=null}={}){
    const commit=Array.isArray(commitEntry)&&commitEntry.length===2?[commitEntry]:[];
    preflight(personEntries);preflight(controlEntries);preflight(commit);
    const [personBackups,controlBackups]=await Promise.all([readBackups(personEntries),readBackups(controlEntries)]);
    const writtenPerson=new Set(),writtenControl=new Set();
    try{
      // Large per-politician payloads are deliberately one SET per key. Never aggregate them into MSET/pipeline request bodies.
      await writeIndividually(personEntries,writtenPerson);
      await writeIndividually(controlEntries,writtenControl);
      // The publish marker is written last. A failed payload write can never advertise a completed publish.
      if(commit.length)await writeIndividually(commit);
      return {ok:true,personCount:personEntries.length,controlCount:controlEntries.length};
    }catch(error){
      const touchedControl=controlEntries.filter(([key])=>writtenControl.has(key));
      const touchedPerson=personEntries.filter(([key])=>writtenPerson.has(key));
      const controlRollback=await restore(touchedControl,controlBackups);
      const personRollback=await restore(touchedPerson,personBackups);
      if(controlRollback||personRollback)error.rollbackError=String((controlRollback||personRollback)?.message||controlRollback||personRollback);
      throw error;
    }
  }
  return {publish,writeIndividually,jsonBytes,maxEntryBytes,concurrency};
}
module.exports={createSafePublicPublisher,jsonBytes};
