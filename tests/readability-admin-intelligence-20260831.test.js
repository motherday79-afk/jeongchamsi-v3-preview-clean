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
  assert.ok(people.includes('정치 흐름 지수'));
  assert.ok(compare.includes('정치 흐름 지수'));
  assert.ok(people.includes('최근 관심·지지 기반·미디어·이슈를 종합한 JCS 상태지수이며 지지율과는 구분됩니다.'));
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
  for(const token of ['분석 근거','정치 회복력','핵심 기회','핵심 위험','핵심 결론','의미','우선 대응']) assert.ok(people.includes(token),`missing ${token}`);
  for(const token of ['핵심 격차 지표','비교 대상별 우위 영역','정치 포지션 맵','대중 확산력']) assert.ok(compare.includes(token),`missing ${token}`);
});
