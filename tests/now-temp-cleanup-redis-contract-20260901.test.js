const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('redis wrapper exports cleanup scan/delete functions required by NOW refresh', () => {
  const redis = require(path.join(ROOT, 'lib/v3/redis.js'));
  assert.equal(typeof redis.scanDomains, 'function');
  assert.equal(typeof redis.deleteDomains, 'function');
});

test('NOW temp cleanup default wiring can be constructed from the production redis wrapper', () => {
  const cleanup = require(path.join(ROOT, 'server/v3/lib/now-temp-cleanup.js'));
  const defaults = cleanup.createNowTempCleanup();
  assert.equal(typeof defaults.cleanupAllNowTemp, 'function');
  assert.equal(typeof defaults.cleanupDraftNowTemp, 'function');
});
