const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const roster = require('../server/v3/data/politician-photo-roster.json');

test('assembly photo target is 299 real people and excludes the vacancy slot', () => {
  const assembly = roster.filter(p => p.type === 'assembly');
  const people = assembly.filter(p => p.id !== 'assembly-300');
  assert.equal(assembly.length, 300);
  assert.equal(people.length, 299);
  assert.equal(assembly.find(p => p.id === 'assembly-300')?.party, '공석');
});

test('photo route exposes a direct assembly assetization batch action', () => {
  const route = read('server/v3/routes/politician-photo.js');
  assert.match(route, /assetize-assembly-batch/);
  assert.match(route, /assetizeAssemblyBatch/);
  assert.match(route, /ASSEMBLY_PHOTO_TARGETS/);
});

test('assembly assetizer persists verified photos into Vercel Blob records, not review-only candidates', () => {
  const file = read('server/v3/lib/politician-photo-assembly-assetizer.js');
  assert.match(file, /put\(/);
  assert.match(file, /auto-official-review/);
  assert.match(file, /fetchPoliticianPhoto/);
  assert.match(file, /discoverDirectCandidates/);
  assert.match(file, /discoverOfficialCandidates/);
});

test('admin has a one-run assembly assetization control wired to the batch action', () => {
  const admin = read('src/views/admin.js');
  const app = read('src/app.js');
  assert.match(admin, /data-politician-photo-assembly-assetize/);
  assert.match(admin, /assetizeAssemblyPoliticianPhotos/);
  assert.match(admin, /assetize-assembly-batch/);
  assert.match(app, /data-politician-photo-assembly-assetize/);
  assert.match(app, /startAssemblyPhotoAssetizationIfNeeded/);
});
