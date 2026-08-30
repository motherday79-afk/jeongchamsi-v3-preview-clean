async function mgetJSONInBatches(domains, mgetJSON, batchSize = 25) {
  const items = Array.isArray(domains) ? domains : [];
  const size = Math.max(1, Math.floor(Number(batchSize) || 25));
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const values = await mgetJSON(chunk);
    for (let j = 0; j < chunk.length; j += 1) out.push(values?.[j] ?? null);
  }
  return out;
}

module.exports = { mgetJSONInBatches };
