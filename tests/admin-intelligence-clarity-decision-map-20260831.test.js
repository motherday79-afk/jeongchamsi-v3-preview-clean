'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

function hasAll(source,tokens){for(const token of tokens)assert.ok(source.includes(token),`missing ${token}`);}

test('manager-facing intelligence copy is concise, professional, and explicit',()=>{
  const people=read('src/views/people.js');
  const compare=read('src/views/features.js');
  hasAll(people,[
    '검색·뉴스·정참시 HISTORY와 공개 데이터를 종합해 현재 정치 흐름, 위험 요인, 기회 요인, 대응 방향을 분석합니다.',
    '정치 흐름 지수',
    '핵심 위험',
    '핵심 기회',
    '분석 근거',
    '우선 대응 방향'
  ]);
  hasAll(compare,[
    '핵심 격차 지표',
    '비교 대상별 우위 영역',
    '정치 포지션 맵',
    '정치 흐름 지수',
    '대중 확산력'
  ]);
  assert.ok(!people.includes('관리자가 바로 이해할 수 있게 정리한 리포트입니다.'));
  assert.ok(!compare.includes('복잡한 숫자를 모두 읽지 않아도'));
});

test('decision map has explicit quadrants, resilient markers, and a separate readout',()=>{
  const source=read('src/views/features.js');
  const css=read('css/pages.css');
  hasAll(source,[
    'admin-compare-position-map',
    '강한 우위',
    '확산 기회',
    '반등 가능',
    '위험 구간',
    'admin-compare-map-point',
    'admin-compare-map-people',
    'admin-compare-map-summary',
    '정치 흐름',
    '대중 확산력'
  ]);
  hasAll(css,[
    '.admin-compare-position-map',
    '.admin-compare-map-zone',
    '.admin-compare-map-point',
    '.admin-compare-map-people',
    '.admin-compare-map-summary'
  ]);
});

test('decision map horizontal position is mass expansion, not an attention average',()=>{
  const source=read('src/views/features.js');
  assert.match(source,/const expansion=Number\(latest\.massExpansion\)/);
  assert.ok(!source.includes('(attention+expansion)/2'));
});
