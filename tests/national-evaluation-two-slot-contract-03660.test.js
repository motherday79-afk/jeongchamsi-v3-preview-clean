const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

test('public evaluation page is renamed and renders the two fixed citizen evaluation slots', () => {
  const src = read('src/views/features.js');
  assert.match(src, /정참시민 전국 평가제/);
  assert.match(src, /assembly/);
  assert.match(src, /local/);
  assert.match(src, /data-evaluation-id/);
  assert.match(src, /광역단체장|기초단체장/);
});

test('admin editor supports direct two-slot editing and explicit evaluation close', () => {
  const src = read('src/views/national-evaluation-admin.js');
  assert.match(src, /data-national-admin-form/);
  assert.match(src, /data-national-evaluation-close/);
  assert.match(src, /closeNationalEvaluationSlot/);
  assert.match(src, /국회의원/);
  assert.match(src, /광역단체장/);
  assert.match(src, /기초단체장/);
});

test('backend vote action validates an active evaluation cycle instead of assembly person id only', () => {
  const src = read('server/v3/routes/action.js');
  assert.match(src, /evaluationId/);
  assert.match(src, /metropolitan-\\d\{3\}/);
  assert.match(src, /basic-\\d\{3\}/);
  assert.match(src, /jcv3:nationaleval:v2/);
});

test('persistent national evaluation schema preserves slots and cycle history', () => {
  const src = read('lib/v3/schema.js');
  assert.match(src, /slots/);
  assert.match(src, /evaluationId/);
  assert.match(src, /slot/);
  assert.match(src, /startedAt/);
  assert.match(src, /closedAt/);
});

test('main title is renamed and home can render both evaluation slots', () => {
  const src = read('src/views/home.js');
  assert.match(src, /정참시민 전국 평가제/);
  assert.match(src, /national-eval-dual/);
});
