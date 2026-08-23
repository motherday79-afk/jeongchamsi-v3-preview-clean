const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const admin = fs.readFileSync(require.resolve('../src/views/admin.js'), 'utf8');
const layout = fs.readFileSync(require.resolve('../src/views/layout.js'), 'utf8');
const app = fs.readFileSync(require.resolve('../src/app.js'), 'utf8');
const homeRoute = fs.readFileSync(require.resolve('../server/v3/routes/home.js'), 'utf8');
const livebarRoute = fs.readFileSync(require.resolve('../server/v3/routes/livebar.js'), 'utf8');

test('badge center exposes main celebration badge selection controls', () => {
  assert.match(admin, /data-badge-celebration-form/);
  assert.match(admin, /메인 축하 노출/);
  assert.match(app, /data-badge-celebration-form/);
});

test('main livebar has a central badge achievement announcement slot', () => {
  assert.match(layout, /data-livebar-celebrations/);
  assert.match(layout, /님께서/);
  assert.match(layout, /배지를 획득하셨습니다/);
});

test('home and livebar APIs provide recent badge celebrations', () => {
  assert.match(homeRoute, /badgeCelebrations/);
  assert.match(livebarRoute, /badgeCelebrations/);
});
