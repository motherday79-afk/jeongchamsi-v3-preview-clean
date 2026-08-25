const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const seedPath = path.join(root, 'server/v3/data/politician-photo-local-seed.json');
const roster = require('../server/v3/data/politician-photo-roster.json');
const metro = roster.filter(x => x.type === 'metropolitan');

function resolvableVariant(url = '') {
  return String(url).startsWith('/assets/politicians/') || /^https:\/\//.test(String(url));
}

test('all 16 metropolitan heads are registered as packaged photo assets', () => {
  assert.equal(metro.length, 16);
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  const map = new Map(seed.items.map(x => [x.id, x]));
  for (const person of metro) {
    const item = map.get(person.id);
    assert.ok(item, `missing asset record: ${person.id} ${person.name}`);
    assert.equal(item.verified, true, `unverified asset: ${person.name}`);
    assert.ok(['seed-local','seed-external'].includes(item.sourceType), `bad source type: ${person.name}`);
    for (const variant of ['mini','card','profile']) {
      const url = item.variants?.[variant];
      assert.ok(resolvableVariant(url), `missing ${variant}: ${person.name}`);
      if (String(url).startsWith('/assets/')) {
        assert.ok(fs.existsSync(path.join(root, url.replace(/^\//,''))), `missing local file: ${person.name} ${variant}`);
      }
    }
  }
});

test('politicianPhotos reads merge stored assets with packaged seed assets', () => {
  const content = fs.readFileSync(path.join(root, 'server/v3/routes/content.js'), 'utf8');
  assert.match(content, /mergePoliticianPhotoAssets/);
  assert.match(content, /savedData/);
  const route = fs.readFileSync(path.join(root, 'server/v3/routes/politician-photo.js'), 'utf8');
  assert.match(route, /mergePoliticianPhotoAssets/);
  const helperPath = path.join(root, 'server/v3/lib/politician-photo-assets.js');
  assert.ok(fs.existsSync(helperPath));
  const helper = fs.readFileSync(helperPath, 'utf8');
  assert.match(helper, /politician-photo-local-seed\.json/);
});


test('people admin counts packaged photo assets explicitly', () => {
  const admin = fs.readFileSync(path.join(root, 'src/views/admin.js'), 'utf8');
  assert.match(admin, /seedCount/);
  assert.match(admin, /패키지 \${seedCount}/);
});
