const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

test('cleanup falls back to redis command when scanDomains/deleteDomains exports are absent', async () => {
  const helperPath = path.resolve(__dirname, '../server/v3/lib/now-temp-cleanup.js');
  const originalLoad = Module._load;
  const calls = [];
  Module._load = function(request, parent, isMain) {
    if (request === '../../../lib/v3/redis' && parent && parent.filename === helperPath) {
      return {
        command: async args => {
          calls.push(args);
          if (args[0] === 'SCAN') return ['0', ['jcv3:content:v4:nowDataBatch:old:0']];
          if (args[0] === 'DEL') return args.length - 1;
          throw new Error('unexpected command');
        }
      };
    }
    return originalLoad(request, parent, isMain);
  };
  try {
    delete require.cache[helperPath];
    const { createNowTempCleanup } = require(helperPath);
    const cleanup = createNowTempCleanup();
    const result = await cleanup.cleanupAllNowTemp();
    assert.equal(result.matched, 1);
    assert.equal(result.deleted, 1);
    assert.ok(calls.some(x => x[0] === 'SCAN'));
    assert.ok(calls.some(x => x[0] === 'DEL'));
  } finally {
    Module._load = originalLoad;
    delete require.cache[helperPath];
  }
});
