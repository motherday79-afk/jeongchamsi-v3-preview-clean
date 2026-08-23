const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('academy is the last home module directly after community',()=>{
  const home=read('src/views/home.js');
  const community=home.indexOf('id="community"');
  const academy=home.indexOf('id="academy"');
  const mainEnd=home.indexOf('</main>',academy);
  assert.ok(community>=0&&academy>community,'academy must come after community');
  const between=home.slice(community,academy);
  assert.ok(!between.includes('id="academy"'));
  const nextModule=home.indexOf('<section class="module',academy+1);
  assert.ok(nextModule<0||nextModule>mainEnd,'academy must be the final main module');
});

test('ITS ME cards have unmistakable clickable hover treatment',()=>{
  const css=read('css/pages.css');
  assert.match(css,/\.itsme-card\[role="button"\]\s*\{[^}]*cursor:pointer/s);
  assert.match(css,/\.itsme-card\[role="button"\]:hover\s*\{[^}]*background[^}]*border-color[^}]*box-shadow[^}]*transform/s);
  assert.match(css,/\.itsme-card\[role="button"\]:hover\s+b\s*\{/s);
});

test('audience landscape exposes -50 to +50 numeric scale and current value',()=>{
  const people=read('src/views/people.js');
  assert.match(people,/person-interest-axis-scale/);
  for(const label of ['-50','-25','0','+25','+50']) assert.ok(people.includes(`>${label}<`),`missing ${label}`);
  assert.match(people,/person-interest-axis-value/);
  assert.match(people,/audiencePosition-50/);
});

test('analysis colors use explicit stable color variables for rings and bars',()=>{
  const css=read('css/pages.css');
  assert.match(css,/--analysis-color/);
  assert.match(css,/conic-gradient\(var\(--analysis-color\)/);
  assert.doesNotMatch(css,/conic-gradient\(currentColor/);
  assert.match(css,/\.person-analysis-bar-track i\{[^}]*background:var\(--analysis-color(?:,[^)]+)?\)/s);
  assert.doesNotMatch(css,/\.person-analysis-bar-track i\{[^}]*opacity:\.28/s);
});
