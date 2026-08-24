const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const cssFiles = ['css/app.css','css/pages.css','css/product-system.css','css/spectrum-palette.css','css/mobile-foundation.css'];

test('03662 preserves the cleaned production cascade with no forced declarations', () => {
  const forced = cssFiles.flatMap(file => [...read(file).matchAll(/!important\b/g)].map(match => `${file}:${match.index}`));
  assert.deepEqual(forced, [], `forced declarations remain: ${forced.slice(0,12).join(', ')}`);
});

test('03662 preserves canonical drawer and responsive selectors from 03661', () => {
  const pages = read('css/pages.css');
  const spectrum = read('css/spectrum-palette.css');
  const mobile = read('css/mobile-foundation.css');
  assert.doesNotMatch(pages, /specificity guard against the legacy/i);
  assert.doesNotMatch(pages, /\.drawer-account div\{/);
  assert.doesNotMatch(pages, /\.drawer-account a\{/);
  assert.match(pages, /\.drawer-account-copy\{[^}]*display:block;[^}]*margin:0;[^}]*gap:7px;/s);
  assert.match(pages, /\.drawer-account-arrow\{[^}]*margin:0;[^}]*padding:0;[^}]*font-weight:850;/s);
  assert.match(spectrum, /\.product-launcher \.product-launcher-grid \.launcher-card\{/);
  assert.match(mobile, /\.product-launcher\.product-launcher-compact\{/);
  assert.match(mobile, /#itsme\.itsme-home-module \.itsme-card:nth-child\(n\)/);
});

test('03662 version and cache markers identify the politician photo admin build', () => {
  const index = read('index.html');
  const pkg = JSON.parse(read('package.json'));
  const version = read('src/version.js');
  assert.equal(pkg.version, '3.0.0-alpha6.0.36.62');
  assert.match(version, /v3\.0\.0-alpha6\.0\.36\.62/);
  assert.match(index, /pages\.css\?v=alpha6\.0\.36\.62-politician-photo-admin/);
  assert.match(index, /src\/app\.js\?v=alpha6\.0\.36\.62-politician-photo-admin/);
  assert.match(index, /app\.css\?v=alpha6\.0\.36\.61-structural-cascade-cleanup/);
  assert.match(index, /mobile-foundation\.css\?v=alpha6\.0\.36\.61-structural-cascade-cleanup/);
});
