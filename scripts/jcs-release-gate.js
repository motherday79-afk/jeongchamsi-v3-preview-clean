#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const REQUIRED_FILES=[
  'package.json','index.html','api/gateway.js','lib/v3/redis.js','lib/v3/access.js',
  'src/data/person-provider.js','src/data/politician-photo-index.js','src/views/people.js','src/views/features.js',
  'server/v3/data/politician-photo-roster.json','server/v3/lib/politician-live-roster.js',
  'server/v3/lib/naver-news.js','server/v3/lib/naver-searchad.js',
  'server/v3/lib/storage-safe-mget.js','server/v3/lib/safe-public-publish.js','server/v3/lib/now-temp-cleanup.js',
  'server/v3/routes/admin/now-data.js','server/v3/routes/admin/history.js','server/v3/routes/admin/decision.js',
  'server/v3/routes/now-data.js'
];
const FREEDOM_MARKERS=['PUBLIC POLITICAL PROFILE','POLITICAL PULSE','JCS COMMAND CENTER','COMPARE SCOREBOARD'];
const PRE_FREEDOM_MARKERS=['JCS POLITICAL WAR ROOM','CONFIDENTIAL ADVISORY INTELLIGENCE'];

function walk(root,dir='.'){
  const out=[];
  const abs=path.join(root,dir);
  if(!fs.existsSync(abs))return out;
  for(const ent of fs.readdirSync(abs,{withFileTypes:true})){
    if(ent.name==='node_modules'||ent.name==='.git')continue;
    const rel=path.join(dir,ent.name);
    if(ent.isDirectory())out.push(...walk(root,rel));
    else out.push(rel.replaceAll(path.sep,'/'));
  }
  return out;
}
function resolveLocal(fromFile,spec,root){
  if(!spec.startsWith('.'))return null;
  spec=String(spec).split(/[?#]/)[0];
  const base=path.resolve(path.dirname(path.join(root,fromFile)),spec);
  const candidates=[base,`${base}.js`,`${base}.json`,path.join(base,'index.js'),path.join(base,'index.json')];
  return candidates.find(p=>fs.existsSync(p)&&fs.statSync(p).isFile())||null;
}
function exportedNames(file){
  const ext=path.extname(file);
  if(ext==='.json'){
    try{const x=JSON.parse(fs.readFileSync(file,'utf8'));return new Set(x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x):[]);}catch{return new Set();}
  }
  const src=fs.readFileSync(file,'utf8');
  const out=new Set();
  for(const m of src.matchAll(/(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g))out.add(m[1]);
  const obj=[...src.matchAll(/module\.exports\s*=\s*\{([\s\S]*?)\}\s*;?/g)].at(-1);
  if(obj){
    for(const raw of obj[1].split(',')){
      const item=raw.trim(); if(!item||item.startsWith('...'))continue;
      const key=(item.match(/^([A-Za-z_$][\w$]*)\s*(?::|$)/)||[])[1]; if(key)out.add(key);
    }
  }
  for(const m of src.matchAll(/export\s+(?:async\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g))out.add(m[1]);
  for(const m of src.matchAll(/export\s*\{([\s\S]*?)\}/g)){
    for(const raw of m[1].split(',')){
      const item=raw.trim(); if(!item)continue;
      const as=item.match(/^(\w+)\s+as\s+(\w+)$/); out.add(as?as[2]:item.split(/\s+/)[0]);
    }
  }
  if(/module\.exports\s*=\s*(?:async\s+)?function\b/.test(src)||/export\s+default\b/.test(src))out.add('default');
  return out;
}
function requestedKeys(block){
  return block.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{
    const noDefault=x.split('=')[0].trim();
    return noDefault.split(':')[0].trim();
  }).filter(x=>/^[A-Za-z_$][\w$]*$/.test(x));
}
function localDependencyChecks(root,files){
  const missing=[]; const broken=[]; let localImports=0; let namedContracts=0;
  for(const rel of files.filter(x=>x.endsWith('.js')&&!x.startsWith('tests/')&&!x.startsWith('scripts/'))){
    const src=fs.readFileSync(path.join(root,rel),'utf8');
    const specs=[];
    for(const m of src.matchAll(/\brequire\(\s*['"]([^'"]+)['"]\s*\)/g))specs.push(m[1]);
    for(const m of src.matchAll(/\b(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g))specs.push(m[1]);
    for(const spec of specs.filter(s=>s.startsWith('.'))){
      localImports++;
      if(!resolveLocal(rel,spec,root))missing.push(`${rel} -> ${spec}`);
    }
    for(const m of src.matchAll(/(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/g)){
      const spec=m[2]; if(!spec.startsWith('.'))continue;
      const target=resolveLocal(rel,spec,root); if(!target)continue;
      let names=exportedNames(target);
      if(path.extname(target)==='.js'){
        try{const loaded=require(target); if(loaded&&((typeof loaded==='object')||(typeof loaded==='function')))names=new Set([...names,...Object.keys(loaded)]);}catch{}
      }
      for(const key of requestedKeys(m[1])){namedContracts++; if(!names.has(key))broken.push(`${rel}: require ${spec} missing export ${key}`);}
    }
    for(const m of src.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g)){
      const spec=m[2]; if(!spec.startsWith('.'))continue;
      const target=resolveLocal(rel,spec,root); if(!target)continue;
      const names=exportedNames(target);
      const keys=m[1].split(',').map(x=>x.trim()).filter(Boolean).map(x=>x.split(/\s+as\s+/)[0].trim());
      for(const key of keys){namedContracts++; if(!names.has(key))broken.push(`${rel}: import ${spec} missing export ${key}`);}
    }
  }
  return {missing:[...new Set(missing)],broken:[...new Set(broken)],localImports,namedContracts};
}
function checkRoster(root){
  const rosterPath=path.join(root,'server/v3/data/politician-photo-roster.json');
  if(!fs.existsSync(rosterPath))return {total:0,real:0,counts:{},samples:[]};
  const roster=JSON.parse(fs.readFileSync(rosterPath,'utf8'));
  const real=roster.filter(r=>r&&r.id&&r.name&&r.id!=='assembly-300'&&r.party!=='공석'&&r.type!=='vacancy'&&!String(r.name).includes('공석'));
  const counts={assembly:real.filter(x=>x.type==='assembly').length,metropolitan:real.filter(x=>x.type==='metropolitan').length,basic:real.filter(x=>x.type==='basic').length};
  const sampleNames=['김민석','정청래','서미화','김은혜'];
  return {total:roster.length,real:real.length,counts,samples:sampleNames.map(name=>({name,found:real.some(x=>x.name===name)}))};
}
function safeRequire(root,rel){
  try{delete require.cache[require.resolve(path.join(root,rel))]; const mod=require(path.join(root,rel)); return {ok:true,type:typeof mod};}
  catch(error){return {ok:false,error:String(error?.stack||error)}}
}
function runGate(root=process.cwd()){
  root=path.resolve(root);
  const failures=[]; const warnings=[];
  const files=walk(root);
  const missingRequired=REQUIRED_FILES.filter(f=>!fs.existsSync(path.join(root,f)));
  for(const f of missingRequired)failures.push(`required file missing: ${f}`);

  const deps=localDependencyChecks(root,files);
  for(const x of deps.missing)failures.push(`missing local import: ${x}`);
  for(const x of deps.broken)failures.push(`broken named contract: ${x}`);

  const roster=checkRoster(root);
  if(roster.real!==542)failures.push(`real politician count ${roster.real}, expected 542`);
  if(roster.counts.assembly!==299)failures.push(`assembly real count ${roster.counts.assembly}, expected 299 + 1 vacancy slot`);
  if(roster.counts.metropolitan!==16)failures.push(`metropolitan count ${roster.counts.metropolitan}, expected 16`);
  if(roster.counts.basic!==227)failures.push(`basic count ${roster.counts.basic}, expected 227`);
  for(const s of roster.samples)if(!s.found)failures.push(`sample politician missing: ${s.name}`);

  const news=safeRequire(root,'server/v3/lib/naver-news.js');
  if(!news.ok)failures.push(`naver-news module load failed: ${news.error.split('\n')[0]}`);
  else {
    const mod=require(path.join(root,'server/v3/lib/naver-news.js'));
    if(typeof mod.availability!=='function')failures.push('naver-news availability export is not a function');
    else {const a=mod.availability(); if(!a||!Object.hasOwn(a,'available')||a.provider!=='naver-news')failures.push('naver-news availability return contract invalid');}
  }
  const redis=safeRequire(root,'lib/v3/redis.js');
  if(!redis.ok)failures.push(`redis module load failed: ${redis.error.split('\n')[0]}`);
  else {
    const mod=require(path.join(root,'lib/v3/redis.js'));
    for(const key of ['getJSON','setJSON','mgetJSON','scanDomains','deleteDomains'])if(typeof mod[key]!=='function')failures.push(`redis export ${key} is not a function`);
  }
  for(const rel of ['api/gateway.js','server/v3/routes/admin/now-data.js','server/v3/routes/admin/history.js','server/v3/routes/admin/decision.js','server/v3/routes/now-data.js','server/v3/routes/action.js','server/v3/routes/livebar.js']){
    if(fs.existsSync(path.join(root,rel))){const r=safeRequire(root,rel); if(!r.ok)failures.push(`runtime module load failed ${rel}: ${r.error.split('\n')[0]}`); else if(r.type!=='function')failures.push(`runtime module ${rel} must export a function`);}
  }

  const nowPath=path.join(root,'server/v3/routes/admin/now-data.js');
  if(fs.existsSync(nowPath)){
    const src=fs.readFileSync(nowPath,'utf8');
    if(!/mgetJSONInBatches/.test(src))failures.push('NOW admin route missing bounded MGET helper');
    if(!/mgetJSONInBatches\([\s\S]*?25\s*\)/.test(src))failures.push('NOW admin route does not prove 25-entry MGET batching');
    if(!/createSafePublicPublisher/.test(src))failures.push('NOW admin route missing safe public publisher');
  }
  const pubPath=path.join(root,'server/v3/lib/safe-public-publish.js');
  if(fs.existsSync(pubPath)){
    const src=fs.readFileSync(pubPath,'utf8');
    const m=src.match(/maxEntryBytes\s*=\s*([0-9_]+)/);
    const max=m?Number(m[1].replaceAll('_','')):null;
    if(max!==null&&max>=10*1024*1024)failures.push(`safe publisher maxEntryBytes ${max} is not below Upstash 10MB limit`);
    if(!/commitEntry/.test(src))failures.push('safe publisher missing commitEntry support');
  }

  const frontend=['src/views/people.js','src/views/features.js'].map(x=>path.join(root,x)).filter(fs.existsSync);
  const frontText=frontend.map(x=>fs.readFileSync(x,'utf8')).join('\n');
  for(const marker of FREEDOM_MARKERS)if(frontText.includes(marker))failures.push(`unexpected Freedom UI marker present: ${marker}`);
  for(const marker of PRE_FREEDOM_MARKERS)if(!frontText.includes(marker))failures.push(`pre-Freedom baseline marker missing: ${marker}`);

  const report={
    ok:failures.length===0,
    generatedAt:new Date().toISOString(),root,
    metrics:{
      projectFiles:files.length,
      requiredFiles:REQUIRED_FILES.length,
      missingRequired:missingRequired.length,
      rosterSlots:roster.total,
      realPoliticians:roster.real,
      assemblyReal:roster.counts.assembly||0,
      metropolitan:roster.counts.metropolitan||0,
      basic:roster.counts.basic||0,
      localImportReferences:deps.localImports,
      missingLocalImports:deps.missing.length,
      namedContractsChecked:deps.namedContracts,
      brokenNamedContracts:deps.broken.length
    },
    failures,warnings
  };
  return report;
}

if(require.main===module){
  const report=runGate(process.argv[2]||process.cwd());
  console.log(JSON.stringify(report,null,2));
  process.exitCode=report.ok?0:1;
}
module.exports={runGate};
