const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('photo resolver responses are not browser/CDN cached across admin replacement', () => {
  const route = read('server/v3/routes/politician-photo.js');
  assert.match(route, /const LIVE_PHOTO_CACHE_CONTROL\s*=\s*["']private, no-store, max-age=0["']/);
  assert.match(route, /manual\?\.url[\s\S]*?setHeader\(["']Cache-Control["'],LIVE_PHOTO_CACHE_CONTROL\)/);
  assert.match(route, /WIKIMEDIA_COMMONS_PHOTO_NOT_RESOLVED[\s\S]*?LIVE_PHOTO_CACHE_CONTROL|LIVE_PHOTO_CACHE_CONTROL[\s\S]*?WIKIMEDIA_COMMONS_PHOTO_NOT_RESOLVED/);
  assert.match(route, /Content-Type[\s\S]*?LIVE_PHOTO_CACHE_CONTROL/);
});

test('saving politicianPhotos invalidates server runtime photo map immediately', () => {
  const content = read('server/v3/routes/content.js');
  assert.match(content, /domain\s*===\s*["']politicianPhotos["'][\s\S]*?__JCV3_POLITICIAN_MANUAL_PHOTO_CACHE_03667__/);
  assert.match(content, /photoCache\.at\s*=\s*0/);
  assert.match(content, /photoCache\.items\s*=\s*new Map\(\)/);
});

test('client photo resolver cache key is bumped for existing stale browser entries', () => {
  const index = read('src/data/politician-photo-index.js');
  assert.match(index, /v=03681/);
  assert.doesNotMatch(index, /v=03664/);
});
