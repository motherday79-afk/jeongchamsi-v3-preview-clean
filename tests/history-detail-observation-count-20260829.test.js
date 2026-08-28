const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('politician detail HISTORY separates raw observation count from observed-day count',()=>{
  const source=read('src/views/people.js');
  assert.match(source,/원본 관측/);
  assert.match(source,/summary\.rawSampleSize/);
  assert.match(source,/관측일/);
  assert.match(source,/summary\.dailySampleSize/);
  assert.doesNotMatch(source,/<small>관측<\/small><strong>\$\{Number\(summary\.sampleSize\|\|0\)\}<\/strong><span>회<\/span>/);
});

test('politician detail HISTORY observation-count hotfix is cache-busted',()=>{
  const app=read('src/app.js');
  const index=read('index.html');
  const css=read('css/pages.css');
  assert.match(app,/views\/people\.js\?v=03686-history-v2-observation-count/);
  assert.match(index,/observation-count/);
  assert.match(css,/grid-template-columns:120px 120px 150px minmax\(160px,1fr\)/);
});
