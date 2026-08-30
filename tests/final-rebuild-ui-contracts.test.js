'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('home NOW rank exposes 30 people in ten-person pages with arrows and four-second rotation',()=>{
  const home=read('src/views/home.js');
  assert.match(home,/slice\(0,30\)/);
  assert.match(home,/data-now-rank-prev/);
  assert.match(home,/data-now-rank-next/);
  assert.match(home,/4000/);
});

test('admin-only home HISTORY V2 surface is removed without deleting admin HISTORY itself',()=>{
  const home=read('src/views/home.js');
  const app=read('src/app.js');
  const admin=read('src/views/admin.js');
  assert.doesNotMatch(home,/data-home-history-slot|homeHistoryIntelligence|hydrateHomeAdminHistory/);
  assert.doesNotMatch(app,/hydrateHomeAdminHistory/);
  assert.match(admin,/HISTORY V2/);
});

test('admin compare uses one add-search plus removable selected chips, not five empty slots',()=>{
  const features=read('src/views/features.js');
  const app=read('src/app.js');
  assert.match(features,/data-admin-compare-add/);
  assert.match(features,/data-admin-compare-remove/);
  assert.doesNotMatch(features,/Array\.from\(\{length:5\}/);
  assert.match(app,/data-admin-compare-add/);
  assert.match(app,/data-admin-compare-remove/);
});

test('final why-JCS copy is present in repository, brand page and admin defaults',()=>{
  const repo=read('src/core/repository.js'),copy=read('src/core/brand-about-copy.js'),brand=read('src/views/brand.js'),admin=read('src/views/admin.js');
  for(const src of [repo,copy]){assert.match(src,/세계적으로 유명한 배우들도/);assert.match(src,/정참시는 정참시가 가장 잘하는 일을 하겠습니다/);assert.match(src,/가장 정확한 길을 찾는 것은 정참시가 하겠습니다/);}
  assert.match(brand,/normalizeAboutCopy/);assert.match(admin,/normalizeAboutCopy/);
});

test('cache revisions are bumped through shell to home/features modules',()=>{
  const index=read('index.html'); const app=read('src/app.js');
  assert.match(index,/jcs-clean-rebuild-r1/);
  assert.match(app,/home\.js\?v=[^\"]*jcs-clean-rebuild-r1/);
  assert.match(app,/features\.js\?v=[^\"]*jcs-clean-rebuild-r1/);
});
