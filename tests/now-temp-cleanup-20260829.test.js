const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('NOW temp cleanup only targets batch, batch-status, and ranked workspace domains', async () => {
  const calls = [];
  const helperPath = require.resolve('../server/v3/lib/now-temp-cleanup');
  delete require.cache[helperPath];
  const { createNowTempCleanup } = require(helperPath);
  const cleanup = createNowTempCleanup({
    scanDomains: async pattern => {
      calls.push(['scan', pattern]);
      if (pattern === 'nowDataBatch:*') return ['nowDataBatch:old:0', 'nowDataBatch:old:1'];
      if (pattern === 'nowDataBatchStatus:*') return ['nowDataBatchStatus:old:0'];
      if (pattern === 'nowDataDraftRanked:*') return ['nowDataDraftRanked:old'];
      return [];
    },
    deleteDomains: async domains => {
      calls.push(['delete', [...domains]]);
      return domains.length;
    }
  });

  const result = await cleanup.cleanupAllNowTemp();

  assert.deepEqual(calls.slice(0, 3), [
    ['scan', 'nowDataBatch:*'],
    ['scan', 'nowDataBatchStatus:*'],
    ['scan', 'nowDataDraftRanked:*']
  ]);
  const deleted = calls.find(x => x[0] === 'delete')[1];
  assert.equal(result.deleted, 4);
  assert.equal(deleted.length, 4);
  assert.ok(deleted.every(key => /^(nowDataBatch:|nowDataBatchStatus:|nowDataDraftRanked:)/.test(key)));
  assert.ok(deleted.every(key => !/nowData(Current|History|Public|Person)/.test(key)));
});

test('publish cleanup deletes only the finished draft temporary workspace', async () => {
  let deleted = [];
  const helperPath = require.resolve('../server/v3/lib/now-temp-cleanup');
  delete require.cache[helperPath];
  const { createNowTempCleanup } = require(helperPath);
  const cleanup = createNowTempCleanup({
    scanDomains: async () => [],
    deleteDomains: async domains => { deleted = [...domains]; return domains.length; }
  });

  const result = await cleanup.cleanupDraftNowTemp('now-abc', 3);
  assert.equal(result.deleted, 7);
  assert.deepEqual(deleted, [
    'nowDataBatch:now-abc:0',
    'nowDataBatchStatus:now-abc:0',
    'nowDataBatch:now-abc:1',
    'nowDataBatchStatus:now-abc:1',
    'nowDataBatch:now-abc:2',
    'nowDataBatchStatus:now-abc:2',
    'nowDataDraftRanked:now-abc'
  ]);
});

test('Redis helper provides bounded SCAN and batched DEL for content domains', () => {
  const redis = read('lib/v3/redis.js');
  assert.match(redis, /async function scanDomains\(/);
  assert.match(redis, /\["SCAN",\s*cursor,\s*"MATCH",\s*contentKey\(pattern\),\s*"COUNT"/);
  assert.match(redis, /async function deleteDomains\(/);
  assert.match(redis, /\["DEL",\s*\.\.\.chunk\.map\(contentKey\)\]/);
  assert.match(redis, /module\.exports[^\n]*scanDomains[^\n]*deleteDomains/);
});

test('NOW refresh frees stale workspace before creating a new draft and cleans the finished draft after publish', () => {
  const route = read('server/v3/routes/admin/now-data.js');
  assert.match(route, /cleanupAllNowTemp/);
  assert.match(route, /cleanupDraftNowTemp/);
  const startCleanup = route.indexOf('await cleanupAllNowTemp()');
  const startWrite = route.indexOf('await setJSON(META,meta)');
  assert.ok(startCleanup >= 0 && startCleanup < startWrite, 'stale cleanup must run before the new draft SET');
  const publishCapture = route.indexOf('await recordPublishedSnapshotV2');
  const publishCleanup = route.indexOf('await cleanupDraftNowTemp(meta.draftId,meta.batchCount)');
  assert.ok(publishCleanup > publishCapture, 'finished draft cleanup must run after V2 capture attempt');
});
