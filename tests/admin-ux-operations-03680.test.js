const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = rel => fs.readFileSync(path.join(root,rel),'utf8');

const admin = read('src/views/admin.js');
const app = read('src/app.js');
const pages = read('css/pages.css');
const product = read('css/product-system.css');
const home = read('src/views/home.js');
const schema = read('lib/v3/schema.js');
const image = read('src/core/image.js');

test('admin tabs use native route anchors so every menu has a navigation fallback', () => {
  assert.match(admin, /function adminTabs\(active\)[\s\S]*<a href="\/admin\?tab=\$\{encodeURIComponent\(key\)\}"[^>]*data-route/);
  assert.doesNotMatch(admin, /data-admin-tab=/);
  assert.match(pages, /\.admin-tabs a\{/);
});

test('member save feedback is local to each member row and does not rerender it away', () => {
  assert.match(admin, /data-member-save-state="\$\{esc\(user\.id\)\}"/);
  const start = app.indexOf('const member = event.target.closest("[data-member-access]")');
  const end = app.indexOf('\n  }\n});', start);
  const body = app.slice(start, end);
  assert.match(body, /member\.closest\("\[data-member-row\]"\)/);
  assert.match(body, /저장 중/);
  assert.match(body, /저장 완료/);
  assert.doesNotMatch(body, /render\(currentRoute\(\)/);
});

test('admin and NOW data center expose lightweight live pulse status indicators', () => {
  assert.match(admin, /admin-live-pulse/);
  assert.match(admin, /data-live-status="ready"/);
  assert.match(pages, /@keyframes admin-live-pulse/);
  assert.match(pages, /prefers-reduced-motion/);
});

test('main title admin edits the actual current product hero fields', () => {
  for (const field of ['productKicker','productTagline','productHeadline','productAccentText','productDescription','productPrimaryLabel','productPrimaryHref','productSecondaryLabel','productSecondaryHref']) {
    assert.ok(admin.includes(`name="${field}"`), `missing admin field ${field}`);
    assert.ok(schema.includes(field), `missing schema field ${field}`);
  }
  for (const field of ['productHeadlineTone','productAccentTone','productDescriptionTone']) {
    assert.ok(admin.includes(`heroToneSwatches("${field}"`), `missing swatch field ${field}`);
    assert.ok(schema.includes(field), `missing schema field ${field}`);
  }
  assert.match(admin, /1200\s*×\s*675/);
  assert.match(admin, /16:9/);
  assert.match(admin, /12MB/);
  assert.doesNotMatch(admin, /현재 확정 디자인 비주얼 사용 중/);
  assert.match(home, /productDescription/);
  assert.match(home, /productHeadlineTone/);
  assert.match(home, /productAccentTone/);
  assert.match(home, /productDescriptionTone/);
  assert.match(product, /product-hero-has-art/);
});

test('small official local-leader portraits are accepted instead of being blocked at 320x400', () => {
  assert.doesNotMatch(image, /naturalWidth < 320 \|\| img\.naturalHeight < 400/);
  assert.match(image, /POLITICIAN_PHOTO_MIN_WIDTH\s*=\s*120/);
  assert.match(image, /POLITICIAN_PHOTO_MIN_HEIGHT\s*=\s*150/);
});
