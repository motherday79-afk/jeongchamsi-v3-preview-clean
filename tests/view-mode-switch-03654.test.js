const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/pages.css','utf8');

test('touch UI restores a persistent PC/mobile view-mode switch',()=>{
  assert.doesNotMatch(html,/localStorage\.removeItem\("jcv3:view-mode"\)/);
  assert.match(html,/jcv3:view-mode/);
  assert.match(html,/width=1280/);
  assert.match(html,/width=device-width/);
  assert.match(html,/id="jcv3-view-mode-toggle"/);
  assert.match(html,/PC버전 보기/);
  assert.match(html,/모바일버전 보기/);
  assert.match(css,/\.jcv3-view-mode-switch/);
});
