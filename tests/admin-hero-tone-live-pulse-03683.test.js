const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');

const admin = read('src/views/admin.js');
const app = read('src/app.js');
const home = read('src/views/home.js');
const pages = read('css/pages.css');
const schema = read('lib/v3/schema.js');
const index = read('index.html');

test('hero tone controls are visible swatches with an explicit accent text field and live preview', () => {
  assert.match(admin, /name="productAccentText"/);
  assert.match(schema, /productAccentText/);
  assert.match(admin, /hero-tone-choices/);
  assert.match(admin, /type="radio" name="\$\{esc\(name\)\}"/);
  assert.match(admin, /heroToneSwatches\("productHeadlineTone"/);
  assert.match(admin, /heroToneSwatches\("productAccentTone"/);
  assert.match(admin, /heroToneSwatches\("productDescriptionTone"/);
  assert.doesNotMatch(admin, /헤드라인 기본 색상<select name="productHeadlineTone"/);
  assert.match(admin, /data-hero-live-preview/);
  assert.match(admin, /export function syncBrandHeroPreview/);
  assert.match(app, /syncBrandHeroPreview/);
  assert.match(pages, /\.hero-tone-choices\{/);
  assert.match(pages, /\.admin-product-hero-preview\{/);
});

test('home hero highlights the configured accent text instead of a hard-coded phrase', () => {
  assert.match(home, /productAccentText/);
  assert.doesNotMatch(home, /safeHeadline\.includes\("움직이는 것"\)/);
  assert.match(home, /accentText/);
});

test('main live pulses are larger and center-aligned with their labels', () => {
  assert.strictEqual((home.match(/class="main-live-pulse"/g) || []).length, 3);
  assert.strictEqual((home.match(/live-heading-inline/g) || []).length, 3);
  assert.match(pages, /\.live-heading-inline\{display:inline-flex;align-items:center/);
  assert.match(pages, /\.main-live-pulse\{[^}]*width:16px;[^}]*height:16px/);
  assert.match(pages, /\.main-live-pulse i\{[^}]*width:8px;[^}]*height:8px/);
  assert.match(pages, /@media\(max-width:1024px\)[\s\S]*\.main-live-pulse\{[^}]*width:14px;[^}]*height:14px/);
  assert.doesNotMatch(pages, /\.main-live-pulse\{[^}]*vertical-align/);
});

test('03683 cache markers are present for changed home and styles', () => {
  assert.match(index, /03684-compare-relative-axis/);
  assert.match(app, /\.\/views\/home\.js\?v=03683/);
});
