const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const features=fs.readFileSync('src/views/features.js','utf8');
const repository=fs.readFileSync('src/core/repository.js','utf8');
const route=fs.readFileSync('server/v3/routes/now-data.js','utf8');
const admin=fs.readFileSync('server/v3/routes/admin/now-data.js','utf8');

test('NOW full page requests category-specific live ranking rather than static slot order',()=>{
  assert.match(repository,/getNowCategory/);
  assert.match(features,/getNowCategory\(/);
  assert.match(features,/categoryRank/);
  assert.match(features,/전체 NOW/);
  assert.match(features,/30명 더 불러오기/);
});

test('public NOW route serves category slices and publish refreshes category caches',()=>{
  assert.match(route,/nowDataPublicCategory:/);
  assert.match(route,/category/);
  assert.match(route,/offset/);
  assert.match(route,/limit/);
  assert.match(admin,/buildCategoryPublicSnapshots/);
  assert.match(admin,/nowDataPublicCategory:/);
});
