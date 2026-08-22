const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('home API includes published nowDataCurrent snapshot', () => {
  const src = fs.readFileSync(path.join(root, 'server/v3/routes/home.js'), 'utf8');
  assert.match(src, /nowDataCurrent/);
  assert.match(src, /data\.nowRank/);
});

test('home NOW Rank prefers published snapshot instead of static preview', () => {
  const src = fs.readFileSync(path.join(root, 'src/views/home.js'), 'utf8');
  assert.match(src, /data\.nowRank/);
  assert.match(src, /ranked/);
  assert.doesNotMatch(src, /const nowPeople = HOME_NOW_PREVIEW;/);
});


test('publish invalidates home cache and home API is no-store', () => {
  const app = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
  const repo = fs.readFileSync(path.join(root, 'src/core/repository.js'), 'utf8');
  const home = fs.readFileSync(path.join(root, 'server/v3/routes/home.js'), 'utf8');
  assert.match(app, /publishNowData\(\)[\s\S]*else clearDomainCache\(\)/);
  assert.match(repo, /CACHE\.clear\(\); invalidateHomeSnapshot\(\)/);
  assert.match(home, /no-store, max-age=0/);
});
