const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const versionPath = path.resolve(process.cwd(), 'src/version.js');

test('version module keeps APP_VERSION and BUILD_NAME exports required by layout/admin', async () => {
  const source = fs.readFileSync(versionPath, 'utf8');
  const mod = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`);
  assert.equal(typeof mod.APP_VERSION, 'string');
  assert.ok(mod.APP_VERSION.length > 0);
  assert.equal(typeof mod.BUILD_NAME, 'string');
  assert.ok(mod.BUILD_NAME.length > 0);
});
