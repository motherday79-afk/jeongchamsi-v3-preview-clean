const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');

function relativeImports(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  const patterns = [
    /(?:import\s+(?:[^'\"]+?\s+from\s+)?|export\s+[^'\"]*?\s+from\s+|import\s*\()\s*['\"]([^'\"]+)['\"]/g,
    /require\(\s*['\"]([^'\"]+)['\"]\s*\)/g,
  ];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const spec = match[1];
      if (spec.startsWith('.')) out.push(spec.split('?')[0].split('#')[0]);
    }
  }
  return out;
}

function resolves(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  return [base, `${base}.js`, `${base}.json`, path.join(base, 'index.js')].some(fs.existsSync);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(ent => {
    const p = path.join(dir, ent.name);
    return ent.isDirectory() ? walk(p) : [p];
  });
}

test('FULL recovery package contains politician source and resolves every local JS import', async () => {
  const provider = path.join(ROOT, 'src/data/person-provider.js');
  assert.ok(fs.existsSync(provider), 'src/data/person-provider.js must ship in FULL package');
  const mod = await import(`${pathToFileURL(provider).href}?integrity=${Date.now()}`);
  const all = mod.listAllPoliticians();
  assert.ok(all.length >= 542, `politician roster must contain at least 542 rows, got ${all.length}`);
  assert.ok(all.some(p => p.name === '서미화'), 'known politician 서미화 must be present');
  assert.ok(all.some(p => p.id.startsWith('assembly-')));
  assert.ok(all.some(p => p.id.startsWith('metropolitan-')));
  assert.ok(all.some(p => p.id.startsWith('basic-')));

  const missing = [];
  for (const file of walk(ROOT).filter(p => p.endsWith('.js') && !p.includes(`${path.sep}node_modules${path.sep}`))) {
    for (const spec of relativeImports(file)) {
      if (!resolves(file, spec)) missing.push(`${path.relative(ROOT, file)} -> ${spec}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('NOW refresh safety contracts remain present in FULL recovery package', () => {
  const redis = fs.readFileSync(path.join(ROOT, 'lib/v3/redis.js'), 'utf8');
  const nowData = fs.readFileSync(path.join(ROOT, 'server/v3/routes/admin/now-data.js'), 'utf8');
  assert.match(redis, /scanDomains/);
  assert.match(redis, /deleteDomains/);
  assert.match(nowData, /mgetJSONInBatches/);
  assert.match(nowData, /\b25\b/);
});

test('member badge and livebar runtime modules expose the contracts used by routes', () => {
  const activity = require(path.join(ROOT, 'lib/v3/activity.js'));
  assert.equal(typeof activity.recordBadgeEvent, 'function');
  const badgeEngine = require(path.join(ROOT, 'lib/v3/badge-engine.js'));
  assert.ok(badgeEngine.VALID_BADGE_KEYS instanceof Set);
  assert.equal(typeof badgeEngine.isBadgeUnlocked, 'function');
  const livebar = require(path.join(ROOT, 'server/v3/routes/livebar.js'));
  assert.equal(typeof livebar, 'function');
});

test('latest public detail and compare modules load with their declared intelligence exports', async () => {
  await import(`${pathToFileURL(path.join(ROOT, 'src/views/people.js')).href}?load=${Date.now()}`);
  await import(`${pathToFileURL(path.join(ROOT, 'src/views/features.js')).href}?load=${Date.now()}`);
});

test('FULL recovery deployment cache-busts the repaired app and compare-intelligence module', () => {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const people = fs.readFileSync(path.join(ROOT, 'src/views/people.js'), 'utf8');
  const features = fs.readFileSync(path.join(ROOT, 'src/views/features.js'), 'utf8');
  assert.match(index, /full-recovery-r3/);
  assert.match(people, /compare-intelligence\.js\?v=03686-full-recovery-r3/);
  assert.match(features, /compare-intelligence\.js\?v=03686-full-recovery-r3/);
});
