'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function hasAll(source,tokens){for(const token of tokens)assert.ok(source.includes(token),`missing ${token}`);}

test('admin compare includes a comparative decision brief from decision api data',()=>{
  const source=read('src/views/features.js');
  hasAll(source,['COMPARATIVE DECISION BRIEF','비교 의사결정 브리프','현재 위치','주요 원인','가장 큰 우위','가장 큰 위험','최우선 대응']);
  assert.match(source,/getAdminDecisionPeople/);
  assert.match(source,/decision-repository\.js/);
  assert.match(source,/adminCompareDecisionBrief/);
});

test('comparative decision brief is placed above deep comparison blocks and position map is unchanged',()=>{
  const source=read('src/views/features.js');
  const brief=source.indexOf('${adminCompareDecisionBrief(people,decisionEntries)}');
  const battlefield=source.indexOf('${adminCompareBattlefield(people,entries)}');
  assert.ok(brief>=0,'brief render missing');
  assert.ok(battlefield>=0&&brief<battlefield,'brief must appear before deeper compare blocks');
  hasAll(source,['admin-compare-position-map','강한 우위','확산 기회','반등 가능','위험 구간','const expansion=Number(latest.massExpansion)']);
});
