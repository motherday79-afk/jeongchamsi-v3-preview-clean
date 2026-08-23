const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const features=fs.readFileSync('src/views/features.js','utf8');
const css=fs.readFileSync('css/pages.css','utf8');
const helper=fs.readFileSync('src/views/compare-intelligence.js','utf8');

test('compare page consumes two real NOW intelligence payloads and removes sample scoring',()=>{
  assert.match(features,/getNowPerson/);
  assert.match(features,/Promise\.all\(\[getNowPerson\(pa\.id\),\s*getNowPerson\(pb\.id\)\]\)/);
  assert.doesNotMatch(features,/function compareSampleMetrics/);
  assert.doesNotMatch(features,/검수용 예시 분석|현재 수치는 비교 기능 검수용 예시값/);
});

test('COMPARE 2.0 exposes the same professional analysis families as politician detail',()=>{
  for(const label of ['COMPARE SIGNAL','CORE INTELLIGENCE','AUDIENCE LANDSCAPE','ACTIVITY & MEDIA','ATTENTION FLOW','ANALYSIS TREND']){
    assert.match(features,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  }
  for(const metric of ['종합 관심','심층 관심','대중 확산','활동성','이슈 온도','미디어 확산']){
    assert.match(features + helper,new RegExp(metric));
  }
});

test('compare intelligence helper gives measured advantages without inventing raw provider data',async()=>{
  const mod=await import(pathToFileURL(path.join(process.cwd(),'src/views/compare-intelligence.js')).href);
  const a={analysis:{scores:{overallInterest:82,highEngagement:68,massExpansion:90,activity:77,issueHeat:74,mediaSpread:80}}};
  const b={analysis:{scores:{overallInterest:70,highEngagement:79,massExpansion:62,activity:75,issueHeat:69,mediaSpread:72}}};
  const result=mod.buildCompareInsight({name:'A'},a,{name:'B'},b);
  assert.equal(result.advantageA>result.advantageB,true);
  assert.match(result.headline,/A|B/);
  assert.ok(result.summary.length>20);
  assert.equal(result.differences.find(x=>x.key==='massExpansion').leader,'a');
  assert.equal(result.differences.find(x=>x.key==='highEngagement').leader,'b');
});

test('compare result has dedicated responsive desktop and mobile presentation',()=>{
  assert.match(css,/\.compare-live-hero/);
  assert.match(css,/\.compare-metric-row/);
  assert.match(css,/\.compare-trend-grid/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.compare-live-hero/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.compare-metric-row/);
});
