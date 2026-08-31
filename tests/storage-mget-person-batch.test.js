const assert = require('assert');
const fs = require('fs');
const path = require('path');

const helperPath = path.join(__dirname, '../server/v3/lib/storage-safe-mget.js');
const routePath = path.join(__dirname, '../server/v3/routes/admin/now-data.js');

(async function run(){
  const { mgetJSONInBatches } = require(helperPath);
  assert.strictEqual(typeof mgetJSONInBatches, 'function');

  const domains = Array.from({length:542}, (_,i)=>`nowDataPersonPublic:p${String(i).padStart(3,'0')}`);
  const calls = [];
  const fakeMgetJSON = async chunk => {
    calls.push([...chunk]);
    return chunk.map((domain, index)=> index === 3 && calls.length === 2 ? null : {domain});
  };
  const values = await mgetJSONInBatches(domains, fakeMgetJSON, 25);
  assert.strictEqual(values.length, 542, 'must preserve result length');
  assert.strictEqual(calls.length, Math.ceil(542/25), '542 keys must be split into bounded MGET calls');
  assert(calls.every(chunk=>chunk.length <= 25), 'no MGET batch may exceed 25 keys');
  assert.strictEqual(values[0].domain, domains[0], 'must preserve ordering');
  assert.strictEqual(values[541].domain, domains[541], 'must preserve tail ordering');
  assert.strictEqual(values[28], null, 'null entries must preserve their exact index');

  const route = fs.readFileSync(routePath, 'utf8');
  assert(/storage-safe-mget/.test(route), 'NOW route must import safe batched MGET helper');
  assert(/mgetJSONInBatches\(previewEntries\.map\(\(\[key\]\)=>key\),\s*mgetJSON,\s*25\)/.test(route), 'finalize person-history read must be batched');
  assert(/mgetJSONInBatches\(personEntries\.map\(\(\[key\]\)=>key\),\s*mgetJSON,\s*25\)/.test(route), 'publish person-history read must be batched');
  assert(!/previousPersonEntries=await mgetJSON\((previewEntries|personEntries)\.map/.test(route), 'direct 542-key person MGET must be removed');

  console.log('storage-mget-person-batch: PASS');
})().catch(error=>{ console.error(error); process.exit(1); });
