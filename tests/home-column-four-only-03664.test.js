const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const home = read('src/views/home.js');
const appCss = read('css/app.css');
const mobileCss = read('css/mobile-foundation.css');

test('home COLUMN renders exactly four equal cards without a representative lead', () => {
  assert.doesNotMatch(home, /function columnLead\s*\(/);
  assert.doesNotMatch(home, /대표 COLUMN 1개 \+ 추가 COLUMN 4개 구조/);
  assert.doesNotMatch(home, /columnLead\(/);
  assert.match(home, /const columnCards\s*=\s*columns\.slice\(0,\s*4\)/);
  assert.match(home, /while \(columnCards\.length < 4\) columnCards\.push\(null\)/);
  assert.match(home, /<div class="column-grid">\$\{columnCards\.map\(item => columnMini\(item, homeAuthorProfiles\)\)\.join\(""\)\}<\/div>/);
});

test('COLUMN grid stays 4 across on desktop and 2 by 2 on phones including narrow Fold cover', () => {
  assert.match(appCss, /\.column-grid\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(appCss, /\.column-lead\{/);
  assert.doesNotMatch(mobileCss, /#column \.column-grid\{grid-template-columns:minmax\(0,1fr\)\}/);
  assert.match(mobileCss, /@media \(max-width:430px\)[\s\S]*?#column \.column-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
});
