const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitize, defaultDomain, validDomain } = require('../lib/v3/schema.js');

const blob = name => `https://jcv3-public.public.blob.vercel-storage.com/politician/${name}.webp`;

test('politicianPhotos domain defaults to an empty server-side list', () => {
  assert.equal(validDomain('politicianPhotos'), true);
  assert.deepEqual(defaultDomain('politicianPhotos'), { items: [] });
});

test('politicianPhotos accepts only real politician ids with complete Vercel Blob variants', () => {
  const data = sanitize('politicianPhotos', { items: [
    { id:'assembly-001', variants:{ mini:blob('a-mini'), card:blob('a-card'), profile:blob('a-profile') }, bytes:{ mini:1000, card:2000, profile:3000 }, updatedAt:'2026-08-24T00:00:00.000Z' },
    { id:'assembly-300', variants:{ mini:blob('x-mini'), card:blob('x-card'), profile:blob('x-profile') } },
    { id:'assembly-002', variants:{ mini:'https://evil.example/a.webp', card:blob('b-card'), profile:blob('b-profile') } },
    { id:'basic-228', variants:{ mini:blob('c-mini'), card:blob('c-card'), profile:blob('c-profile') } },
  ]});
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].id, 'assembly-001');
  assert.equal(data.items[0].bytes.total, 6000);
  assert.equal(data.items[0].focus, '50% 28%');
});

test('politicianPhotos de-duplicates one manual record per politician', () => {
  const first = { id:'metropolitan-001', variants:{ mini:blob('1-mini'), card:blob('1-card'), profile:blob('1-profile') } };
  const second = { id:'metropolitan-001', variants:{ mini:blob('2-mini'), card:blob('2-card'), profile:blob('2-profile') } };
  const data = sanitize('politicianPhotos', { items:[first, second] });
  assert.equal(data.items.length, 1);
  assert.equal(data.items[0].variants.profile, first.variants.profile);
});
