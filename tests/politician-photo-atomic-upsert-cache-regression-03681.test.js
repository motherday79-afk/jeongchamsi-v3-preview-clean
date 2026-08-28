const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p,'utf8');

const admin = read('src/views/admin.js');
const route = read('server/v3/routes/politician-photo.js');
const content = read('server/v3/routes/content.js');
const index = read('src/data/politician-photo-index.js');
const html = read('index.html');

test('manual politician photo save uses a single-record atomic upsert instead of whole politicianPhotos overwrite', () => {
  assert.match(admin, /action\s*:\s*["']manual-upsert["']/);
  assert.doesNotMatch(admin, /saveDomain\(["']politicianPhotos["'],\s*data\)/);
  assert.match(route, /action === ["']manual-upsert["']/);
  assert.match(route, /async function manualUpsert/);
});

test('manual upsert accepts every real basic local leader id through the shared roster map', () => {
  assert.match(route, /const person=TARGET_BY_ID\.get\(id\)/);
  assert.match(route, /POLITICIAN_NOT_FOUND/);
  assert.match(route, /validUploadedSet\(uploaded\)/);
});

test('photo resolver cache cannot hide a just-saved photo', () => {
  assert.match(route, /LIVE_PHOTO_CACHE_CONTROL\s*=\s*["']private, no-store, max-age=0["']/);
  assert.match(route, /res\.setHeader\(["']Cache-Control["'],LIVE_PHOTO_CACHE_CONTROL\)/);
  assert.match(content, /__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE_03667__/);
  assert.match(index, /v=03681/);
  assert.match(html, /03684-compare-relative-axis/);
});
