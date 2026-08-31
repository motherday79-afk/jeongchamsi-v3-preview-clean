'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function hasAll(source,tokens){for(const token of tokens)assert.ok(source.includes(token),`missing ${token}`);}

test('admin person detail renders a decision war room before the deep intelligence report',()=>{
  const people=read('src/views/people.js');
  hasAll(people,[
    'JCS POLITICAL WAR ROOM','정치 의사결정 브리프','주요 원인','핵심 위험','핵심 기회','우선 대응',
    '행동 기록','대응 이후 변화','CASE HISTORY','축적 패턴',
    'data-decision-case-create','data-decision-case-close','data-decision-action-form','data-decision-action-note-form'
  ]);
  assert.match(people,/export async function refreshAdminDecisionSlot\b/);
  assert.match(people,/decision-repository\.js/);
});

test('manager-facing evidence labels are qualitative and no confidence percentage is displayed',()=>{
  const people=read('src/views/people.js');
  hasAll(people,['분석 근거 강함','분석 근거 충분','근거 보강 중','유효 신호','보강 중','판독 대기']);
  assert.doesNotMatch(people,/분석 신뢰도[^\n]{0,180}%/);
  assert.doesNotMatch(people,/신뢰도\s*\$\{[^\n]{0,120}%/);
  assert.doesNotMatch(people,/CONF\s*\$\{[^\n]{0,120}%/);
});

test('history detail reader exists and war room has readability floors',()=>{
  const repo=read('src/core/history-repository.js');
  const css=read('css/pages.css');
  assert.match(repo,/export async function getAdminHistoryPersonDetail\b/);
  hasAll(css,['.admin-decision-war-room','.admin-decision-war-room .decision-kicker','.admin-decision-war-room .decision-key-metric']);
  assert.match(css,/\.admin-decision-war-room\s*\{[^}]*font-size:\s*14px/s);
  assert.match(css,/\.admin-decision-war-room \.decision-kicker\s*\{[^}]*font-size:\s*12px/s);
  assert.match(css,/\.admin-decision-war-room \.decision-key-metric\s*\{[^}]*font-size:\s*22px/s);
});
