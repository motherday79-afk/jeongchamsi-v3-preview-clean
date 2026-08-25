import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const home=fs.readFileSync(path.join(root,'src/views/home.js'),'utf8');
const appCss=fs.readFileSync(path.join(root,'css/app.css'),'utf8');
const productCss=fs.readFileSync(path.join(root,'css/product-system.css'),'utf8');
const spectrumCss=fs.readFileSync(path.join(root,'css/spectrum-palette.css'),'utf8');

test('home removes requested explanatory copy while keeping core section titles',()=>{
  for(const text of [
    '작은 관심이 세상을 바꿉니다',
    '메인에서는 최대 3개만 표시 · 전체 선택지는 설문페이지에서 투표',
    '실제 선거 결과가 아닌 정참시 참여자 기반 모의투표 영역입니다',
    '실제 정치인을 상시 노출하지 않고, 가상후보 예시로 결과 형태를 먼저 보여줍니다',
    '상위 10명을 두 줄로 간결하게 확인하세요'
  ]) assert.equal(home.includes(text),false,`still renders: ${text}`);
  assert.ok(home.includes('CITIZENS’ CHOICE'));
  assert.ok(home.includes('GENERATION CHOICE · MOCK VOTE'));
  assert.ok(home.includes('NOW RANK'));
});

test('home comparison summary uses 22-item AI intelligent data movement copy',()=>{
  assert.ok(home.includes('<b>비교 결과 예시</b><span>정참시의 AI 인텔리전트 데이터 무브먼트로 22개의 항목을 비교분석 합니다</span>'));
  assert.equal(home.includes('활동도는 A가 강하고, 관심도·참여도는 세부 지표에서 서로 다른 흐름을 보이는 식으로 분석됩니다'),false);
});

test('academy description is not rendered on the home module',()=>{
  assert.equal(home.includes('class="module-desc">${esc(academyConfig.description)}'),false);
  assert.equal(home.includes('<p>${esc(academyConfig.description)}</p>'),false);
  assert.equal(home.includes('정치를 꿈꾸는 사람이 실제 수강 가능한 일정을 확인하고 신청하는 곳'),false);
});

test('CSS rules dedicated only to removed home paragraphs are removed',()=>{
  const css=appCss+'\n'+productCss+'\n'+spectrumCss;
  assert.equal(css.includes('.poll-question p'),false);
  assert.equal(css.includes('.generation-intro p'),false);
  assert.equal(css.includes('.academy-intro p'),false);
});
