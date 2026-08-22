const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const route=fs.readFileSync('server/v3/routes/admin/now-data.js','utf8');
const admin=fs.readFileSync('src/views/admin.js','utf8');

test('NOW start blocks only when Search Ads credentials are missing',()=>{
  assert.match(route,/if\(!search\.configured\)missingGroups\.push\('searchAds'\)/);
  assert.doesNotMatch(route,/missingGroups\.push\('news'\)/);
  assert.doesNotMatch(route,/missingEnv\.push\('NAVER_NEWS_/);
});

test('admin exposes automatic news fallback state',()=>{
  assert.match(admin,/Google News RSS fallback/);
  assert.match(admin,/전체 새로고침은 정상 실행됩니다/);
});
