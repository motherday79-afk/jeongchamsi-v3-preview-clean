import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync(new URL('../src/views/home.js', import.meta.url), 'utf8');
const cssFiles = [
  '../css/app.css',
  '../css/mobile-foundation.css',
  '../css/product-system.css',
  '../css/pages.css',
  '../css/spectrum-palette.css',
].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');

test('home community renders only five list rows with no large highlight cards', () => {
  assert.doesNotMatch(home, /community-highlight/);
  assert.doesNotMatch(home, /이미지 없이 읽기 좋은 리스트형 정뮤니티/);
  assert.doesNotMatch(home, /communityHot\s*\(/);
  assert.doesNotMatch(home, /const\s+hot\s*=/);
  assert.match(home, /const\s+general\s*=\s*community\.slice\(0,\s*5\)/);
  assert.match(home, /<div class="community-list">\$\{general\.map\(\(item, index\) => communityRow/);
});

test('dead highlight-card CSS is removed from effective stylesheets', () => {
  assert.doesNotMatch(cssFiles, /community-highlight/);
});
