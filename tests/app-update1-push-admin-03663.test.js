import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const admin = fs.readFileSync(new URL('../src/views/admin.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('admin exposes push notification composer and device counts', () => {
  assert.match(admin, /\["push",\s*"푸시 알림"\]/);
  assert.match(admin, /data-push-form/);
  assert.match(admin, /data-push-preview/);
  assert.match(admin, /테스트 발송/);
  assert.match(admin, /전체 테스트기기 발송/);
});

test('push composer supports image upload and live preview', () => {
  assert.match(admin, /data-push-image-input/);
  assert.match(admin, /data-push-image-preview/);
  assert.match(app, /data-push-preview/);
  assert.match(app, /data-push-image-input/);
});

test('push backend reuses the single action gateway and packages firebase admin', () => {
  assert.equal(typeof pkg.dependencies['firebase-admin'], 'string');
  const actionFile = new URL('../server/v3/routes/action.js', import.meta.url);
  const pushFile = new URL('../lib/v3/push.js', import.meta.url);
  assert.ok(fs.existsSync(actionFile));
  assert.ok(fs.existsSync(pushFile));
  const action = fs.readFileSync(actionFile, 'utf8');
  assert.match(action, /push-register/);
  assert.match(action, /push-status/);
  assert.match(action, /push-send/);
});

test('login session is extended for the installed app test period', () => {
  const authFile = new URL('../lib/v3/user-auth.js', import.meta.url);
  assert.ok(fs.existsSync(authFile));
  const auth = fs.readFileSync(authFile, 'utf8');
  assert.match(auth, /SESSION_DAYS\s*=\s*90/);
  assert.match(auth, /Max-Age=\$\{SESSION_MAX_AGE\}/);
});
