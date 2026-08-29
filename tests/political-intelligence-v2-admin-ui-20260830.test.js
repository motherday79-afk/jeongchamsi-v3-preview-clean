const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('admin Political Intelligence has an explicit V2-only age and gender cohort presentation',()=>{
  const source=read('src/views/people.js');
  assert.match(source,/JCS_POLITICAL_INTELLIGENCE_V2/);
  for(const label of [
    'AGE COHORT SUPPORT MOMENTUM','18–29','30–39','40–49','50–59','60–69','70+',
    'GENDER SUPPORT MOMENTUM','MALE','FEMALE','AGE × GENDER MATRIX','COHORT INTELLIGENCE SUMMARY'
  ]) assert.ok(source.includes(label),label);
  for(const label of ['STRONGEST POSITIVE SIGNAL','STRONGEST NEGATIVE SIGNAL','WIDEST GENDER GAP','FASTEST 30D CHANGE','MOST STABLE COHORT']) assert.ok(source.includes(label),label);
  assert.match(source,/SUPPORT MOMENTUM · JCS EST\./);
  assert.match(source,/SIGNAL CONFIDENCE LIMITED/);
  assert.match(source,/JCS HISTORY 정상 유지/);
});

test('V1.2 fallback keeps the existing three coarse age rows rather than projecting them into six fabricated cohorts',()=>{
  const source=read('src/views/people.js');
  assert.match(source,/2030 SUPPORT/);
  assert.match(source,/4050 SUPPORT/);
  assert.match(source,/60\+ SUPPORT/);
  assert.match(source,/pi\.version===['"]JCS_POLITICAL_INTELLIGENCE_V2['"]&&pi\.cohorts/);
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
