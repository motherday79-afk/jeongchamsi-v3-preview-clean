import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as compare from '../src/views/compare-intelligence.js';

const people=fs.readFileSync('src/views/people.js','utf8');
const features=fs.readFileSync('src/views/features.js','utf8');
const css=fs.readFileSync('css/pages.css','utf8');
const app=fs.readFileSync('src/app.js','utf8');
const index=fs.readFileSync('index.html','utf8');

test('shared axis intensity maps distance from center from green to red',()=>{
  assert.equal(typeof compare.axisIntensityBand,'function','shared intensity helper should exist');
  assert.equal(compare.axisIntensityBand(0),'green');
  assert.equal(compare.axisIntensityBand(10),'green');
  assert.equal(compare.axisIntensityBand(11),'yellow');
  assert.equal(compare.axisIntensityBand(20),'yellow');
  assert.equal(compare.axisIntensityBand(21),'amber');
  assert.equal(compare.axisIntensityBand(30),'amber');
  assert.equal(compare.axisIntensityBand(31),'orange');
  assert.equal(compare.axisIntensityBand(40),'orange');
  assert.equal(compare.axisIntensityBand(41),'red');
  assert.equal(compare.axisIntensityBand(50),'red');
  assert.equal(compare.axisIntensityBand(-47),'red','direction must not affect intensity color');
});

test('detail and compare axes use data intensity classes instead of fixed metric tones',()=>{
  assert.match(people,/axisIntensityBand/);
  assert.match(people,/intensity-\$\{point\.intensity\}/);
  assert.match(people,/intensity-\$\{audienceIntensity\}/);
  assert.match(features,/axisIntensityBand/);
  assert.match(features,/intensity-\$\{axisIntensity\}/);
  assert.doesNotMatch(people,/person-analysis-axis-metric \$\{tone\}/);
});

test('axis tracks stay neutral while marker and number own the intensity color',()=>{
  for(const band of ['green','yellow','amber','orange','red']){
    assert.match(css,new RegExp(`\\.intensity-${band}`));
  }
  assert.match(css,/--axis-intensity-color/);
  assert.match(css,/background:var\(--axis-intensity-color\)/);
  assert.doesNotMatch(css,/\.compare-relative-axis-track\{[^}]*linear-gradient\(90deg,#dceee8/);
});


test('03686 cache markers publish the shared intensity axis build',()=>{
  assert.match(index,/03686-data-intensity-axis/);
  assert.match(app,/people\.js\?v=03686/);
  assert.match(app,/features\.js\?v=03686/);
});
