'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('admin political condition is translated into a plain-language current political flow readout',()=>{
  const people=read('src/views/people.js');
  const compare=read('src/views/features.js');
  assert.match(people,/function adminPiConditionLabel/);
  assert.match(compare,/function adminCompareConditionLabel/);
  for(const token of ['매우 좋음','좋음','보통','주의','매우 나쁨']){
    assert.ok(people.includes(token),`missing people label ${token}`);
    assert.ok(compare.includes(token),`missing compare label ${token}`);
  }
  assert.ok(people.includes('현재 정치 흐름'));
  assert.ok(compare.includes('현재 정치 흐름'));
  assert.ok(people.includes('지지율이 아니라 최근 관심·지지 기반·미디어·이슈 신호를 종합한 JCS 상태지수'));
});

test('admin compare and intelligence ship a scoped readability override',()=>{
  const css=read('css/pages.css');
  assert.ok(css.includes('JCS READABILITY HOTFIX · admin compare + intelligence'));
  assert.ok(css.includes('.admin-compare-page .admin-compare-section-kicker p'));
  assert.ok(css.includes('font-size:14px;line-height:1.7'));
  assert.match(css,/\.admin-intelligence-report-shell \.admin-pi-verdict-main p[^}]*font-size:14px/);
  assert.match(css,/\.admin-intelligence-report-shell \.admin-pi-section-brief strong[^}]*font-size:14px/);
});

test('admin report language prioritizes Korean explanations for manager-facing concepts',()=>{
  const people=read('src/views/people.js');
  const compare=read('src/views/features.js');
  for(const token of ['분석 신뢰도','정치 회복력','가장 큰 기회','가장 큰 위험','이게 무슨 뜻인가','그래서 무엇을 볼 것인가']) assert.ok(people.includes(token),`missing ${token}`);
  for(const token of ['차이가 가장 크게 나는 네 영역','누가 어디에서 앞서고 밀리는가','대중 확산 × 현재 정치 흐름']) assert.ok(compare.includes(token),`missing ${token}`);
});
