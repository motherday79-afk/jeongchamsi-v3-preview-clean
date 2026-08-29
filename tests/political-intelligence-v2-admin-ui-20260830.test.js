const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('admin Political Intelligence has an explicit V2-only age and gender cohort presentation',()=>{
  const source=read('src/views/people.js');
  for(const label of [
    'AGE COHORT SUPPORT MOMENTUM','18–29','30–39','40–49','50–59','60–69','70+',
    'GENDER SUPPORT MOMENTUM','MALE','FEMALE','AGE × GENDER MATRIX','COHORT INTELLIGENCE SUMMARY'
  ]) assert.ok(source.includes(label),label);
  for(const label of ['STRONGEST POSITIVE SIGNAL','STRONGEST NEGATIVE SIGNAL','WIDEST GENDER GAP','FASTEST 30D CHANGE','MOST STABLE COHORT']) assert.ok(source.includes(label),label);
  assert.match(source,/SUPPORT MOMENTUM · JCS EST\./);
  assert.match(source,/SIGNAL CONFIDENCE LIMITED/);
  assert.match(source,/JCS HISTORY 정상 유지/);
});

test('admin demographic presentation always uses the V2 six-age and gender scaffold even while cohort values are LIMITED',()=>{
  const source=read('src/views/people.js');
  const start=source.indexOf('function adminPiDemographicSection');
  const end=source.indexOf('function adminPiStrategicSolution',start);
  assert.ok(start>=0&&end>start);
  const block=source.slice(start,end);
  for(const label of ['18–29','30–39','40–49','50–59','60–69','70+','GENDER SUPPORT MOMENTUM','AGE × GENDER MATRIX']) assert.ok(block.includes(label),label);
  assert.doesNotMatch(block,/2030 SUPPORT|4050 SUPPORT|60\+ SUPPORT/);
  assert.doesNotMatch(block,/pi\.version===['"]JCS_POLITICAL_INTELLIGENCE_V2['"]&&pi\.cohorts/);
  assert.match(block,/SIGNAL CONFIDENCE LIMITED|adminPiCohort/);
});

test('age by gender matrix carries confidence and evidence metadata without horizontal twelve-column layout',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  assert.match(source,/CONFIDENCE/);
  assert.match(source,/EVIDENCE/);
  assert.match(css,/\.admin-pi-cohort-matrix/);
  assert.match(css,/grid-template-columns:[^;]*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:640px\)[\s\S]*admin-pi-cohort/);
});

test('V2 demographic visibility hotfix has an explicit cache-bust marker on people view and app entry',()=>{
  const app=read('src/app.js');
  const index=read('index.html');
  assert.match(app,/people\.js\?v=[^"']*age-gender-v2-ui-visible/);
  assert.match(index,/src\/app\.js\?v=[^"']*age-gender-v2-ui-visible/);
});
