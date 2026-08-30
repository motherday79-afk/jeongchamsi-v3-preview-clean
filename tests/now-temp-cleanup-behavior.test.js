const test = require('node:test');
const assert = require('node:assert/strict');
const { createNowTempCleanup } = require('../server/v3/lib/now-temp-cleanup');

test('explicit scan/delete dependencies keep existing behavior', async () => {
  const scanned=[]; let deleted=[];
  const cleanup=createNowTempCleanup({
    scanDomains: async pattern => { scanned.push(pattern); return pattern==='nowDataBatch:*' ? ['nowDataBatch:x:0'] : []; },
    deleteDomains: async domains => { deleted=[...domains]; return domains.length; }
  });
  const out=await cleanup.cleanupAllNowTemp();
  assert.equal(scanned.length,4);
  assert.deepEqual(deleted,['nowDataBatch:x:0']);
  assert.deepEqual(out,{matched:1,deleted:1});
});

test('draft cleanup does not require scanDomains', async () => {
  let deleted=[];
  const cleanup=createNowTempCleanup({
    scanDomains: null,
    deleteDomains: async domains => { deleted=[...domains]; return domains.length; },
    command: async () => { throw new Error('SCAN should not run'); }
  });
  const out=await cleanup.cleanupDraftNowTemp('abc',2);
  assert.equal(out.matched,6);
  assert.equal(deleted.length,6);
});
