import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const features = fs.readFileSync(new URL('../src/views/features.js', import.meta.url),'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url),'utf8');
const app = fs.readFileSync(new URL('../src/app.js', import.meta.url),'utf8');

test('comparison UI labels the centered relative axis as 50 25 0 25 50 without +/- signs',()=>{
  for(const label of ['50','25','0','25','50']) assert.ok(features.includes(`>${label}<`),`missing ${label}`);
  assert.ok(!features.includes('>-50<'),'left edge should not show a minus sign');
  assert.ok(!features.includes('>-25<'),'left quarter should not show a minus sign');
  assert.ok(!features.includes('>+25<'),'right quarter should not show a plus sign');
  assert.ok(!features.includes('>+50<'),'right edge should not show a plus sign');
  assert.match(features,/Math\.abs\(axis\)/,'marker should display the absolute magnitude while position preserves direction');
  assert.match(features,/50 ← 0 → 50/,'section copy should explain the absolute centered axis');
});

test('03685 cache markers identify the comparison absolute-label correction',()=>{
  assert.match(index,/03686-data-intensity-axis/);
  assert.match(app,/features\.js\?v=03686/);
});
