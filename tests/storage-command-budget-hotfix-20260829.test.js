const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('msetJSON uses one Redis MSET command instead of a pipeline of SET commands', async () => {
  const oldUrl = process.env.JCV3_REDIS_REST_URL;
  const oldToken = process.env.JCV3_REDIS_REST_TOKEN;
  const oldFetch = global.fetch;
  process.env.JCV3_REDIS_REST_URL = 'https://redis.example.test';
  process.env.JCV3_REDIS_REST_TOKEN = 'token';
  const calls = [];
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), body: JSON.parse(options.body) });
    return { ok: true, status: 200, json: async () => ({ result: 'OK' }) };
  };
  try {
    delete require.cache[require.resolve('../lib/v3/redis')];
    const { msetJSON } = require('../lib/v3/redis');
    const result = await msetJSON([
      ['person:a', { score: 1 }],
      ['person:b', { score: 2 }]
    ]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://redis.example.test');
    assert.deepEqual(calls[0].body, [
      'MSET',
      'jcv3:content:v4:person:a', JSON.stringify({ score: 1 }),
      'jcv3:content:v4:person:b', JSON.stringify({ score: 2 })
    ]);
    assert.equal(result, 'OK');
  } finally {
    global.fetch = oldFetch;
    if (oldUrl === undefined) delete process.env.JCV3_REDIS_REST_URL; else process.env.JCV3_REDIS_REST_URL = oldUrl;
    if (oldToken === undefined) delete process.env.JCV3_REDIS_REST_TOKEN; else process.env.JCV3_REDIS_REST_TOKEN = oldToken;
  }
});

test('NOW publish records only HISTORY V2 while legacy V1 remains available elsewhere', () => {
  const nowRoute = read('server/v3/routes/admin/now-data.js');
  const actionRoute = read('server/v3/routes/action.js');
  assert.doesNotMatch(nowRoute, /recordPublishedSnapshot\s*\}\s*=\s*require\(['"]\.\.\/\.\.\/lib\/history-store['"]\)/);
  assert.doesNotMatch(nowRoute, /recordPublishedSnapshot\(current\)/);
  assert.match(nowRoute, /recordPublishedSnapshotV2\(current,previousHistory\)/);
  assert.match(actionRoute, /history-store/);
  assert.match(actionRoute, /recordActionSignal/);
});

test('NOW admin alerts surface storage detail returned by the server', () => {
  const app = read('src/app.js');
  assert.match(app, /function nowFailureText\(label,\s*r\)/);
  assert.match(app, /r\?\.detail/);
  assert.match(app, /nowFailureText\("NOW 새로고침 실패",\s*r\)/);
  assert.match(app, /nowFailureText\("NOW 게시 실패",\s*r\)/);
});

test('NOW batch queue preserves storage detail for the refresh error popup', () => {
  const admin = read('src/views/admin.js');
  assert.match(admin, /firstDetail/);
  assert.match(admin, /detail:firstDetail/);
});

test('storage hotfix cache-busts the changed app shell and admin module', () => {
  const index = read('index.html');
  const app = read('src/app.js');
  assert.match(index, /history-v2-storage-budget-hotfix/);
  assert.match(app, /views\/admin\.js\?v=history-v1-v2-search-daily-storage-budget-hotfix/);
});
