const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const cssFiles = ['css/app.css','css/pages.css','css/product-system.css','css/spectrum-palette.css','css/mobile-foundation.css'];

test('03661 removes forced CSS declarations from the production cascade', () => {
  const forced = cssFiles.flatMap(file => {
    const matches = [...read(file).matchAll(/!important\b/g)];
    return matches.map(match => `${file}:${match.index}`);
  });
  assert.deepEqual(forced, [], `forced declarations remain: ${forced.slice(0,12).join(', ')}`);
});

test('03661 replaces legacy specificity guards with canonical component selectors', () => {
  const pages = read('css/pages.css');
  const spectrum = read('css/spectrum-palette.css');
  const mobile = read('css/mobile-foundation.css');

  assert.doesNotMatch(pages, /specificity guard against the legacy/i);
  assert.doesNotMatch(pages, /\.drawer-account div\{/);
  assert.doesNotMatch(pages, /\.drawer-account a\{/);
  assert.match(pages, /\.drawer-account-copy\{[^}]*display:block;[^}]*margin:0;[^}]*gap:7px;/s);
  assert.match(pages, /\.drawer-account-arrow\{[^}]*margin:0;[^}]*padding:0;[^}]*font-weight:850;/s);

  assert.match(spectrum, /\.product-launcher \.product-launcher-grid \.launcher-card\{/);
  assert.match(spectrum, /\.product-launcher-compact \.product-launcher-grid \.launcher-card\{/);

  assert.match(mobile, /\.product-launcher\.product-launcher-compact\{/);
  assert.match(mobile, /\.product-launcher-compact \.product-launcher-grid \.launcher-card\{/);
  assert.match(mobile, /#itsme\.itsme-home-module \.itsme-card:nth-child\(n\)/);
  assert.match(mobile, /\.product-home-wrap \.product-hero-participation \.hero-hub-card p\{/);
});

test('03661 cache/version markers identify the structural cleanup build', () => {
  const index = read('index.html');
  const pkg = JSON.parse(read('package.json'));
  const version = read('src/version.js');

  assert.equal(pkg.version, '3.0.0-alpha6.0.36.61');
  assert.match(version, /v3\.0\.0-alpha6\.0\.36\.61/);
  assert.match(index, /pages\.css\?v=alpha6\.0\.36\.61-structural-cascade-cleanup/);
  assert.match(index, /mobile-foundation\.css\?v=alpha6\.0\.36\.61-structural-cascade-cleanup/);
});
