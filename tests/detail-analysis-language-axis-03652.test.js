const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('public detail copy hides raw source mechanics behind professional indicator language',()=>{
  const people=read('src/views/people.js');
  for(const label of ['심층 관심','반응 확장력','심층 유지력','미디어 가속도','미디어→대중 전이','채널 다양성']){
    assert.ok(people.includes(label),`missing professional label: ${label}`);
  }
  for(const leak of ['PC 기반 정보탐색 성향','모바일 기반 대중 확산력','최근 6시간 뉴스 속도','24시간 활동 집중도','7일 관심 유지력','뉴스 노출과 검색 반응의 동조 신호']){
    assert.ok(!people.includes(leak),`raw mechanic leaked into public copy: ${leak}`);
  }
});

test('activity and media uses a centered -50 to +50 axis for all eight indicators',()=>{
  const people=read('src/views/people.js');
  const start=people.indexOf('ACTIVITY & MEDIA');
  const end=people.indexOf('ATTENTION FLOW',start);
  assert.ok(start>=0&&end>start);
  const section=people.slice(start,end);
  const axisCalls=(section.match(/analysisAxis\(/g)||[]).length;
  assert.equal(axisCalls,8,'ACTIVITY & MEDIA must render eight axis indicators');
  assert.match(people,/analysisAxisValue/);
  for(const label of ['-50','-25','0','+25','+50']) assert.ok(people.includes(`>${label}<`),`missing ${label}`);
});

test('deep analysis uses the same centered axis language',()=>{
  const people=read('src/views/people.js');
  const start=people.indexOf('DEEP ANALYSIS');
  const end=people.indexOf('ANALYSIS TREND',start);
  assert.ok(start>=0&&end>start);
  const section=people.slice(start,end);
  const axisCalls=(section.match(/analysisAxis\(/g)||[]).length;
  assert.equal(axisCalls,9,'DEEP ANALYSIS must render all nine deep indicators as axes');
});

test('detail analysis css defines stable axis marker and scale presentation',()=>{
  const css=read('css/pages.css');
  assert.match(css,/\.person-analysis-axis-metric/);
  assert.match(css,/\.person-analysis-axis-track/);
  assert.match(css,/\.person-analysis-axis-value/);
  assert.match(css,/\.person-analysis-axis-scale/);
  assert.match(css,/background:var\(--analysis-color/);
});
