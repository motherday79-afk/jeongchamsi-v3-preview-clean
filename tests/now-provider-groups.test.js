const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const route=fs.readFileSync('server/v3/routes/admin/now-data.js','utf8');
const admin=fs.readFileSync('src/views/admin.js','utf8');
const app=fs.readFileSync('src/app.js','utf8');

test('NOW config exposes two logical provider groups',()=>{
  assert.match(route,/missingGroups/);
  assert.match(route,/searchAds[^\n]*news/);
});

test('admin shows provider-level diagnosis instead of raw env names',()=>{
  assert.match(admin,/네이버 검색량 연결/);
  assert.match(admin,/네이버 뉴스 연결/);
  assert.doesNotMatch(admin,/현재 v3 프로젝트에서 확인되지 않은 항목/);
});

test('refresh alert uses two provider groups',()=>{
  assert.match(app,/missingGroups/);
  assert.match(app,/네이버 검색량|네이버 뉴스/);
  assert.doesNotMatch(app,/없는 환경변수/);
});
