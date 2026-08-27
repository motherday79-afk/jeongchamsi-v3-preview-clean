const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

const schema = read('lib/v3/schema.js');
const repo = read('src/core/repository.js');
const image = read('src/core/image.js');
const admin = read('src/views/admin.js');
const app = read('src/app.js');
const route = read('server/v3/routes/politician-photo.js');
const uploadRoute = read('server/v3/routes/upload.js');
const css = read('css/pages.css');

test('politicianPhotos is a server-sanitized domain keyed by real politician ids', () => {
  assert.match(schema, /"politicianPhotos"/);
  assert.match(schema, /domain === "politicianPhotos"/);
  assert.match(schema, /assembly-300/);
  assert.match(repo, /politicianPhotos:\s*\{\s*items:\s*\[\]\s*\}/);
});

test('politician photo upload generates three bandwidth-sized variants', () => {
  assert.match(image, /export async function uploadPoliticianPhotoSet/);
  assert.match(image, /mini:[\s\S]*?maxWidth:\s*96[\s\S]*?targetBytes:\s*12\s*\*\s*1024/);
  assert.match(image, /card:[\s\S]*?maxWidth:\s*192[\s\S]*?targetBytes:\s*24\s*\*\s*1024/);
  assert.match(image, /profile:[\s\S]*?maxWidth:\s*480[\s\S]*?targetBytes:\s*64\s*\*\s*1024/);
  assert.match(image, /5\s*\*\s*1024\s*\*\s*1024/);
  assert.match(image, /128\s*\*\s*1024/);
});

test('people admin is diagnostics-only while detail pages own photo registration', () => {
  assert.match(admin, /국회의원 사진 노출 진단/);
  assert.match(admin, /광역단체장 사진 노출 진단/);
  assert.match(admin, /기초단체장 사진 노출 진단/);
  assert.doesNotMatch(admin, /data-politician-photo-select/);
  assert.doesNotMatch(admin, /class=\"politician-photo-workspace\"/);
  assert.doesNotMatch(admin, /data-politician-photo-reset/);
});

test('app wires politician detail photo preview and save without the retired central reset flow', () => {
  assert.match(app, /data-politician-photo-input/);
  assert.match(app, /data-politician-photo-form/);
  assert.match(app, /savePoliticianPhotoForm/);
  assert.doesNotMatch(app, /data-politician-photo-reset/);
  assert.doesNotMatch(app, /resetPoliticianPhoto/);
});

test('public politician photo route prefers admin upload before Wikimedia fallback', () => {
  assert.match(route, /politicianPhotos/);
  assert.match(route, /ADMIN_UPLOAD/);
  assert.match(route, /manualPhoto/);
  const handlerAt = route.indexOf('module.exports = async function politicianPhotoRoute');
  const manualAt = route.indexOf('const manual=await manualPhoto', handlerAt);
  const commonsAt = route.indexOf('const photo=await fetchPoliticianPhoto', handlerAt);
  assert.ok(handlerAt >= 0 && manualAt >= 0 && commonsAt >= 0 && manualAt < commonsAt, 'manual override must be checked before Commons fetch');
  assert.match(route, /statusCode\s*=\s*307/);
  assert.match(route, /setHeader\("Location",manual\.url\)/);
});


test('partial politician variant uploads roll back successful Blob files', () => {
  assert.match(image, /Promise\.allSettled/);
  assert.match(image, /deletePoliticianPhotoBlobs\(uploadedUrls\)/);
});

test('politician photo replacements clean old Blob variants instead of accumulating storage', () => {
  assert.match(image, /export async function deletePoliticianPhotoBlobs/);
  assert.match(uploadRoute, /req\.method === "DELETE"/);
  assert.match(uploadRoute, /del\(/);
  assert.match(admin, /deletePoliticianPhotoBlobs/);
  assert.match(admin, /oldUrls/);
});

test('new admin photo CSS does not reintroduce important overrides', () => {
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /\.politician-photo-admin/);
  assert.match(css, /\.person-detail-photo\.admin-photo-editable/);
  assert.doesNotMatch(css, /\.politician-photo-guide\{/);
});
