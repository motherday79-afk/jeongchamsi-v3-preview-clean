import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const people = fs.readFileSync("src/views/people.js","utf8");
const app = fs.readFileSync("src/app.js","utf8");
const image = fs.readFileSync("src/core/image.js","utf8");
const admin = fs.readFileSync("src/views/admin.js","utf8");
const css = fs.readFileSync("css/pages.css","utf8");
const meta = fs.readFileSync("src/data/person-meta.js","utf8");

test("admin-only politician detail photo editor is rendered from the live detail page", () => {
  assert.match(people, /session\.authenticated&&session\.user\?\.role==="admin"/);
  assert.match(people, /data-detail-politician-photo-form/);
  assert.match(people, /data-detail-politician-photo-trigger/);
  assert.match(people, /data-politician-photo-preview/);
  assert.match(people, /data-politician-photo-save/);
  assert.match(people, /사진 선택/);
  assert.match(people, />저장</);
});

test("detail photo selection previews first and explicit submit reuses the optimized politician asset pipeline", () => {
  assert.match(app, /preparePoliticianPhotoPreview/);
  assert.match(app, /data-politician-photo-save/);
  assert.match(app, /form\.matches\("\[data-politician-photo-form\]"\)/);
  assert.match(app, /savePoliticianPhotoForm\(form\)/);
  assert.doesNotMatch(app, /자동 최적화 · 정참시 자산 저장 중/);
  assert.match(image, /mini: Object\.freeze\(\{ maxWidth: 96, maxHeight: 128, targetBytes: 12 \* 1024/);
  assert.match(image, /card: Object\.freeze\(\{ maxWidth: 192, maxHeight: 256, targetBytes: 24 \* 1024/);
  assert.match(image, /profile: Object\.freeze\(\{ maxWidth: 480, maxHeight: 640, targetBytes: 64 \* 1024/);
});

test("manual detail uploads remain classified inside the JCS asset pool", () => {
  assert.match(admin, /sourceType:"manual"/);
  assert.match(meta, /PHOTO_PROVIDER_STATUS = "JCS_ASSET"/);
  assert.match(admin, /정참시 사진 자산/);
  assert.match(css, /\.person-detail-photo\.admin-photo-editable/);
  assert.doesNotMatch(css, /detail-page admin politician photo hot upload[\s\S]*detail-page admin politician photo hot upload/);
});
