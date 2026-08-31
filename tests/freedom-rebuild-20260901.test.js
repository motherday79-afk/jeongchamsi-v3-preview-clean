'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('public person detail is a premium visual briefing and aggressively fills every analysis signal',()=>{
  const people=read('src/views/people.js');
  for(const token of ['PUBLIC POLITICAL PROFILE','POLITICAL PULSE','INTELLIGENCE PROFILE','ACTIVITY RADAR','MEDIA RADAR','SIGNAL FLOW']) assert.ok(people.includes(token),`missing ${token}`);
  assert.match(people,/function aggressivePublicAnalysis\b/);
  assert.match(people,/function aggressiveScore\b/);
  assert.doesNotMatch(people,/분석 대기|게시 데이터 대기|판독 데이터 부족/);
  assert.match(people,/JCS 다중신호 보정/);
});

test('admin person detail is one always-open confidential command center, not a collapsed intelligence gate',()=>{
  const people=read('src/views/people.js');
  for(const token of ['JCS POLITICAL WAR ROOM','CONFIDENTIAL ADVISORY INTELLIGENCE','JCS COMMAND CENTER','CAUSE TRACE','RISK & OPPORTUNITY','ACTION MANAGEMENT','RESULT TRACKING']) assert.ok(people.includes(token),`missing ${token}`);
  assert.match(people,/function adminUnifiedCommandCenter\b/);
  assert.doesNotMatch(people,/<details class="admin-intelligence-report-shell/);
  assert.doesNotMatch(people,/<details class="content-card admin-intelligence-report-shell/);
});

test('compare pages use a visual comparison system and admin deep data is permanently expanded',()=>{
  const features=read('src/views/features.js');
  for(const token of ['COMPARE SCOREBOARD','SIGNAL PROFILE','MOMENTUM TRACK','DECISION ROOM']) assert.ok(features.includes(token),`missing ${token}`);
  assert.doesNotMatch(features,/<details class="content-card admin-compare-deep-data/);
  assert.match(features,/<section class="content-card admin-compare-deep-data is-open"/);
});

test('freedom rebuild cache revision reaches index and dynamic people/features imports',()=>{
  const index=read('index.html'),app=read('src/app.js');
  assert.match(index,/freedom-detail-v2/);
  assert.match(app,/people\.js\?v=[^"']*freedom-detail-v2/);
  assert.match(app,/features\.js\?v=[^"']*freedom-detail-v2/);
});

test('new public/admin/compare surfaces have dedicated visual hierarchy instead of inherited generic cards',()=>{
  const css=read('css/pages.css');
  for(const selector of ['.public-political-brief','.public-profile-layout','.person-visual-radar','.admin-command-center','.decision-section-band','.compare-scoreboard-grid']) assert.ok(css.includes(selector),`missing CSS ${selector}`);
  assert.match(css,/FREEDOM DETAIL V2/);
});

test('detail and compare analysis synthesize a visible estimated trend instead of analysis-wait placeholders',()=>{
  const people=read('src/views/people.js'),features=read('src/views/features.js');
  assert.match(people,/function aggressiveTrendSeries\b/);
  assert.match(features,/function compareEstimatedTrend\b/);
  assert.doesNotMatch(features,/분석 데이터 대기|관측 대기/);
  assert.doesNotMatch(people,/판독 대기/);
});

test('admin multi-compare aggressively fills sparse history and political-intelligence values',()=>{
  const features=read('src/views/features.js');
  assert.match(features,/function aggressiveAdminCompareEntry\b/);
  assert.doesNotMatch(features,/판독 중|근거 보강 중/);
  assert.match(features,/entries=people\.map\(\(p,index\)=>aggressiveAdminCompareEntry/);
});

test('admin decision compare stays person-specific even if the decision endpoint returns a sparse payload',()=>{
  const features=read('src/views/features.js');
  assert.match(features,/function aggressiveAdminDecisionPayload\b/);
  assert.match(features,/decisionEntries=people\.map\(\(p,index\)=>aggressiveAdminDecisionPayload/);
});
