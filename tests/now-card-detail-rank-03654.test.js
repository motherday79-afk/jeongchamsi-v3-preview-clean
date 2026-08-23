const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const features=fs.readFileSync('src/views/features.js','utf8');
const people=fs.readFileSync('src/views/people.js','utf8');
const css=fs.readFileSync('css/pages.css','utf8');

test('category NOW full view keeps category leagues but renders the previous card-grid presentation',()=>{
  assert.match(features,/getNowCategory\(/);
  assert.match(features,/categoryRank/);
  assert.match(features,/globalRank/);
  assert.match(features,/class="person-grid now-category-card-grid"/);
  assert.match(features,/class="person-slot-card data-connected now-category-card"/);
  assert.doesNotMatch(features,/class="now-category-rank-list"/);
});

test('politician hero rank surface is split into global and category rank and omits score/time noise',()=>{
  assert.match(people,/person-hero-rank-split/);
  assert.match(people,/전체 NOW/);
  assert.match(people,/categoryLabel/);
  assert.match(people,/categoryRank/);
  assert.doesNotMatch(people,/NOW 지수/);
  assert.doesNotMatch(people,/publishedAt\|\|"최근 게시"/);
  assert.match(css,/\.person-hero-rank-split/);
});
