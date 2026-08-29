const redis = require('../../../lib/v3/redis');

const TEMP_PATTERNS = Object.freeze([
  'nowDataBatch:*',
  'nowDataBatchStatus:*',
  'nowDataDraftRanked:*',
  'nowDataExternalEvidence:*'
]);

function createNowTempCleanup(deps = {}) {
  const scanDomains = deps.scanDomains || redis.scanDomains;
  const deleteDomains = deps.deleteDomains || redis.deleteDomains;

  async function cleanupAllNowTemp() {
    const found = [];
    for (const pattern of TEMP_PATTERNS) {
      const domains = await scanDomains(pattern);
      if (Array.isArray(domains)) found.push(...domains);
    }
    const unique = [...new Set(found)];
    const deleted = unique.length ? await deleteDomains(unique) : 0;
    return { matched: unique.length, deleted };
  }

  async function cleanupDraftNowTemp(draftId, batchCount) {
    const id = String(draftId || '').trim();
    const count = Math.max(0, Math.floor(Number(batchCount) || 0));
    if (!id) return { matched: 0, deleted: 0 };
    const domains = [];
    for (let index = 0; index < count; index += 1) {
      domains.push(`nowDataBatch:${id}:${index}`);
      domains.push(`nowDataBatchStatus:${id}:${index}`);
    }
    domains.push(`nowDataDraftRanked:${id}`);
    domains.push(`nowDataExternalEvidence:${id}`);
    const deleted = domains.length ? await deleteDomains(domains) : 0;
    return { matched: domains.length, deleted };
  }

  return { cleanupAllNowTemp, cleanupDraftNowTemp };
}

const defaults = createNowTempCleanup();
module.exports = { TEMP_PATTERNS, createNowTempCleanup, ...defaults };
