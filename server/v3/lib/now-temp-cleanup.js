const redis = require('../../../lib/v3/redis');

const TEMP_PATTERNS = Object.freeze([
  'nowDataBatch:*',
  'nowDataBatchStatus:*',
  'nowDataDraftRanked:*',
  'nowDataExternalEvidence:*'
]);

const CONTENT_PREFIX = 'jcv3:content:v4:';

function normalizeScanResult(result) {
  if (!Array.isArray(result)) return ['0', []];
  const cursor = String(result[0] ?? '0');
  const keys = Array.isArray(result[1]) ? result[1] : [];
  return [cursor, keys];
}

function createCommandScan(commandFn) {
  return async function scanDomainsFallback(pattern) {
    if (typeof commandFn !== 'function') throw new TypeError('redis command is not a function');
    let cursor = '0';
    const domains = [];
    do {
      const result = await commandFn(['SCAN', cursor, 'MATCH', `${CONTENT_PREFIX}${pattern}`, 'COUNT', '500']);
      const [nextCursor, keys] = normalizeScanResult(result);
      cursor = nextCursor;
      for (const key of keys) {
        const value = String(key || '');
        domains.push(value.startsWith(CONTENT_PREFIX) ? value.slice(CONTENT_PREFIX.length) : value);
      }
    } while (cursor !== '0');
    return domains;
  };
}

function createCommandDelete(commandFn) {
  return async function deleteDomainsFallback(domains) {
    if (typeof commandFn !== 'function') throw new TypeError('redis command is not a function');
    const unique = [...new Set((Array.isArray(domains) ? domains : []).map(x => String(x || '')).filter(Boolean))];
    let deleted = 0;
    for (let i = 0; i < unique.length; i += 100) {
      const chunk = unique.slice(i, i + 100);
      const result = await commandFn(['DEL', ...chunk.map(domain => `${CONTENT_PREFIX}${domain}`)]);
      deleted += Number(result) || 0;
    }
    return deleted;
  };
}

function createNowTempCleanup(deps = {}) {
  const commandFn = deps.command || redis.command;
  const scanDomains =
    typeof deps.scanDomains === 'function' ? deps.scanDomains :
    typeof redis.scanDomains === 'function' ? redis.scanDomains :
    createCommandScan(commandFn);
  const deleteDomains =
    typeof deps.deleteDomains === 'function' ? deps.deleteDomains :
    typeof redis.deleteDomains === 'function' ? redis.deleteDomains :
    createCommandDelete(commandFn);

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
