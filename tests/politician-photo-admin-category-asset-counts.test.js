import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const admin = fs.readFileSync("src/views/admin.js", "utf8");

test("people admin computes photo asset counts by politician category", () => {
  assert.match(admin, /assetCounts\s*=\s*\{\s*assembly:\s*0,\s*metropolitan:\s*0,\s*basic:\s*0\s*\}/);
  assert.match(admin, /const personById\s*=\s*new Map\(people\.map/);
  assert.match(admin, /assetCounts\[type\]\s*\+=\s*1/);
});

test("people admin displays split Jeongchamsi photo asset counts", () => {
  assert.match(admin, /국회의원<\/b><strong>\$\{assetCounts\.assembly\} \/ \$\{assetTargets\.assembly\}/);
  assert.match(admin, /광역단체장<\/b><strong>\$\{assetCounts\.metropolitan\} \/ \$\{assetTargets\.metropolitan\}/);
  assert.match(admin, /기초단체장<\/b><strong>\$\{assetCounts\.basic\} \/ \$\{assetTargets\.basic\}/);
  assert.match(admin, /국회의원 \$\{assetCounts\.assembly\} · 광역단체장 \$\{assetCounts\.metropolitan\} · 기초단체장 \$\{assetCounts\.basic\}/);
});
