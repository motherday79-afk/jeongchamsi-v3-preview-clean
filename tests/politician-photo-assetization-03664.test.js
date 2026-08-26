const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const resolver = require('../server/v3/lib/politician-photo-resolver');
const route = read('server/v3/routes/politician-photo.js');
const admin = read('src/views/admin.js');
const app = read('src/app.js');
const schema = read('lib/v3/schema.js');

const park = { id:'assembly-131', type:'assembly', name:'박성민', party:'국민의힘', jurisdiction:'울산 중구' };

test('identity evidence rejects same-name generic or wrong-party politician candidates', () => {
  assert.equal(resolver.identityEvidence(park, '박성민은 대한민국의 정치인이다.').strong, false);
  assert.equal(resolver.identityEvidence(park, '더불어민주당 소속 정치인 박성민').strong, false);
  assert.equal(resolver.identityEvidence(park, '국민의힘 울산 중구 시의원 박성민').strong, false);
  assert.equal(resolver.identityEvidence(park, '국민의힘 소속 울산 중구 국회의원 박성민').strong, true);
});

test('automatic source resolution requires strong party or region identity evidence', () => {
  assert.match(read('server/v3/lib/politician-photo-resolver.js'), /identityEvidence/);
  assert.match(read('server/v3/lib/politician-photo-resolver.js'), /if \(!evidence\.strong\) continue/);
});

test('photo route supports admin-only small-batch auto assetization into Vercel Blob', () => {
  assert.match(route, /harvest-batch/);
  assert.match(route, /requireAdmin/);
  assert.match(route, /@vercel\/blob/);
  assert.match(route, /blobToken/);
  assert.match(route, /jcv3\/politician\/auto/);
  assert.match(route, /Math\.min\(5/);
  assert.match(route, /setJSON\("politicianPhotos"/);
});

test('photo URLs use a new resolver cache key so old same-name mistakes cannot survive CDN cache', () => {
  const index = read('src/data/politician-photo-index.js');
  assert.match(index, /politician-photo\?id=\$\{encodeURIComponent\(key\)\}&w=\$\{spec\.width\}&v=03672/);
});

test('existing photo assets are locked out of automatic replacement and manual saves are marked manual', () => {
  assert.match(route, /if \(existing\.has\(person\.id\)\)/);
  assert.match(admin, /sourceType:"manual"/);
  assert.match(schema, /sourceType/);
  assert.match(schema, /verified/);
});

test('people admin exposes current photo collection progress and app wires the active stage3 action', () => {
  assert.match(admin, /data-politician-photo-harvest/);
  assert.match(admin, /3단계 직접소스 수집 시작/);
  assert.match(admin, /정참시 자산/);
  assert.match(admin, /discoverPoliticianPhotosStage3/);
  assert.match(app, /data-politician-photo-harvest/);
  assert.match(app, /discoverPoliticianPhotosStage3/);
});
