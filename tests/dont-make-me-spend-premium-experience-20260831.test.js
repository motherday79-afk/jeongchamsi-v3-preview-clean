'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function hasAll(source,tokens){for(const token of tokens)assert.ok(source.includes(token),`missing ${token}`);}

test('admin compare becomes a decision room with verdict, battlefield, advantage lanes and person-specific decision notes',()=>{
  const source=read('src/views/features.js');
  const css=read('css/pages.css');
  hasAll(source,[
    'admin-compare-decision-room',
    'JCS EXECUTIVE VERDICT',
    'admin-compare-battlefield',
    'BATTLEFIELD SNAPSHOT',
    'admin-compare-advantage-lanes',
    'ADVANTAGE LANES',
    'admin-compare-decision-map',
    'DECISION MAP',
    'admin-compare-person-verdicts',
    'WHY IT MATTERS',
    'WHAT TO WATCH'
  ]);
  hasAll(css,[
    '.admin-compare-decision-room',
    '.admin-compare-battlefield',
    '.admin-compare-advantage-lanes',
    '.admin-compare-decision-map',
    '.admin-compare-person-verdicts'
  ]);
});

test('politician admin intelligence reads like a paid advisory report with verdict-to-action bridges',()=>{
  const source=read('src/views/people.js');
  const css=read('css/pages.css');
  hasAll(source,[
    'admin-pi-verdict-board',
    'JCS EXECUTIVE VERDICT',
    'admin-pi-section-brief',
    'WHAT THIS MEANS',
    'JCS ACTION',
    'admin-pi-report-chapter',
    'admin-pi-priority-action-plan',
    'JCS PRIORITY ACTION PLAN',
    '현재 분석 기준 우선순위'
  ]);
  hasAll(css,[
    '.admin-pi-verdict-board',
    '.admin-pi-section-brief',
    '.admin-pi-report-chapter',
    '.admin-pi-priority-action-plan'
  ]);
});

test('strategic consulting close is personalized to the current politician instead of ending as a generic service menu',()=>{
  const source=read('src/views/people.js');
  assert.match(source,/function adminPiStrategicSolution\(solution=\{\},p=\{\}\)/);
  assert.match(source,/\$\{esc\(p\.name\|\|'이 정치인'\)\}/);
  assert.match(source,/REQUEST JCS STRATEGY SESSION/);
  assert.match(source,/adminPiStrategicSolution\(pi\.strategicSolution\|\|\{\},p\)/);
});
