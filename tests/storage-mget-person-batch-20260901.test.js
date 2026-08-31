'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('542 previous person payloads are read in bounded MGET batches',async()=>{
  const {mgetJSONInBatches}=require('../server/v3/lib/storage-safe-mget');
  const domains=Array.from({length:542},(_,i)=>`nowDataPersonPublic:assembly-${String(i+1).padStart(3,'0')}`);
  const calls=[];
  const fake=async chunk=>{calls.push([...chunk]);return chunk.map((key,index)=>index===2&&calls.length===3?null:{key});};
  const values=await mgetJSONInBatches(domains,fake,25);
  assert.equal(values.length,542);
  assert.equal(calls.length,Math.ceil(542/25));
  assert.ok(calls.every(chunk=>chunk.length<=25));
  assert.equal(values[52],null);
});

test('NOW finalize and publish never perform one 542-key person MGET',()=>{
  const route=fs.readFileSync(path.join(root,'server/v3/routes/admin/now-data.js'),'utf8');
  assert.match(route,/storage-safe-mget/);
  assert.match(route,/mgetJSONInBatches\(previewEntries\.map\(\(\[key\]\)=>key\),\s*mgetJSON,\s*25\)/);
  assert.match(route,/mgetJSONInBatches\(personEntries\.map\(\(\[key\]\)=>key\),\s*mgetJSON,\s*25\)/);
  assert.doesNotMatch(route,/previousPersonEntries=await mgetJSON\((previewEntries|personEntries)\.map/);
});
