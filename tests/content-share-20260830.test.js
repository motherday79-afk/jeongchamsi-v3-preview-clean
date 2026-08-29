const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('column news and community details render one shared content-share component',()=>{
  const boards=read('src/views/boards.js');
  assert.match(boards,/content-share\.js\?v=jcs-share-v1/);
  assert.match(boards,/renderContentShare\(\{\s*title:item\.title,\s*path:`\/\$\{config\.route\}\/\$\{id\}`/s);
});

test("IT'S ME detail uses the same shared content-share component",()=>{
  const features=read('src/views/features.js');
  assert.match(features,/content-share\.js\?v=jcs-share-v1/);
  assert.match(features,/renderContentShare\(\{\s*title:item\.title,\s*path:`\/itsme\/\$\{id\}`/s);
});

test('share surface exposes KakaoTalk Facebook Instagram and URL copy without external SDKs',()=>{
  const view=read('src/views/content-share.js');
  assert.match(view,/카카오톡/);
  assert.match(view,/Facebook/);
  assert.match(view,/Instagram/);
  assert.match(view,/URL 복사/);
  assert.match(view,/data-content-share="kakao"/);
  assert.match(view,/data-content-share="facebook"/);
  assert.match(view,/data-content-share="instagram"/);
  assert.match(view,/data-content-share="copy"/);
  assert.doesNotMatch(view,/sdk\.js|developers\.kakao|connect\.facebook|instagram\.com\/create/i);
});

test('share behavior is lazy loaded and uses native share, Facebook sharer, and clipboard fallback',()=>{
  const app=read('src/app.js');
  const core=read('src/core/content-share.js');
  assert.match(app,/data-content-share/);
  assert.match(app,/import\("\.\/core\/content-share\.js\?v=jcs-share-v1"\)/);
  assert.match(core,/navigator\.share/);
  assert.match(core,/facebook\.com\/sharer\/sharer\.php/);
  assert.match(core,/navigator\.clipboard\.writeText/);
  assert.match(core,/document\.execCommand\("copy"\)/);
  assert.match(core,/platform === "kakao"/);
  assert.match(core,/platform === "instagram"/);
});

test('Facebook popup detection is not defeated by the noopener window feature',()=>{
  const core=read('src/core/content-share.js');
  assert.match(core,/window\.open\(target, "_blank", "width=720,height=640"\)/);
  assert.doesNotMatch(core,/window\.open\(target, "_blank", "[^"]*noopener/);
  assert.match(core,/popup\.opener = null/);
});

test('share controls are touch friendly and signal confidence wording stays history-first',()=>{
  const css=read('css/pages.css');
  const people=read('src/views/people.js');
  assert.match(css,/\.content-share-panel/);
  assert.match(css,/\.content-share-buttons/);
  assert.match(css,/min-height:40px/);
  assert.match(people,/SIGNAL CONFIDENCE LIMITED/);
  assert.match(people,/JCS HISTORY 정상 유지/);
  assert.doesNotMatch(people,/현재 분석 입력 축적 중/);
});

test('cache markers identify the share build',()=>{
  const index=read('index.html');
  const app=read('src/app.js');
  assert.match(index,/jcs-share-v1/);
  assert.match(app,/views\/boards\.js\?v=jcs-share-v1/);
  assert.match(app,/views\/features\.js\?v=03686-jcs-share-v1/);
});
