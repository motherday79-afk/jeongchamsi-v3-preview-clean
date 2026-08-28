import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { relativeCompareAxisValue } from '../src/views/compare-intelligence.js';

test('comparison axis normalizes A-left and B-right into -50..+50 without changing raw scores',()=>{
  assert.equal(relativeCompareAxisValue(100,0),-50);
  assert.equal(relativeCompareAxisValue(80,20),-30);
  assert.equal(relativeCompareAxisValue(50,50),0);
  assert.equal(relativeCompareAxisValue(20,80),30);
  assert.equal(relativeCompareAxisValue(0,100),50);
  assert.equal(relativeCompareAxisValue(null,80),null);
});

test('compare UI uses one centered relative axis while showing absolute left/right magnitudes',()=>{
  const features=fs.readFileSync('src/views/features.js','utf8');
  assert.match(features,/compare-relative-axis-track/);
  assert.match(features,/compare-relative-axis-scale/);
  for(const label of ['50','25','0']) assert.ok(features.includes(`>${label}<`),`missing ${label}`);
  for(const signed of ['-50','-25','+25','+50']) assert.ok(!features.includes(`>${signed}<`),`unexpected signed label ${signed}`);
  assert.match(features,/relativeCompareAxisValue/);
  assert.doesNotMatch(features,/현재 관측 신호 · 0–100 상대지표/);
  const app=fs.readFileSync('src/app.js','utf8');
  const index=fs.readFileSync('index.html','utf8');
  assert.match(app,/features\.js\?v=03686/);
  assert.match(index,/03686-data-intensity-axis/);
});
