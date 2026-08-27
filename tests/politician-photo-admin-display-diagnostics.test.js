import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const admin = fs.readFileSync("src/views/admin.js", "utf8");
const route = fs.readFileSync("server/v3/routes/politician-photo.js", "utf8");

test("photo route exposes assembly display coverage diagnostics", () => {
  assert.match(route, /action === "coverage-status"/);
  assert.match(route, /resolvePoliticianPhotoSource/);
  assert.match(route, /fallback/);
  assert.match(route, /missing/);
});

test("admin shows assembly asset fallback and missing counts with names", () => {
  assert.match(admin, /fetchPoliticianPhotoCoverageStatus/);
  assert.match(admin, /외부 fallback/);
  assert.match(admin, /사진 미노출/);
  assert.match(admin, /fallbackNames/);
});
