const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const people=fs.readFileSync('src/views/people.js','utf8');
const css=fs.readFileSync('css/pages.css','utf8');

const ordered=[
  'person-analysis-signal',
  'person-analysis-core',
  'person-analysis-landscape',
  'person-analysis-activity',
  'person-analysis-issue',
  'person-analysis-deep',
  'person-recent-news',
  'person-profile-divider'
];

test('politician detail reserves the full V3 analysis report hierarchy in order',()=>{
  let cursor=-1;
  for(const token of ordered){
    const next=people.indexOf(token,cursor+1);
    assert.ok(next>cursor,`${token} should appear after the previous analysis section`);
    cursor=next;
  }
});

test('deep analysis is progressively disclosed without extra javascript',()=>{
  assert.match(people,/<details class="person-analysis-deep/);
  assert.match(people,/<summary>/);
  assert.match(people,/정참시 심층분석/);
  assert.match(people,/뉴스→검색 전이/);
  assert.match(people,/미디어\/대중 괴리/);
  assert.match(people,/관심층 확장/);
});

test('public detail no longer exposes raw search-volume labels',()=>{
  assert.doesNotMatch(people,/PC 검색량/);
  assert.doesNotMatch(people,/모바일 검색량/);
  assert.doesNotMatch(people,/월간 검색 관심/);
});

test('analysis layout has dedicated mobile rules and lightweight visual primitives',()=>{
  assert.match(css,/\.person-analysis-signal/);
  assert.match(css,/\.person-analysis-core-grid/);
  assert.match(css,/\.person-analysis-score-ring/);
  assert.match(css,/@media\(max-width:560px\)[\s\S]*\.person-analysis-core-grid/);
});

test('signal header keeps one label and removes timestamp/meta AI copy',()=>{
  assert.doesNotMatch(people,/<span class="eyebrow">JEONGCHAMSI SIGNAL<\/span>/);
  assert.doesNotMatch(people,/게시 스냅샷 기준/);
  assert.match(people,/JEONGCHAMSI MULTI-INTELLIGENCE DATA ANALYSIS/);
});

test('analysis report raises small type for readable V3 detail presentation',()=>{
  assert.match(css,/\.person-analysis-metric>div:last-child b\{[^}]*font-size:13px/);
  assert.match(css,/\.person-analysis-metric>div:last-child small\{[^}]*font-size:11px/);
  assert.match(css,/\.person-analysis-bar b\{[^}]*font-size:12px/);
  assert.match(css,/\.person-analysis-bar small\{[^}]*font-size:11px/);
  assert.match(css,/\.person-live-news-list a span small\{[^}]*font-size:11px/);
  assert.match(css,/\.person-related-grid button>span:nth-child\(2\) small\{[^}]*font-size:11px/);
});
