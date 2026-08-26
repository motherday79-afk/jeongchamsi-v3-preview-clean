import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const people = fs.readFileSync("src/views/people.js","utf8");
const app = fs.readFileSync("src/app.js","utf8");
const image = fs.readFileSync("src/core/image.js","utf8");
const admin = fs.readFileSync("src/views/admin.js","utf8");
const css = fs.readFileSync("css/pages.css","utf8");

test("admin-only politician detail photo editor is rendered from the live detail page", () => {
  assert.match(people, /session\.authenticated&&session\.user\?\.role==="admin"/);
  assert.match(people, /data-detail-politician-photo-form/);
  assert.match(people, /data-detail-politician-photo-trigger/);
  assert.match(people, /사진 등록·교체/);
});

test("detail photo selection immediately reuses the existing optimized politician asset pipeline", () => {
  assert.match(app, /form\?\.matches\("\[data-detail-politician-photo-form\]"\)/);
  assert.match(app, /savePoliticianPhotoForm\(form\)/);
  assert.match(app, /자동 최적화 · 정참시 자산 저장 중/);
  assert.match(image, /mini: Object\.freeze\(\{ maxWidth: 96, maxHeight: 128, targetBytes: 12 \* 1024/);
  assert.match(image, /card: Object\.freeze\(\{ maxWidth: 192, maxHeight: 256, targetBytes: 24 \* 1024/);
  assert.match(image, /profile: Object\.freeze\(\{ maxWidth: 480, maxHeight: 640, targetBytes: 64 \* 1024/);
});

test("manual detail uploads remain classified as Jeongchamsi assets in admin", () => {
  assert.match(admin, /sourceType:"manual"/);
  assert.match(admin, /수기등록 · 정참시 자산/);
  assert.match(css, /\.person-detail-photo\.admin-photo-editable/);
  assert.doesNotMatch(css, /detail-page admin politician photo hot upload[\s\S]*detail-page admin politician photo hot upload/);
});
