const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');

const root=path.resolve(__dirname,'..');
const gatePath=path.join(root,'scripts','jcs-release-gate.js');

test('JCS release gate exists and current release tree passes',()=>{
  assert.equal(fs.existsSync(gatePath),true,'release gate script must exist');
  const {runGate}=require(gatePath);
  const report=runGate(root);
  assert.equal(report.ok,true,JSON.stringify(report.failures,null,2));
  assert.equal(report.metrics.realPoliticians,542);
  assert.equal(report.metrics.missingLocalImports,0);
  assert.equal(report.metrics.brokenNamedContracts,0);
});

test('JCS release gate rejects a naver-news module missing availability export',()=>{
  assert.equal(fs.existsSync(gatePath),true,'release gate script must exist');
  const {runGate}=require(gatePath);
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'jcs-gate-'));
  fs.cpSync(root,tmp,{recursive:true,filter:(src)=>!src.includes(`${path.sep}.git${path.sep}`)});
  const news=path.join(tmp,'server','v3','lib','naver-news.js');
  let text=fs.readFileSync(news,'utf8');
  text=text.replace(/module\.exports=\{credentials,availability,/, 'module.exports={credentials,');
  fs.writeFileSync(news,text);
  const report=runGate(tmp);
  assert.equal(report.ok,false);
  assert.ok(report.failures.some(x=>String(x).includes('availability')),JSON.stringify(report.failures,null,2));
});

test('package exposes one-command JCS release gate',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
  assert.equal(pkg.scripts?.['release:gate'],'node scripts/jcs-release-gate.js .');
});
