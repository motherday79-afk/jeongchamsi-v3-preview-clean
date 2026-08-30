import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const repo = fs.readFileSync(new URL('../src/core/repository.js', import.meta.url), 'utf8');
const brand = fs.readFileSync(new URL('../src/views/brand.js', import.meta.url), 'utf8');
const admin = fs.readFileSync(new URL('../src/views/admin.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('repository parses as an ES module so brand defaults cannot blank the app', () => {
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test('final why-jeongchamsi copy is present in both storage defaults and brand fallback', () => {
  for (const text of [repo, brand, admin]) {
    assert.match(text, /작품을 쉬는 기간에는 발성과 호흡/);
    assert.match(text, /현장에서 더 나은 방법이 필요할 때/);
    assert.match(text, /막대한 양의 데이터를 빠짐없이 수집하고/);
    assert.match(text, /JCS만의 독자적인 시스템을 통해 분석하고/);
    assert.match(text, /가장 정확한 길을 찾는 것은 정참시가 하겠습니다/);
  }
});

test('index bumps the app module URL after the white-screen repair', () => {
  assert.match(index, /white-screen-fix/);
});
