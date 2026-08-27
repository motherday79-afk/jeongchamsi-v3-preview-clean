import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const admin = fs.readFileSync("src/views/admin.js", "utf8");
const route = fs.readFileSync("server/v3/routes/politician-photo.js", "utf8");

test("photo route exposes display coverage diagnostics for all politician categories", () => {
  assert.match(route, /action === "coverage-status"/);
  assert.match(route, /\["assembly","metropolitan","basic"\]/);
  assert.match(route, /resolvePoliticianPhotoSource/);
  assert.match(route, /assetRows/);
  assert.match(route, /fallback/);
  assert.match(route, /missing/);
});

test("admin shows lazy category diagnostics with collapsible asset fallback and missing lists", () => {
  assert.match(admin, /loadPoliticianPhotoCoverageDiagnostic/);
  assert.match(admin, /data-politician-photo-coverage-load/);
  assert.match(admin, /POLITICIAN_PHOTO_COVERAGE_CACHE_TTL/);
  assert.match(admin, /국회의원 사진 노출 진단/);
  assert.match(admin, /광역단체장 사진 노출 진단/);
  assert.match(admin, /기초단체장 사진 노출 진단/);
  assert.match(admin, /politician-photo-coverage-list/);
  assert.match(admin, /외부 fallback/);
  assert.match(admin, /사진 미노출/);
});
