const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

test('shared features module can be imported by SPA navigation', () => {
  const target = pathToFileURL(path.join(process.cwd(), 'src/views/features.js')).href;
  const code = `import(${JSON.stringify(target)}).then(()=>process.exit(0)).catch(err=>{console.error(err);process.exit(1)})`;
  const run = spawnSync(process.execPath, ['--experimental-default-type=module', '-e', code], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  assert.equal(run.status, 0, `features.js import failed:\n${run.stderr || run.stdout}`);
});
